import assert from 'node:assert/strict';
import test from 'node:test';
import { SignJWT } from 'jose';
import { DEFAULT_AGENT_ACTOR_ID } from './actors';
import { authenticateConnection } from './authentication';
import {
  GUEST_TOKEN_AUDIENCE,
  GUEST_TOKEN_ISSUER,
  issueGuestToken,
} from './guest-token';

const ACTOR_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const AGENT_SECRET = 'agent-shared-secret';
const GUEST_SECRET = 'guest-token-secret-that-is-at-least-32-bytes';
const OTHER_SECRET = 'other-guest-secret-that-is-at-least-32-bytes';
const config = { agentSharedSecret: AGENT_SECRET, guestTokenSecret: GUEST_SECRET };

async function customToken(
  claims: { issuer?: string; audience?: string; version?: number; expiresAt?: number } = {},
) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ kind: 'anonymous', ver: claims.version ?? 1 })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(claims.issuer ?? GUEST_TOKEN_ISSUER)
    .setAudience(claims.audience ?? GUEST_TOKEN_AUDIENCE)
    .setSubject(ACTOR_ID)
    .setIssuedAt(now)
    .setExpirationTime(claims.expiresAt ?? now + 60)
    .sign(new TextEncoder().encode(GUEST_SECRET));
}

test('valid guest token authenticates an anonymous human actor', async () => {
  const { token } = await issueGuestToken(ACTOR_ID, GUEST_SECRET);
  assert.deepEqual(await authenticateConnection(token, config), {
    kind: 'human',
    actorId: ACTOR_ID,
    credentialVersion: 1,
  });
});

test('valid agent secret authenticates the deterministic agent actor', async () => {
  assert.deepEqual(await authenticateConnection(AGENT_SECRET, config), {
    kind: 'agent',
    actorId: DEFAULT_AGENT_ACTOR_ID,
    credentialVersion: 1,
  });
});

test('invalid guest credentials are rejected', async (context) => {
  const invalidSignature = (await issueGuestToken(ACTOR_ID, OTHER_SECRET)).token;
  const cases: Array<[string, string]> = [
    ['invalid signature', invalidSignature],
    ['expired token', await customToken({ expiresAt: Math.floor(Date.now() / 1000) - 1 })],
    ['wrong issuer', await customToken({ issuer: 'wrong-issuer' })],
    ['wrong audience', await customToken({ audience: 'wrong-audience' })],
    ['wrong version', await customToken({ version: 2 })],
    ['missing token', ''],
    ['literal guest', 'guest'],
    ['random string', 'random-string'],
  ];

  for (const [name, token] of cases) {
    await context.test(name, async () => {
      await assert.rejects(() => authenticateConnection(token, config), /invalid_guest_token/);
    });
  }
});
