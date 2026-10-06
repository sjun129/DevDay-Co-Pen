import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import * as Y from 'yjs';
import { isNewDocumentName } from './document-id';
import { createDocumentRequestHandler } from './document-http';
import { issueGuestToken } from './guest-token';
import type { DocumentStore } from './persistence';

const DOCUMENT_NAME = 'abcdef12-3456-4abc-8def-1234567890ab';
const ACTOR_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SECRET = 'guest-token-secret-that-is-at-least-32-bytes';

class MemoryDocumentStore implements DocumentStore {
  readonly documents = new Map<string, Uint8Array>();
  failCreate = false;

  async load(name: string) {
    return this.documents.get(name) ?? null;
  }

  async save(name: string, state: Uint8Array) {
    this.documents.set(name, state.slice());
  }

  async exists(name: string) {
    return this.documents.has(name);
  }

  async createIfAbsent(name: string, initialState: Uint8Array) {
    if (this.failCreate) throw new Error('database_unavailable');
    if (this.documents.has(name)) return false;
    this.documents.set(name, initialState.slice());
    return true;
  }
}

async function withDocumentServer<T>(store: DocumentStore, run: (origin: string) => Promise<T>) {
  const handler = createDocumentRequestHandler(store, SECRET);
  const server = createServer(async (request, response) => {
    if (!(await handler(request, response))) response.writeHead(404).end();
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

async function postDocument(origin: string, token: string | null, body: string) {
  return fetch(`${origin}/documents`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body,
  });
}

test('new document names require a canonical lowercase UUID v4', () => {
  assert.equal(isNewDocumentName(DOCUMENT_NAME), true);
  assert.equal(isNewDocumentName('a1b2c3d4'), false);
  assert.equal(isNewDocumentName('random-document'), false);
  assert.equal(isNewDocumentName(''), false);
  assert.equal(isNewDocumentName('11111111-1111-1111-8111-111111111111'), false);
  assert.equal(isNewDocumentName(DOCUMENT_NAME.toUpperCase()), false);
});

test('POST /documents creates valid empty Yjs state and is idempotent', async () => {
  const store = new MemoryDocumentStore();
  const { token } = await issueGuestToken(ACTOR_ID, SECRET);

  await withDocumentServer(store, async (origin) => {
    const first = await postDocument(origin, token, JSON.stringify({ documentName: DOCUMENT_NAME }));
    assert.equal(first.status, 201);
    assert.deepEqual(await first.json(), { documentName: DOCUMENT_NAME, created: true });

    const initialState = (await store.load(DOCUMENT_NAME))!;
    assert.ok(initialState.byteLength > 0);
    const base64 = Buffer.from(initialState).toString('base64');
    const restored = new Y.Doc();
    assert.doesNotThrow(() => Y.applyUpdate(restored, Buffer.from(base64, 'base64')));
    assert.deepEqual(Y.encodeStateAsUpdate(restored), initialState);
    restored.destroy();

    const preserved = initialState.slice();
    const second = await postDocument(origin, token, JSON.stringify({ documentName: DOCUMENT_NAME }));
    assert.equal(second.status, 200);
    assert.deepEqual(await second.json(), { documentName: DOCUMENT_NAME, created: false });
    assert.deepEqual(await store.load(DOCUMENT_NAME), preserved);
    assert.equal(store.documents.size, 1);
  });
});

test('POST /documents rejects invalid guest credentials', async (context) => {
  const store = new MemoryDocumentStore();
  const expired = (
    await issueGuestToken(ACTOR_ID, SECRET, { expiresInSeconds: -1 })
  ).token;
  const cases: Array<[string, string | null]> = [
    ['invalid token', 'invalid-token'],
    ['expired token', expired],
    ['literal guest', 'guest'],
    ['missing authorization', null],
  ];

  await withDocumentServer(store, async (origin) => {
    for (const [name, token] of cases) {
      await context.test(name, async () => {
        const response = await postDocument(
          origin,
          token,
          JSON.stringify({ documentName: DOCUMENT_NAME }),
        );
        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), { error: 'invalid_guest_token' });
      });
    }
    assert.equal(store.documents.size, 0);
  });
});

test('POST /documents rejects malformed bodies and non-UUID creation names', async () => {
  const store = new MemoryDocumentStore();
  const { token } = await issueGuestToken(ACTOR_ID, SECRET);
  const invalidBodies = [
    '{',
    JSON.stringify({}),
    JSON.stringify({ documentName: '' }),
    JSON.stringify({ documentName: 'a1b2c3d4' }),
    JSON.stringify({ documentName: 'not-a-uuid' }),
    JSON.stringify({ documentName: '11111111-1111-1111-8111-111111111111' }),
  ];

  await withDocumentServer(store, async (origin) => {
    for (const body of invalidBodies) {
      const response = await postDocument(origin, token, body);
      assert.equal(response.status, 400);
    }
    assert.equal(store.documents.size, 0);
  });
});

test('document create failure never reports a partial success', async () => {
  const store = new MemoryDocumentStore();
  store.failCreate = true;
  const { token } = await issueGuestToken(ACTOR_ID, SECRET);

  await withDocumentServer(store, async (origin) => {
    const response = await postDocument(
      origin,
      token,
      JSON.stringify({ documentName: DOCUMENT_NAME }),
    );
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'document_creation_failed' });
    assert.equal(store.documents.size, 0);
  });
});
