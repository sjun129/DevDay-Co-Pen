import assert from 'node:assert/strict';
import test from 'node:test';
import { authenticateDocumentConnection } from './document-access';
import { DEFAULT_AGENT_ACTOR_ID } from './actors';
import { issueGuestToken } from './guest-token';
import type { DocumentStore } from './persistence';

const FULL_DOCUMENT = '11111111-1111-4111-8111-111111111111';
const UNKNOWN_FULL_DOCUMENT = '22222222-2222-4222-8222-222222222222';
const LEGACY_DOCUMENT = 'a1b2c3d4';
const UNKNOWN_LEGACY_DOCUMENT = 'deadbeef';
const ACTOR_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const AGENT_SECRET = 'agent-shared-secret';
const GUEST_SECRET = 'guest-token-secret-that-is-at-least-32-bytes';
const config = { agentSharedSecret: AGENT_SECRET, guestTokenSecret: GUEST_SECRET };

function accessStore(existing: string[]) {
  const documents = new Set(existing);
  let createCalls = 0;
  let existsCalls = 0;
  const store: DocumentStore = {
    async load() {
      return null;
    },
    async save() {},
    async exists(name) {
      existsCalls += 1;
      return documents.has(name);
    },
    async createIfAbsent(name) {
      createCalls += 1;
      if (documents.has(name)) return false;
      documents.add(name);
      return true;
    },
  };
  return {
    store,
    documents,
    createCalls: () => createCalls,
    existsCalls: () => existsCalls,
  };
}

test('guest may join existing full UUID and legacy documents', async () => {
  const fixture = accessStore([FULL_DOCUMENT, LEGACY_DOCUMENT]);
  const { token } = await issueGuestToken(ACTOR_ID, GUEST_SECRET);

  for (const documentName of [FULL_DOCUMENT, LEGACY_DOCUMENT]) {
    assert.deepEqual(
      await authenticateDocumentConnection(token, documentName, config, fixture.store),
      { kind: 'human', actorId: ACTOR_ID, credentialVersion: 1 },
    );
  }
  assert.equal(fixture.createCalls(), 0);
});

test('unknown full UUID and legacy joins are rejected without creating documents', async () => {
  const fixture = accessStore([]);
  const { token } = await issueGuestToken(ACTOR_ID, GUEST_SECRET);

  for (const documentName of [UNKNOWN_FULL_DOCUMENT, UNKNOWN_LEGACY_DOCUMENT]) {
    await assert.rejects(
      () => authenticateDocumentConnection(token, documentName, config, fixture.store),
      (error: { reason?: string }) => error.reason === 'document_not_found',
    );
  }
  assert.equal(fixture.documents.size, 0);
  assert.equal(fixture.createCalls(), 0);
});

test('invalid guest token is rejected before document existence is checked', async () => {
  const fixture = accessStore([FULL_DOCUMENT]);

  for (const token of ['invalid-token', 'guest']) {
    await assert.rejects(
      () => authenticateDocumentConnection(token, FULL_DOCUMENT, config, fixture.store),
      (error: { reason?: string }) => error.reason === 'invalid_guest_token',
    );
  }
  assert.equal(fixture.existsCalls(), 0);
  assert.equal(fixture.createCalls(), 0);
});

test('agent may join an existing document but cannot create an unknown document', async () => {
  const fixture = accessStore([FULL_DOCUMENT]);

  assert.deepEqual(
    await authenticateDocumentConnection(AGENT_SECRET, FULL_DOCUMENT, config, fixture.store),
    { kind: 'agent', actorId: DEFAULT_AGENT_ACTOR_ID, credentialVersion: 1 },
  );
  await assert.rejects(
    () =>
      authenticateDocumentConnection(
        AGENT_SECRET,
        UNKNOWN_FULL_DOCUMENT,
        config,
        fixture.store,
      ),
    (error: { reason?: string }) => error.reason === 'document_not_found',
  );
  assert.equal(fixture.createCalls(), 0);
  assert.deepEqual([...fixture.documents], [FULL_DOCUMENT]);
});
