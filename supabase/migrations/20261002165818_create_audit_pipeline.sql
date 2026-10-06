BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.document_audit_heads (
  document_name   text     NOT NULL,
  last_sequence   bigint   NOT NULL DEFAULT 0,
  last_event_hash text,
  last_event_id   uuid,
  CONSTRAINT document_audit_heads_pkey PRIMARY KEY (document_name),
  CONSTRAINT document_audit_heads_document_name_fkey
    FOREIGN KEY (document_name) REFERENCES public.documents(name) ON DELETE RESTRICT,
  CONSTRAINT document_audit_heads_document_event_fkey
    FOREIGN KEY (document_name, last_event_id)
    REFERENCES public.audit_events(document_name, id) ON DELETE RESTRICT,
  CONSTRAINT document_audit_heads_sequence_check CHECK (last_sequence >= 0),
  CONSTRAINT document_audit_heads_hash_check
    CHECK (last_event_hash IS NULL OR last_event_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT document_audit_heads_state_check CHECK (
    (last_sequence = 0 AND last_event_hash IS NULL AND last_event_id IS NULL)
    OR (last_sequence > 0 AND last_event_hash IS NOT NULL AND last_event_id IS NOT NULL)
  )
);

ALTER TABLE public.document_audit_heads ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.document_audit_heads FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.document_audit_heads TO service_role;

CREATE FUNCTION public.append_audit_event(
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
    'suggestion_rejected'
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

REVOKE ALL ON FUNCTION public.append_audit_event(text, text, text, uuid, text, uuid, uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.append_audit_event(text, text, text, uuid, text, uuid, uuid, jsonb)
  TO service_role;

COMMIT;
