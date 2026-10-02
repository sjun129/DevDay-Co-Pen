import assert from 'node:assert/strict';
import test from 'node:test';
import { parseSyncServerEnvironment } from './config';

const BASE_ENV: NodeJS.ProcessEnv = {
  APP_ENV: 'development',
  PERSISTENCE_BACKEND: 'file',
  AGENT_SHARED_SECRET: 'agent-secret',
  GUEST_TOKEN_SECRET: 'guest-token-secret-that-is-at-least-32-bytes',
};

function environment(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return { ...BASE_ENV, ...overrides };
}

test('development + file succeeds', () => {
  const config = parseSyncServerEnvironment(environment());
  assert.equal(config.appEnvironment, 'development');
  assert.equal(config.persistenceBackend, 'file');
});

test('development + supabase + URL/key succeeds', () => {
  const config = parseSyncServerEnvironment(
    environment({
      PERSISTENCE_BACKEND: 'supabase',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    }),
  );
  assert.equal(config.persistenceBackend, 'supabase');
});

test('preview permits explicit file or supabase persistence', () => {
  assert.equal(
    parseSyncServerEnvironment(environment({ APP_ENV: 'preview' })).persistenceBackend,
    'file',
  );
  assert.equal(
    parseSyncServerEnvironment(
      environment({
        APP_ENV: 'preview',
        PERSISTENCE_BACKEND: 'supabase',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
      }),
    ).persistenceBackend,
    'supabase',
  );
});

test('production + file fails', () => {
  assert.throws(
    () => parseSyncServerEnvironment(environment({ APP_ENV: 'production' })),
    /PERSISTENCE_BACKEND=file is not allowed/,
  );
});

test('staging + file fails', () => {
  assert.throws(
    () => parseSyncServerEnvironment(environment({ APP_ENV: 'staging' })),
    /PERSISTENCE_BACKEND=file is not allowed/,
  );
});

test('production + supabase + URL/key succeeds', () => {
  const config = parseSyncServerEnvironment(
    environment({
      APP_ENV: 'production',
      PERSISTENCE_BACKEND: 'supabase',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    }),
  );
  assert.equal(config.appEnvironment, 'production');
});

test('staging + supabase + URL/key succeeds', () => {
  const config = parseSyncServerEnvironment(
    environment({
      APP_ENV: 'staging',
      PERSISTENCE_BACKEND: 'supabase',
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    }),
  );
  assert.equal(config.appEnvironment, 'staging');
});

test('supabase without URL fails', () => {
  assert.throws(
    () =>
      parseSyncServerEnvironment(
        environment({
          PERSISTENCE_BACKEND: 'supabase',
          SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        }),
      ),
    /SUPABASE_URL is required/,
  );
});

test('supabase without service role key fails', () => {
  assert.throws(
    () =>
      parseSyncServerEnvironment(
        environment({
          PERSISTENCE_BACKEND: 'supabase',
          SUPABASE_URL: 'https://example.supabase.co',
        }),
      ),
    /SUPABASE_SERVICE_ROLE_KEY is required/,
  );
});

test('invalid APP_ENV fails with the allowed values', () => {
  assert.throws(
    () => parseSyncServerEnvironment(environment({ APP_ENV: 'prod' })),
    /APP_ENV must be one of: development, preview, staging, production/,
  );
});

test('invalid PERSISTENCE_BACKEND fails', () => {
  assert.throws(
    () => parseSyncServerEnvironment(environment({ PERSISTENCE_BACKEND: 'database' })),
    /PERSISTENCE_BACKEND must be one of/,
  );
});

test('missing backend fails instead of falling back to file', () => {
  const input = environment({
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  });
  delete input.PERSISTENCE_BACKEND;
  assert.throws(() => parseSyncServerEnvironment(input), /PERSISTENCE_BACKEND is required/);
});

test('invalid guest token secret fails without echoing it', () => {
  assert.throws(
    () => parseSyncServerEnvironment(environment({ GUEST_TOKEN_SECRET: 'short-secret' })),
    (error: Error) => !error.message.includes('short-secret'),
  );
});

test('guest token secret must be separate from other server credentials', () => {
  const sharedSecret = 'shared-secret-that-is-at-least-32-bytes';
  assert.throws(
    () =>
      parseSyncServerEnvironment(
        environment({ AGENT_SHARED_SECRET: sharedSecret, GUEST_TOKEN_SECRET: sharedSecret }),
      ),
    /different from AGENT_SHARED_SECRET/,
  );
  assert.throws(
    () =>
      parseSyncServerEnvironment(
        environment({
          PERSISTENCE_BACKEND: 'supabase',
          SUPABASE_URL: 'https://example.supabase.co',
          SUPABASE_SERVICE_ROLE_KEY: sharedSecret,
          GUEST_TOKEN_SECRET: sharedSecret,
        }),
      ),
    /different from SUPABASE_SERVICE_ROLE_KEY/,
  );
});
