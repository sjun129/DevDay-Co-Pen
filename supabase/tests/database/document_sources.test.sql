BEGIN;

SELECT plan(30);

CREATE FUNCTION pg_temp.raises_sqlstate(command text, expected text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE command;
  RETURN false;
EXCEPTION WHEN OTHERS THEN
  RETURN SQLSTATE = expected;
END;
$$;

CREATE FUNCTION pg_temp.upload(p_document text, p_name text, p_max integer DEFAULT 10)
RETURNS jsonb
LANGUAGE sql
AS $$
  SELECT public.create_document_source(
    p_document, p_name, 'txt', 12, 11, false, repeat('e', 64),
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Uploader',
    ARRAY['첫 조각 본문', '둘째 조각 본문'], p_max
  );
$$;

SELECT has_table('public', 'document_sources', 'document_sources exists');
SELECT has_table('public', 'document_source_chunks', 'document_source_chunks exists');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.document_sources'::regclass), 'document_sources RLS enabled');
SELECT ok((SELECT relrowsecurity FROM pg_class WHERE oid = 'public.document_source_chunks'::regclass), 'document_source_chunks RLS enabled');
SELECT is((SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('document_sources', 'document_source_chunks')), 0::bigint, 'source tables have no browser policies');

SELECT ok(has_table_privilege('service_role', 'public.document_sources', 'SELECT'), 'service_role can read sources');
SELECT ok(NOT has_table_privilege('service_role', 'public.document_sources', 'INSERT'), 'service_role cannot directly insert sources');
SELECT ok(NOT has_table_privilege('service_role', 'public.document_sources', 'UPDATE'), 'service_role cannot directly update sources');
SELECT ok(NOT has_table_privilege('service_role', 'public.document_source_chunks', 'INSERT'), 'service_role cannot directly insert chunks');
SELECT ok(NOT has_table_privilege('anon', 'public.document_sources', 'SELECT'), 'anon cannot read sources');
SELECT ok(NOT has_table_privilege('authenticated', 'public.document_source_chunks', 'SELECT'), 'authenticated cannot read chunks');
SELECT ok(has_function_privilege('service_role', 'public.create_document_source(text,text,text,integer,integer,boolean,text,uuid,text,text[],integer)', 'EXECUTE'), 'service_role can upload through RPC');
SELECT ok(has_function_privilege('service_role', 'public.delete_document_source(text,uuid,uuid,text)', 'EXECUTE'), 'service_role can delete through RPC');
SELECT ok(NOT has_function_privilege('anon', 'public.create_document_source(text,text,text,integer,integer,boolean,text,uuid,text,text[],integer)', 'EXECUTE'), 'anon cannot upload');
SELECT ok(NOT has_function_privilege('authenticated', 'public.list_document_source_chunks(text)', 'EXECUTE'), 'authenticated cannot list chunks');

INSERT INTO public.documents (name, state)
VALUES ('db-source-doc-1', 'AAA='), ('db-source-doc-2', 'AAA=');
INSERT INTO public.actors (id, kind)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'anonymous');

SELECT is(pg_temp.upload('db-source-doc-1', 'a.txt') #>> '{source,number}', '1', 'first upload gets number 1');
SELECT is(pg_temp.upload('db-source-doc-1', 'b.txt') #>> '{source,number}', '2', 'second upload gets number 2');
SELECT is(pg_temp.upload('db-source-doc-2', 'c.txt') #>> '{source,number}', '1', 'numbers are per document');
SELECT is(
  (SELECT array_agg(ordinal ORDER BY ordinal) FROM public.document_source_chunks
    WHERE source_id = (SELECT id FROM public.document_sources WHERE document_name = 'db-source-doc-1' AND number = 1)),
  ARRAY[1, 2],
  'chunks keep their order'
);

SELECT ok(
  public.delete_document_source(
    'db-source-doc-1',
    (SELECT id FROM public.document_sources WHERE document_name = 'db-source-doc-1' AND number = 2),
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Deleter'
  ),
  'delete soft-deletes an active source'
);
SELECT ok(
  NOT public.delete_document_source(
    'db-source-doc-1',
    (SELECT id FROM public.document_sources WHERE document_name = 'db-source-doc-1' AND number = 2),
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Deleter'
  ),
  'deleting twice reports not found'
);
SELECT ok(
  NOT public.delete_document_source(
    'db-source-doc-2',
    (SELECT id FROM public.document_sources WHERE document_name = 'db-source-doc-1' AND number = 1),
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Deleter'
  ),
  'a source cannot be deleted through another document'
);
SELECT is(pg_temp.upload('db-source-doc-1', 'd.txt') #>> '{source,number}', '3', 'deleted numbers are never reused');
SELECT is(
  jsonb_array_length(public.list_document_source_chunks('db-source-doc-1')),
  4,
  'chunk listing skips deleted sources'
);
SELECT is(
  pg_temp.upload('db-source-doc-1', 'e.txt', 2) ->> 'status',
  'too_many_files',
  'active source limit is enforced'
);

SELECT is(
  (SELECT array_agg(event_type ORDER BY document_sequence) FROM public.audit_events WHERE document_name = 'db-source-doc-1'),
  ARRAY['source_uploaded', 'source_uploaded', 'source_deleted', 'source_uploaded'],
  'uploads and deletes are appended to the audit chain'
);
SELECT is(
  (SELECT array_agg(key ORDER BY key) FROM public.audit_events, jsonb_object_keys(metadata) AS key
    WHERE document_name = 'db-source-doc-1' AND document_sequence = 1),
  ARRAY['charCount', 'fileName', 'number', 'sha256', 'sourceId'],
  'audit metadata has no source text'
);

SELECT ok(pg_temp.raises_sqlstate(
  $$SELECT public.create_document_source('db-source-doc-1', 'x.exe', 'exe', 1, 1, false, repeat('e', 64), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Uploader', ARRAY['x'], 10)$$,
  '23514'
), 'unknown format is rejected');
SELECT ok(pg_temp.raises_sqlstate(
  $$SELECT public.create_document_source('db-source-doc-1', 'x.txt', 'txt', 1, 1, false, 'ABC', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Uploader', ARRAY['x'], 10)$$,
  '23514'
), 'invalid sha256 is rejected');
SELECT ok(pg_temp.raises_sqlstate(
  $$SELECT public.create_document_source('missing-doc', 'x.txt', 'txt', 1, 1, false, repeat('e', 64), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Uploader', ARRAY['x'], 10)$$,
  '23503'
), 'missing document is rejected');

SELECT * FROM finish();
ROLLBACK;
