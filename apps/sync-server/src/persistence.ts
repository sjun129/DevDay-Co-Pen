import { access, mkdir, open, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Database } from '@hocuspocus/extension-database';
import { createClient } from '@supabase/supabase-js';
import type { SyncServerEnvironment } from './config';

export interface DocumentStore {
  load(documentName: string): Promise<Uint8Array | null>;
  save(documentName: string, state: Uint8Array): Promise<void>;
  exists(documentName: string): Promise<boolean>;
  createIfAbsent(documentName: string, initialState: Uint8Array): Promise<boolean>;
}

/** F10: Supabase `documents` 테이블에 Yjs 상태를 base64로 저장 (supabase/migrations 참고) */
function supabaseStore(url: string, serviceRoleKey: string): DocumentStore {
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
      const { data, error } = await supabase
        .from('documents')
        .update({
          state: Buffer.from(state).toString('base64'),
          updated_at: new Date().toISOString(),
        })
        .eq('name', name)
        .select('name')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('document_not_found');
    },
    async exists(name) {
      const { data, error } = await supabase
        .from('documents')
        .select('name')
        .eq('name', name)
        .maybeSingle();
      if (error) throw error;
      return data !== null;
    },
    async createIfAbsent(name, initialState) {
      const { error } = await supabase.from('documents').insert({
        name,
        state: Buffer.from(initialState).toString('base64'),
      });
      if (!error) return true;
      if (error.code === '23505') return false;
      throw error;
    },
  };
}

/** Explicitly selected local development/preview file store. */
function fileStore(dir: string): DocumentStore {
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
      const handle = await open(fileOf(name), 'r+');
      try {
        await handle.truncate(0);
        await handle.writeFile(state);
      } finally {
        await handle.close();
      }
    },
    async exists(name) {
      try {
        await access(fileOf(name));
        return true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
        throw error;
      }
    },
    async createIfAbsent(name, initialState) {
      await mkdir(dir, { recursive: true });
      try {
        await writeFile(fileOf(name), initialState, { flag: 'wx' });
        return true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
        throw error;
      }
    },
  };
}

export function createDocumentStore(environment: SyncServerEnvironment): DocumentStore {
  switch (environment.persistenceBackend) {
    case 'file':
      return fileStore(environment.localDataDir);
    case 'supabase':
      return supabaseStore(
        environment.supabaseUrl!,
        environment.supabaseServiceRoleKey!,
      );
  }
}

export function createPersistence(store: DocumentStore) {
  return new Database({
    fetch: ({ documentName }) => store.load(documentName),
    store: ({ documentName, state }) => store.save(documentName, state),
  });
}
