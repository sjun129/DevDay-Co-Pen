import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeJwt } from 'jose';
import {
  GUEST_TOKEN_AUDIENCE,
  GUEST_TOKEN_ISSUER,
  GUEST_TOKEN_VERSION,
  issueGuestToken,
  verifyGuestToken,
} from './guest-token';

const ACTOR_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SECRET = 'guest-token-secret-that-is-at-least-32-bytes';

test('issued guest token has the required claims and a 30-day expiration', async () => {
  const now = new Date('2026-10-02T00:00:00.000Z');
  const issued = await issueGuestToken(ACTOR_ID, SECRET, { now });
  const claims = decodeJwt(issued.token);

  assert.equal(claims.iss, GUEST_TOKEN_ISSUER);
  assert.equal(claims.aud, GUEST_TOKEN_AUDIENCE);
  assert.equal(claims.sub, ACTOR_ID);
  assert.equal(claims.kind, 'anonymous');
  assert.equal(claims.ver, GUEST_TOKEN_VERSION);
  assert.equal(claims.iat, Math.floor(now.getTime() / 1000));
  assert.equal(claims.exp, claims.iat! + 30 * 24 * 60 * 60);
  assert.equal(issued.expiresAt, new Date(claims.exp! * 1000).toISOString());

  assert.deepEqual(await verifyGuestToken(issued.token, SECRET, now), {
    actorId: ACTOR_ID,
    credentialVersion: 1,
  });
});

test('guest token rejects a non-UUID subject', async () => {
  await assert.rejects(() => issueGuestToken('not-a-uuid', SECRET), /invalid_actor_id/);
});
