BEGIN;

CREATE TABLE public.audit_events (
  id                    uuid        NOT NULL,
  document_name         text        NOT NULL,
  document_sequence     bigint      NOT NULL,
  event_key             text        NOT NULL,
  event_type            text        NOT NULL,
  actor_id              uuid        NOT NULL,
  actor_name_snapshot   text        NOT NULL,
  job_id                uuid,
  causation_event_id    uuid,
  occurred_at           timestamptz NOT NULL,
  metadata              jsonb       NOT NULL DEFAULT '{}'::jsonb,
  previous_hash         text,
  event_hash            text        NOT NULL,
  hash_version          smallint    NOT NULL DEFAULT 1,
  CONSTRAINT audit_events_pkey PRIMARY KEY (id),
  CONSTRAINT audit_events_document_name_fkey
    FOREIGN KEY (document_name) REFERENCES public.documents(name) ON DELETE RESTRICT,
  CONSTRAINT audit_events_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES public.actors(id) ON DELETE RESTRICT,
  CONSTRAINT audit_events_document_job_fkey
    FOREIGN KEY (document_name, job_id)
    REFERENCES public.agent_jobs(document_name, job_id) ON DELETE RESTRICT,
  CONSTRAINT audit_events_document_id_key UNIQUE (document_name, id),
  CONSTRAINT audit_events_document_sequence_key UNIQUE (document_name, document_sequence),
  CONSTRAINT audit_events_document_event_key UNIQUE (document_name, event_key),
  CONSTRAINT audit_events_document_causation_fkey
    FOREIGN KEY (document_name, causation_event_id)
    REFERENCES public.audit_events(document_name, id) ON DELETE RESTRICT,
  CONSTRAINT audit_events_sequence_check CHECK (document_sequence > 0),
  CONSTRAINT audit_events_event_key_check
    CHECK (octet_length(event_key) BETWEEN 1 AND 256),
  CONSTRAINT audit_events_event_type_check CHECK (
    event_type IN (
      'ai_job_requested',
      'ai_job_started',
      'ai_output_completed',
      'ai_job_failed',
      'suggestion_accepted',
      'suggestion_rejected'
    )
  ),
  CONSTRAINT audit_events_actor_name_snapshot_check
    CHECK (char_length(actor_name_snapshot) BETWEEN 1 AND 200),
  CONSTRAINT audit_events_metadata_object_check
    CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT audit_events_previous_hash_check
    CHECK (previous_hash IS NULL OR previous_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT audit_events_event_hash_check
    CHECK (event_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT audit_events_hash_version_check CHECK (hash_version = 1),
  CONSTRAINT audit_events_chain_position_check CHECK (
    (document_sequence = 1 AND previous_hash IS NULL)
    OR (document_sequence > 1 AND previous_hash IS NOT NULL)
  )
);

CREATE INDEX audit_events_job_occurred_at_idx
  ON public.audit_events (job_id, occurred_at);

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.audit_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.audit_events TO service_role;

COMMIT;
