import assert from 'node:assert/strict';
import test from 'node:test';
import { getOrCreateGuestToken, refreshGuestTokenOnce } from './identity';

test('missing-actor authentication failure refreshes the guest credential exactly once', async () => {
  const state = { attempted: false };
  const calls: boolean[] = [];
  const refresh = async (forceRefresh: boolean) => {
    calls.push(forceRefresh);
    return 'fresh-token';
  };

  assert.equal(await refreshGuestTokenOnce('invalid_guest_token', state, refresh), 'fresh-token');
  await assert.rejects(
    () => refreshGuestTokenOnce('invalid_guest_token', state, refresh),
    /guest_identity_refresh_exhausted/,
  );
  assert.deepEqual(calls, [true]);
});

test('identity validation outage does not discard or refresh the stored credential', async () => {
  const state = { attempted: false };
  let refreshCalls = 0;
  await assert.rejects(
    () =>
      refreshGuestTokenOnce('identity_validation_unavailable', state, async () => {
        refreshCalls += 1;
        return 'must-not-be-issued';
      }),
    /guest_identity_not_refreshable/,
  );
  assert.equal(state.attempted, false);
  assert.equal(refreshCalls, 0);
});

test('forced recovery removes the stale token and requests one replacement identity', async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map([['co-pen:guest-token', 'stale-token']]);
  const storageOperations: string[] = [];
  let fetchCalls = 0;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem(key: string) {
        return values.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        storageOperations.push(`set:${key}`);
        values.set(key, value);
      },
      removeItem(key: string) {
        storageOperations.push(`remove:${key}`);
        values.delete(key);
      },
    },
  });
  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response(
      JSON.stringify({
        token: 'fresh-token',
        actorId: '11111111-1111-4111-8111-111111111111',
        expiresAt: '2026-11-01T00:00:00.000Z',
      }),
      { status: 201, headers: { 'content-type': 'application/json' } },
    );
  };

  try {
    assert.equal(await getOrCreateGuestToken(true), 'fresh-token');
    assert.equal(fetchCalls, 1);
    assert.deepEqual(storageOperations, [
      'remove:co-pen:guest-token',
      'set:co-pen:guest-token',
    ]);
    assert.equal(values.get('co-pen:guest-token'), 'fresh-token');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else delete (globalThis as { localStorage?: unknown }).localStorage;
  }
});
