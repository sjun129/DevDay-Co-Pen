CREATE TABLE "public"."documents" (
  "name"       text                     NOT NULL,
  "state"      text                     NOT NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "documents_pkey" PRIMARY KEY (name)
);

ALTER TABLE "public"."documents"
  ENABLE ROW LEVEL SECURITY;

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."documents" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."documents" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."documents" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."documents" TO "service_role";

