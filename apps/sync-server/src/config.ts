export const APP_ENVIRONMENTS = ['development', 'preview', 'staging', 'production'] as const;
export const PERSISTENCE_BACKENDS = ['file', 'supabase'] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];
export type PersistenceBackend = (typeof PERSISTENCE_BACKENDS)[number];

export interface SyncServerEnvironment {
  appEnvironment: AppEnvironment;
  persistenceBackend: PersistenceBackend;
  port: number;
  agentWorkerUrl: string;
  jobStaleAfterMs: number;
  agentSharedSecret: string;
  guestTokenSecret: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  localDataDir: string;
}

const GUEST_TOKEN_SECRET_MIN_BYTES = 32;
const DEFAULT_JOB_STALE_AFTER_MS = 15 * 60 * 1000;

function required(source: NodeJS.ProcessEnv, name: string): string {
  const value = source[name]?.trim();
  if (!value) throw new Error(`Environment variable ${name} is required`);
  return value;
}

function optional(source: NodeJS.ProcessEnv, name: string): string | undefined {
  const value = source[name]?.trim();
  return value || undefined;
}

function oneOf<const T extends readonly string[]>(
  source: NodeJS.ProcessEnv,
  name: string,
  allowed: T,
): T[number] {
  const value = required(source, name);
  if (!allowed.includes(value)) {
    throw new Error(`Environment variable ${name} must be one of: ${allowed.join(', ')}`);
  }
  return value as T[number];
}

export function parseSyncServerEnvironment(source: NodeJS.ProcessEnv): SyncServerEnvironment {
  const appEnvironment = oneOf(source, 'APP_ENV', APP_ENVIRONMENTS);
  const persistenceBackend = oneOf(source, 'PERSISTENCE_BACKEND', PERSISTENCE_BACKENDS);
  const agentSharedSecret = required(source, 'AGENT_SHARED_SECRET');
  const guestTokenSecret = required(source, 'GUEST_TOKEN_SECRET');
  const supabaseUrl = optional(source, 'SUPABASE_URL');
  const supabaseServiceRoleKey = optional(source, 'SUPABASE_SERVICE_ROLE_KEY');
  const port = Number(source.PORT ?? 1234);
  const jobStaleAfterMs = Number(source.JOB_STALE_AFTER_MS ?? DEFAULT_JOB_STALE_AFTER_MS);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('Environment variable PORT must be an integer between 1 and 65535');
  }
  if (!Number.isInteger(jobStaleAfterMs) || jobStaleAfterMs < 1_000) {
    throw new Error('Environment variable JOB_STALE_AFTER_MS must be an integer of at least 1000');
  }

  if (
    (appEnvironment === 'staging' || appEnvironment === 'production') &&
    persistenceBackend === 'file'
  ) {
    throw new Error(`PERSISTENCE_BACKEND=file is not allowed when APP_ENV=${appEnvironment}`);
  }

  if (persistenceBackend === 'supabase') {
    if (!supabaseUrl) throw new Error('Environment variable SUPABASE_URL is required');
    if (!supabaseServiceRoleKey) {
      throw new Error('Environment variable SUPABASE_SERVICE_ROLE_KEY is required');
    }
  }

  if (Buffer.byteLength(guestTokenSecret, 'utf8') < GUEST_TOKEN_SECRET_MIN_BYTES) {
    throw new Error(
      `Environment variable GUEST_TOKEN_SECRET must be at least ${GUEST_TOKEN_SECRET_MIN_BYTES} bytes`,
    );
  }
  if (guestTokenSecret === agentSharedSecret) {
    throw new Error('GUEST_TOKEN_SECRET must be different from AGENT_SHARED_SECRET');
  }
  if (supabaseServiceRoleKey && guestTokenSecret === supabaseServiceRoleKey) {
    throw new Error('GUEST_TOKEN_SECRET must be different from SUPABASE_SERVICE_ROLE_KEY');
  }

  return {
    appEnvironment,
    persistenceBackend,
    port,
    agentWorkerUrl: source.AGENT_WORKER_URL?.trim() || 'http://localhost:1235',
    jobStaleAfterMs,
    agentSharedSecret,
    guestTokenSecret,
    supabaseUrl,
    supabaseServiceRoleKey,
    localDataDir: source.LOCAL_DATA_DIR?.trim() || '.data',
  };
}
