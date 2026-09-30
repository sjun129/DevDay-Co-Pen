import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Database } from '@hocuspocus/extension-database';
import { createClient } from '@supabase/supabase-js';
import { env } from './env';

interface SnapshotStore {
  label: string;
  load(documentName: string): Promise<Uint8Array | null>;
  save(documentName: string, state: Uint8Array): Promise<void>;
}

/** F10: Supabase `documents` 테이블에 Yjs 상태를 base64로 저장 (supabase/migrations 참고) */
function supabaseStore(url: string, serviceRoleKey: string): SnapshotStore {
  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  return {
    label: 'supabase',
    async load(name) {
      const { data, error } = await supabase
        .from('documents')
        .select('state')
        .eq('name', name)
        .maybeSingle();
      if (error) throw error;
      return data ? Buffer.from(data.state as string, 'base64') : null;
    },
    async save(name, state) {
      const { error } = await supabase.from('documents').upsert({
        name,
        state: Buffer.from(state).toString('base64'),
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
  };
}

/** Supabase 설정이 없을 때 쓰는 로컬 개발용 파일 저장소 */
function fileStore(dir: string): SnapshotStore {
  const fileOf = (name: string) => path.join(dir, `${encodeURIComponent(name)}.bin`);
  return {
    label: `file (${path.resolve(dir)})`,
    async load(name) {
      try {
        return await readFile(fileOf(name));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
        throw error;
      }
    },
    async save(name, state) {
      await mkdir(dir, { recursive: true });
      await writeFile(fileOf(name), state);
    },
  };
}

export function createPersistence() {
  const store =
    env.supabaseUrl && env.supabaseServiceRoleKey
      ? supabaseStore(env.supabaseUrl, env.supabaseServiceRoleKey)
      : fileStore(env.localDataDir);

  console.log(`[persistence] ${store.label}`);

  return new Database({
    fetch: ({ documentName }) => store.load(documentName),
    store: ({ documentName, state }) => store.save(documentName, state),
  });
}
