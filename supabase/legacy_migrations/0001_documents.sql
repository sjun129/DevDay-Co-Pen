-- F10 문서 저장·복원: 동기화 서버가 Yjs 문서 상태(Y.encodeStateAsUpdate)를 base64로 저장한다.
create table if not exists public.documents (
  name text primary key,
  state text not null,
  updated_at timestamptz not null default now()
);

-- 동기화 서버만 service role 키로 접근한다. 브라우저에서 직접 읽는 정책은 두지 않는다.
alter table public.documents enable row level security;
