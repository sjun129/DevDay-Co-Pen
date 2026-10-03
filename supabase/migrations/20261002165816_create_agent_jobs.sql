BEGIN;

CREATE TABLE public.agent_jobs (
  job_id                 uuid        NOT NULL,
  document_name          text        NOT NULL,
  requested_by_actor_id  uuid        NOT NULL,
  agent_actor_id         uuid        NOT NULL,
  status                 text        NOT NULL DEFAULT 'queued',
  operation_type         text        NOT NULL,
  idempotency_key        text        NOT NULL,
  prompt_hash            text        NOT NULL,
  model_provider         text,
  model_name             text,
  output_hash            text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  started_at             timestamptz,
  finished_at            timestamptz,
  last_error_code        text,
  last_error_message     text,
  CONSTRAINT agent_jobs_pkey PRIMARY KEY (job_id),
  CONSTRAINT agent_jobs_document_name_fkey
    FOREIGN KEY (document_name) REFERENCES public.documents(name) ON DELETE RESTRICT,
  CONSTRAINT agent_jobs_requested_by_actor_id_fkey
    FOREIGN KEY (requested_by_actor_id) REFERENCES public.actors(id) ON DELETE RESTRICT,
  CONSTRAINT agent_jobs_agent_actor_id_fkey
    FOREIGN KEY (agent_actor_id) REFERENCES public.actors(id) ON DELETE RESTRICT,
  CONSTRAINT agent_jobs_document_job_key UNIQUE (document_name, job_id),
  CONSTRAINT agent_jobs_document_idempotency_key UNIQUE (document_name, idempotency_key),
  CONSTRAINT agent_jobs_status_check
    CHECK (status IN ('queued', 'planning', 'writing', 'done', 'error')),
  CONSTRAINT agent_jobs_operation_type_check
    CHECK (operation_type IN ('insert_after')),
  CONSTRAINT agent_jobs_idempotency_key_check
    CHECK (octet_length(idempotency_key) BETWEEN 1 AND 256),
  CONSTRAINT agent_jobs_prompt_hash_check
    CHECK (prompt_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT agent_jobs_output_hash_check
    CHECK (output_hash IS NULL OR output_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT agent_jobs_model_provider_check
    CHECK (model_provider IS NULL OR char_length(model_provider) BETWEEN 1 AND 100),
  CONSTRAINT agent_jobs_model_name_check
    CHECK (model_name IS NULL OR char_length(model_name) BETWEEN 1 AND 200),
  CONSTRAINT agent_jobs_error_code_check
    CHECK (
      last_error_code IS NULL
      OR (
        char_length(last_error_code) <= 128
        AND last_error_code ~ '^[a-z0-9][a-z0-9_.:-]*$'
      )
    ),
  CONSTRAINT agent_jobs_error_message_check
    CHECK (last_error_message IS NULL OR char_length(last_error_message) <= 2000),
  CONSTRAINT agent_jobs_finished_after_started_check
    CHECK (started_at IS NULL OR finished_at IS NULL OR finished_at >= started_at),
  CONSTRAINT agent_jobs_timestamp_state_check
    CHECK (
      (status = 'queued' AND started_at IS NULL AND finished_at IS NULL)
      OR (status IN ('planning', 'writing') AND started_at IS NOT NULL AND finished_at IS NULL)
      OR (status = 'done' AND started_at IS NOT NULL AND finished_at IS NOT NULL)
      OR (status = 'error' AND finished_at IS NOT NULL)
    ),
  CONSTRAINT agent_jobs_error_state_check
    CHECK (status = 'error' OR (last_error_code IS NULL AND last_error_message IS NULL))
);

ALTER TABLE public.agent_jobs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.agent_jobs FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.agent_jobs TO service_role;

CREATE FUNCTION public.create_agent_job(
  p_job_id uuid,
  p_document_name text,
  p_requested_by_actor_id uuid,
  p_agent_actor_id uuid,
  p_operation_type text,
  p_idempotency_key text,
  p_prompt_hash text,
  p_model_provider text DEFAULT NULL,
  p_model_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_job public.agent_jobs%ROWTYPE;
  v_created boolean := false;
BEGIN
  INSERT INTO public.agent_jobs (
    job_id,
    document_name,
    requested_by_actor_id,
    agent_actor_id,
    operation_type,
    idempotency_key,
    prompt_hash,
    model_provider,
    model_name
  )
  VALUES (
    p_job_id,
    p_document_name,
    p_requested_by_actor_id,
    p_agent_actor_id,
    p_operation_type,
    p_idempotency_key,
    p_prompt_hash,
    p_model_provider,
    p_model_name
  )
  ON CONFLICT (document_name, idempotency_key) DO NOTHING
  RETURNING * INTO v_job;

  IF FOUND THEN
    v_created := true;
  ELSE
    SELECT *
      INTO v_job
      FROM public.agent_jobs
     WHERE document_name = p_document_name
       AND idempotency_key = p_idempotency_key;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'agent_job_idempotency_lookup_failed' USING ERRCODE = 'P0001';
    END IF;

    IF v_job.requested_by_actor_id IS DISTINCT FROM p_requested_by_actor_id
       OR v_job.agent_actor_id IS DISTINCT FROM p_agent_actor_id
       OR v_job.operation_type IS DISTINCT FROM p_operation_type
       OR v_job.prompt_hash IS DISTINCT FROM p_prompt_hash
       OR v_job.model_provider IS DISTINCT FROM p_model_provider
       OR v_job.model_name IS DISTINCT FROM p_model_name THEN
      RAISE EXCEPTION 'agent_job_idempotency_conflict' USING ERRCODE = '23505';
    END IF;
  END IF;

  RETURN jsonb_build_object('created', v_created, 'job', to_jsonb(v_job));
END;
$$;

CREATE FUNCTION public.transition_agent_job(
  p_job_id uuid,
  p_expected_status text,
  p_next_status text,
  p_error_code text DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_output_hash text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_job public.agent_jobs%ROWTYPE;
  v_now timestamptz;
BEGIN
  IF p_expected_status NOT IN ('queued', 'planning', 'writing', 'done', 'error')
     OR p_next_status NOT IN ('queued', 'planning', 'writing', 'done', 'error') THEN
    RAISE EXCEPTION 'invalid_agent_job_status' USING ERRCODE = '22023';
  END IF;

  SELECT *
    INTO v_job
    FROM public.agent_jobs
   WHERE job_id = p_job_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'agent_job_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_job.status <> p_expected_status THEN
    RAISE EXCEPTION 'agent_job_status_conflict' USING ERRCODE = 'P0001';
  END IF;

  IF NOT (
    (v_job.status = 'queued' AND p_next_status = 'planning')
    OR (v_job.status = 'planning' AND p_next_status = 'writing')
    OR (v_job.status = 'writing' AND p_next_status = 'done')
    OR (v_job.status IN ('queued', 'planning', 'writing') AND p_next_status = 'error')
  ) THEN
    RAISE EXCEPTION 'invalid_agent_job_transition' USING ERRCODE = '22023';
  END IF;

  IF p_next_status = 'error' THEN
    IF p_output_hash IS NOT NULL THEN
      RAISE EXCEPTION 'output_hash_not_allowed_for_error' USING ERRCODE = '22023';
    END IF;
    IF p_error_code IS NOT NULL AND (
      char_length(p_error_code) > 128
      OR p_error_code !~ '^[a-z0-9][a-z0-9_.:-]*$'
    ) THEN
      RAISE EXCEPTION 'invalid_agent_job_error_code' USING ERRCODE = '22023';
    END IF;
    IF p_error_message IS NOT NULL AND char_length(p_error_message) > 2000 THEN
      RAISE EXCEPTION 'invalid_agent_job_error_message' USING ERRCODE = '22023';
    END IF;
  ELSE
    IF p_error_code IS NOT NULL OR p_error_message IS NOT NULL THEN
      RAISE EXCEPTION 'error_fields_only_allowed_for_error' USING ERRCODE = '22023';
    END IF;
    IF p_next_status <> 'done' AND p_output_hash IS NOT NULL THEN
      RAISE EXCEPTION 'output_hash_only_allowed_for_done' USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_output_hash IS NOT NULL AND p_output_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid_agent_job_output_hash' USING ERRCODE = '22023';
  END IF;

  v_now := clock_timestamp();

  UPDATE public.agent_jobs
     SET status = p_next_status,
         started_at = CASE
           WHEN p_next_status = 'planning' THEN COALESCE(started_at, v_now)
           ELSE started_at
         END,
         finished_at = CASE
           WHEN p_next_status IN ('done', 'error') THEN v_now
           ELSE NULL
         END,
         output_hash = CASE WHEN p_next_status = 'done' THEN p_output_hash ELSE NULL END,
         last_error_code = CASE WHEN p_next_status = 'error' THEN p_error_code ELSE NULL END,
         last_error_message = CASE WHEN p_next_status = 'error' THEN p_error_message ELSE NULL END
   WHERE job_id = p_job_id
  RETURNING * INTO v_job;

  RETURN to_jsonb(v_job);
END;
$$;

REVOKE ALL ON FUNCTION public.create_agent_job(uuid, text, uuid, uuid, text, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_agent_job(uuid, text, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_agent_job(uuid, text, uuid, uuid, text, text, text, text, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_agent_job(uuid, text, text, text, text, text)
  TO service_role;

COMMIT;
