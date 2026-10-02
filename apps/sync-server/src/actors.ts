import { randomUUID } from 'node:crypto';
import { access, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { SyncServerEnvironment } from './config';

export const DEFAULT_AGENT_ACTOR_ID = '00000000-0000-4000-8000-000000000001';
export const DEFAULT_AGENT_ACTOR_KEY = 'agent:co-pen-default';

export interface ActorStore {
  createAnonymousActor(): Promise<string>;
  anonymousActorExists(actorId: string): Promise<boolean>;
}

function supabaseActorStore(url: string, serviceRoleKey: string): ActorStore {
  const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

  return {
    async createAnonymousActor() {
      const { data, error } = await supabase
        .from('actors')
        .insert({ kind: 'anonymous' })
        .select('id')
        .single();
      if (error || !data?.id) throw new Error('actor_insert_failed');
      return data.id as string;
    },
    async anonymousActorExists(actorId) {
      const { data, error } = await supabase
        .from('actors')
        .select('id')
        .eq('id', actorId)
        .eq('kind', 'anonymous')
        .maybeSingle();
      if (error) throw new Error('actor_lookup_failed');
      return data !== null;
    },
  };
}

/** Local-only actor storage selected explicitly together with file persistence. */
function fileActorStore(dataDir: string): ActorStore {
  const actorsDir = path.join(dataDir, 'actors');

  return {
    async createAnonymousActor() {
      const id = randomUUID();
      await mkdir(actorsDir, { recursive: true });
      await writeFile(
        path.join(actorsDir, `${id}.json`),
        JSON.stringify({ id, kind: 'anonymous', key: null, created_at: new Date().toISOString() }),
        { encoding: 'utf8', flag: 'wx' },
      );
      return id;
    },
    async anonymousActorExists(actorId) {
      try {
        await access(path.join(actorsDir, `${actorId}.json`));
        return true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
        throw new Error('actor_lookup_failed');
      }
    },
  };
}

export function createActorStore(environment: SyncServerEnvironment): ActorStore {
  switch (environment.persistenceBackend) {
    case 'file':
      return fileActorStore(environment.localDataDir);
    case 'supabase':
      return supabaseActorStore(
        environment.supabaseUrl!,
        environment.supabaseServiceRoleKey!,
      );
  }
}
