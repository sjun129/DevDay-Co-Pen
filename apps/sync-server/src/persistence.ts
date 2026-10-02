import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Database } from '@hocuspocus/extension-database';
import { createClient } from '@supabase/supabase-js';
import type { SyncServerEnvironment } from './config';

interface SnapshotStore {
  load(documentName: string): Promise<Uint8Array | null>;
  save(documentName: string, state: Uint8Array): Promise<void>;
}

/** F10: Supabase `documents` 테이블에 Yjs 상태를 base64로 저장 (supabase/migrations 참고) */
function supabaseStore(url: string, serviceRoleKey: string): SnapshotStore {
  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  return {
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

/** Explicitly selected local development/preview file store. */
function fileStore(dir: string): SnapshotStore {
  const fileOf = (name: string) => path.join(dir, `${encodeURIComponent(name)}.bin`);
  return {
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

export function createPersistence(environment: SyncServerEnvironment) {
  let store: SnapshotStore;
  switch (environment.persistenceBackend) {
    case 'file':
      store = fileStore(environment.localDataDir);
      break;
    case 'supabase':
      store = supabaseStore(
        environment.supabaseUrl!,
        environment.supabaseServiceRoleKey!,
      );
      break;
  }

  return new Database({
    fetch: ({ documentName }) => store.load(documentName),
    store: ({ documentName, state }) => store.save(documentName, state),
  });
}
