-- 자료함(RAG). 문서마다 올린 자료에서 뽑은 텍스트와 조각을 저장한다.
-- 원본 파일 바이트는 저장하지 않는다(텍스트와 sha256만). 쓰기는 동기화 서버가 RPC로만 한다.
BEGIN;

CREATE TABLE public.document_sources (
  id                    uuid        NOT NULL DEFAULT gen_random_uuid(),
  document_name         text        NOT NULL,
  number                integer     NOT NULL,
  file_name             text        NOT NULL,
  format                text        NOT NULL,
  byte_size             integer     NOT NULL,
  char_count            integer     NOT NULL,
  truncated             boolean     NOT NULL DEFAULT false,
  sha256                text        NOT NULL,
  uploaded_by_actor_id  uuid        NOT NULL,
  uploaded_by_name      text        NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz,
  CONSTRAINT document_sources_pkey PRIMARY KEY (id),
  CONSTRAINT document_sources_document_name_fkey
    FOREIGN KEY (document_name) REFERENCES public.documents(name) ON DELETE RESTRICT,
  CONSTRAINT document_sources_uploaded_by_actor_id_fkey
    FOREIGN KEY (uploaded_by_actor_id) REFERENCES public.actors(id) ON DELETE RESTRICT,
  -- 지운 자료의 번호도 다시 쓰지 않아야 본문의 "[자료N]"이 다른 파일을 가리키지 않는다
  CONSTRAINT document_sources_document_number_key UNIQUE (document_name, number),
  CONSTRAINT document_sources_number_check CHECK (number > 0),
  CONSTRAINT document_sources_file_name_check CHECK (char_length(file_name) BETWEEN 1 AND 255),
  CONSTRAINT document_sources_format_check
    CHECK (format IN ('txt', 'md', 'pdf', 'docx', 'hwp', 'hwpx')),
  CONSTRAINT document_sources_byte_size_check CHECK (byte_size BETWEEN 1 AND 10485760),
  CONSTRAINT document_sources_char_count_check CHECK (char_count BETWEEN 1 AND 200000),
  CONSTRAINT document_sources_sha256_check CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT document_sources_uploaded_by_name_check
    CHECK (char_length(uploaded_by_name) BETWEEN 1 AND 200),
  CONSTRAINT document_sources_deleted_after_created_check
    CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

CREATE TABLE public.document_source_chunks (
  source_id  uuid    NOT NULL,
  ordinal    integer NOT NULL,
  text       text    NOT NULL,
  CONSTRAINT document_source_chunks_pkey PRIMARY KEY (source_id, ordinal),
  CONSTRAINT document_source_chunks_source_id_fkey
    FOREIGN KEY (source_id) REFERENCES public.document_sources(id) ON DELETE CASCADE,
  CONSTRAINT document_source_chunks_ordinal_check CHECK (ordinal > 0),
  CONSTRAINT document_source_chunks_text_check CHECK (char_length(text) BETWEEN 1 AND 1000)
);

ALTER TABLE public.document_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_source_chunks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.document_sources FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.document_source_chunks FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.document_sources TO service_role;
GRANT SELECT ON TABLE public.document_source_chunks TO service_role;

-- 감사 로그에 자료 업로드·삭제를 남긴다
ALTER TABLE public.audit_events
  DROP CONSTRAINT audit_events_event_type_check,
  ADD CONSTRAINT audit_events_event_type_check CHECK (
    event_type IN (
      'ai_job_requested',
      'ai_job_started',
      'ai_output_completed',
      'ai_job_failed',
      'suggestion_accepted',
      'suggestion_rejected',
      'source_uploaded',
      'source_deleted'
    )
  );

-- 20261002165818과 같은 본문에서 허용 event_type 목록만 늘렸다.
CREATE OR REPLACE FUNCTION public.append_audit_event(
  p_document_name text,
  p_event_key text,
  p_event_type text,
  p_actor_id uuid,
  p_actor_name_snapshot text,
  p_job_id uuid DEFAULT NULL,
  p_causation_event_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_head public.document_audit_heads%ROWTYPE;
  v_existing public.audit_events%ROWTYPE;
  v_event public.audit_events%ROWTYPE;
  v_event_id uuid;
  v_sequence bigint;
  v_previous_hash text;
  v_occurred_at timestamptz;
  v_canonical jsonb;
  v_event_hash text;
BEGIN
  IF octet_length(p_event_key) NOT BETWEEN 1 AND 256 THEN
    RAISE EXCEPTION 'invalid_audit_event_key' USING ERRCODE = '22023';
  END IF;
  IF p_event_type NOT IN (
    'ai_job_requested',
    'ai_job_started',
    'ai_output_completed',
    'ai_job_failed',
    'suggestion_accepted',
    'suggestion_rejected',
    'source_uploaded',
    'source_deleted'
  ) THEN
    RAISE EXCEPTION 'invalid_audit_event_type' USING ERRCODE = '22023';
  END IF;
  IF char_length(p_actor_name_snapshot) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'invalid_actor_name_snapshot' USING ERRCODE = '22023';
  END IF;
  IF p_metadata IS NULL OR jsonb_typeof(p_metadata) <> 'object' THEN
    RAISE EXCEPTION 'audit_metadata_must_be_object' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.documents WHERE name = p_document_name;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'audit_document_not_found' USING ERRCODE = '23503';
  END IF;

  PERFORM 1 FROM public.actors WHERE id = p_actor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'audit_actor_not_found' USING ERRCODE = '23503';
  END IF;

  IF p_job_id IS NOT NULL THEN
    PERFORM 1
      FROM public.agent_jobs
     WHERE job_id = p_job_id
       AND document_name = p_document_name;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'audit_job_not_found_or_document_mismatch' USING ERRCODE = '23503';
    END IF;
  END IF;

  IF p_causation_event_id IS NOT NULL THEN
    PERFORM 1
      FROM public.audit_events
     WHERE id = p_causation_event_id
       AND document_name = p_document_name;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'audit_causation_not_found_or_document_mismatch' USING ERRCODE = '23503';
    END IF;
  END IF;

  SELECT *
    INTO v_existing
    FROM public.audit_events
   WHERE document_name = p_document_name
     AND event_key = p_event_key;

  IF FOUND THEN
    IF v_existing.event_type IS DISTINCT FROM p_event_type
       OR v_existing.actor_id IS DISTINCT FROM p_actor_id
       OR v_existing.actor_name_snapshot IS DISTINCT FROM p_actor_name_snapshot
       OR v_existing.job_id IS DISTINCT FROM p_job_id
       OR v_existing.causation_event_id IS DISTINCT FROM p_causation_event_id
       OR v_existing.metadata IS DISTINCT FROM p_metadata THEN
      RAISE EXCEPTION 'audit_event_idempotency_conflict' USING ERRCODE = '23505';
    END IF;
    RETURN to_jsonb(v_existing);
  END IF;

  INSERT INTO public.document_audit_heads (document_name)
  VALUES (p_document_name)
  ON CONFLICT (document_name) DO NOTHING;

  SELECT *
    INTO v_head
    FROM public.document_audit_heads
   WHERE document_name = p_document_name
   FOR UPDATE;

  -- Recheck after acquiring the per-document lock. This closes the race between
  -- concurrent retries with the same (document_name, event_key).
  SELECT *
    INTO v_existing
    FROM public.audit_events
   WHERE document_name = p_document_name
     AND event_key = p_event_key;

  IF FOUND THEN
    IF v_existing.event_type IS DISTINCT FROM p_event_type
       OR v_existing.actor_id IS DISTINCT FROM p_actor_id
       OR v_existing.actor_name_snapshot IS DISTINCT FROM p_actor_name_snapshot
       OR v_existing.job_id IS DISTINCT FROM p_job_id
       OR v_existing.causation_event_id IS DISTINCT FROM p_causation_event_id
       OR v_existing.metadata IS DISTINCT FROM p_metadata THEN
      RAISE EXCEPTION 'audit_event_idempotency_conflict' USING ERRCODE = '23505';
    END IF;
    RETURN to_jsonb(v_existing);
  END IF;

  v_event_id := gen_random_uuid();
  v_sequence := v_head.last_sequence + 1;
  v_previous_hash := v_head.last_event_hash;
  v_occurred_at := clock_timestamp();

  -- Canonicalization v1: jsonb_build_object normalizes key order and JSON
  -- whitespace. Timestamps are rendered in UTC with fixed microsecond precision.
  -- The UTF-8 bytes of the domain separator, a newline, and this jsonb text are
  -- hashed. event_hash itself is deliberately excluded from the envelope.
  v_canonical := jsonb_build_object(
    'actor_id', p_actor_id,
    'actor_name_snapshot', p_actor_name_snapshot,
    'causation_event_id', p_causation_event_id,
    'document_name', p_document_name,
    'document_sequence', v_sequence,
    'event_id', v_event_id,
    'event_key', p_event_key,
    'event_type', p_event_type,
    'hash_version', 1,
    'job_id', p_job_id,
    'metadata', p_metadata,
    'occurred_at', to_char(
      v_occurred_at AT TIME ZONE 'UTC',
      'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
    ),
    'previous_hash', v_previous_hash
  );
  v_event_hash := encode(
    extensions.digest(
      convert_to('co-pen.audit-event.v1' || E'\n' || v_canonical::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  INSERT INTO public.audit_events (
    id,
    document_name,
    document_sequence,
    event_key,
    event_type,
    actor_id,
    actor_name_snapshot,
    job_id,
    causation_event_id,
    occurred_at,
    metadata,
    previous_hash,
    event_hash,
    hash_version
  )
  VALUES (
    v_event_id,
    p_document_name,
    v_sequence,
    p_event_key,
    p_event_type,
    p_actor_id,
    p_actor_name_snapshot,
    p_job_id,
    p_causation_event_id,
    v_occurred_at,
    p_metadata,
    v_previous_hash,
    v_event_hash,
    1
  )
  RETURNING * INTO v_event;

  UPDATE public.document_audit_heads
     SET last_sequence = v_sequence,
         last_event_hash = v_event_hash,
         last_event_id = v_event_id
   WHERE document_name = p_document_name;

  RETURN to_jsonb(v_event);
END;
$$;

-- 감사 메타데이터에는 본문 텍스트를 넣지 않는다
CREATE FUNCTION public.document_source_audit_metadata(p_source public.document_sources)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT jsonb_build_object(
    'sourceId', p_source.id,
    'number', p_source.number,
    'fileName', p_source.file_name,
    'sha256', p_source.sha256,
    'charCount', p_source.char_count
  );
$$;

CREATE FUNCTION public.create_document_source(
  p_document_name text,
  p_file_name text,
  p_format text,
  p_byte_size integer,
  p_char_count integer,
  p_truncated boolean,
  p_sha256 text,
  p_actor_id uuid,
  p_actor_name text,
  p_chunks text[],
  p_max_sources integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_source public.document_sources%ROWTYPE;
  v_active integer;
BEGIN
  IF p_chunks IS NULL OR cardinality(p_chunks) = 0 THEN
    RAISE EXCEPTION 'document_source_chunks_required' USING ERRCODE = '22023';
  END IF;

  -- 같은 문서의 업로드를 줄 세워, 동시에 올려도 번호가 겹치거나 개수 제한을 넘지 않게 한다
  PERFORM pg_advisory_xact_lock(hashtextextended('co-pen.document_sources:' || p_document_name, 0));

  SELECT count(*)
    INTO v_active
    FROM public.document_sources
   WHERE document_name = p_document_name
     AND deleted_at IS NULL;

  IF v_active >= p_max_sources THEN
    RETURN jsonb_build_object('status', 'too_many_files');
  END IF;

  INSERT INTO public.document_sources (
    document_name,
    number,
    file_name,
    format,
    byte_size,
    char_count,
    truncated,
    sha256,
    uploaded_by_actor_id,
    uploaded_by_name
  )
  VALUES (
    p_document_name,
    -- 지운 행도 남아 있으므로 최댓값 + 1이면 번호를 다시 쓰지 않는다
    (SELECT COALESCE(max(number), 0) + 1
       FROM public.document_sources
      WHERE document_name = p_document_name),
    p_file_name,
    p_format,
    p_byte_size,
    p_char_count,
    p_truncated,
    p_sha256,
    p_actor_id,
    p_actor_name
  )
  RETURNING * INTO v_source;

  INSERT INTO public.document_source_chunks (source_id, ordinal, text)
  SELECT v_source.id, chunk.ordinal, chunk.text
    FROM unnest(p_chunks) WITH ORDINALITY AS chunk(text, ordinal);

  PERFORM public.append_audit_event(
    p_document_name,
    'source:' || v_source.id || ':uploaded',
    'source_uploaded',
    p_actor_id,
    p_actor_name,
    NULL,
    NULL,
    public.document_source_audit_metadata(v_source)
  );

  RETURN jsonb_build_object('status', 'created', 'source', to_jsonb(v_source));
END;
$$;

CREATE FUNCTION public.delete_document_source(
  p_document_name text,
  p_source_id uuid,
  p_actor_id uuid,
  p_actor_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_source public.document_sources%ROWTYPE;
BEGIN
  UPDATE public.document_sources
     SET deleted_at = clock_timestamp()
   WHERE id = p_source_id
     AND document_name = p_document_name
     AND deleted_at IS NULL
  RETURNING * INTO v_source;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  PERFORM public.append_audit_event(
    p_document_name,
    'source:' || v_source.id || ':deleted',
    'source_deleted',
    p_actor_id,
    p_actor_name,
    NULL,
    NULL,
    public.document_source_audit_metadata(v_source)
  );

  RETURN true;
END;
$$;

-- 조각 수가 PostgREST 최대 행 수(기본 1000)를 넘을 수 있어 배열 하나로 돌려준다
CREATE FUNCTION public.list_document_source_chunks(p_document_name text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'number', source.number,
        'file_name', source.file_name,
        'ordinal', chunk.ordinal,
        'text', chunk.text
      )
      ORDER BY source.number, chunk.ordinal
    ),
    '[]'::jsonb
  )
    FROM public.document_sources AS source
    JOIN public.document_source_chunks AS chunk ON chunk.source_id = source.id
   WHERE source.document_name = p_document_name
     AND source.deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.document_source_audit_metadata(public.document_sources)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_document_source(text, text, text, integer, integer, boolean, text, uuid, text, text[], integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_document_source(text, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_document_source_chunks(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_document_source(text, text, text, integer, integer, boolean, text, uuid, text, text[], integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_document_source(text, uuid, uuid, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.list_document_source_chunks(text)
  TO service_role;

COMMIT;
