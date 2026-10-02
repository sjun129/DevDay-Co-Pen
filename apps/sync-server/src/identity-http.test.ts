import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import type { ActorStore } from './actors';
import { verifyGuestToken } from './guest-token';
import { createGuestIdentity, createIdentityRequestHandler } from './identity-http';

const ACTOR_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SECRET = 'guest-token-secret-that-is-at-least-32-bytes';

async function withIdentityServer<T>(actorStore: ActorStore, run: (origin: string) => Promise<T>) {
  const handler = createIdentityRequestHandler(actorStore, SECRET);
  const server = createServer(async (request, response) => {
    if (!(await handler(request, response))) {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  try {
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

test('POST /identity/guest inserts an actor before returning a valid credential', async () => {
  const insertedActors: string[] = [];
  const actorStore: ActorStore = {
    async createAnonymousActor() {
      insertedActors.push(ACTOR_ID);
      return ACTOR_ID;
    },
  };

  await withIdentityServer(actorStore, async (origin) => {
    const response = await fetch(`${origin}/identity/guest`, { method: 'POST' });
    const body = (await response.json()) as {
      actorId: string;
      token: string;
      expiresAt: string;
    };

    assert.equal(response.status, 201);
    assert.deepEqual(insertedActors, [ACTOR_ID]);
    assert.equal(body.actorId, ACTOR_ID);
    assert.ok(body.token);
    assert.ok(Date.parse(body.expiresAt));
    assert.deepEqual(await verifyGuestToken(body.token, SECRET), {
      actorId: ACTOR_ID,
      credentialVersion: 1,
    });
  });
});

test('actor insert failure prevents token issuance', async () => {
  let tokenIssuerCalled = false;
  const actorStore: ActorStore = {
    async createAnonymousActor() {
      throw new Error('database_unavailable');
    },
  };

  await assert.rejects(() =>
    createGuestIdentity(actorStore, SECRET, async () => {
      tokenIssuerCalled = true;
      throw new Error('must_not_run');
    }),
  );
  assert.equal(tokenIssuerCalled, false);

  await withIdentityServer(actorStore, async (origin) => {
    const response = await fetch(`${origin}/identity/guest`, { method: 'POST' });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'identity_creation_failed' });
  });
});
