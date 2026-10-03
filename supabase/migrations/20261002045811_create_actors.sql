CREATE TABLE public.actors (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  kind       text        NOT NULL,
  key        text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT actors_pkey PRIMARY KEY (id),
  CONSTRAINT actors_kind_check CHECK (kind IN ('anonymous', 'authenticated', 'agent', 'system')),
  CONSTRAINT actors_key_key UNIQUE (key)
);

ALTER TABLE public.actors
  ENABLE ROW LEVEL SECURITY;

INSERT INTO public.actors (id, kind, key)
VALUES ('00000000-0000-4000-8000-000000000001', 'agent', 'agent:co-pen-default');
