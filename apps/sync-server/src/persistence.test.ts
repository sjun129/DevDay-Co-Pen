import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import * as Y from 'yjs';
import type { SyncServerEnvironment } from './config';
import { createDocumentStore } from './persistence';

const DOCUMENT_NAME = 'abcdef12-3456-4abc-8def-1234567890ab';

function fileEnvironment(localDataDir: string): SyncServerEnvironment {
  return {
    appEnvironment: 'development',
    persistenceBackend: 'file',
    port: 1234,
    agentWorkerUrl: 'http://localhost:1235',
    agentSharedSecret: 'agent-secret',
    guestTokenSecret: 'guest-token-secret-that-is-at-least-32-bytes',
    localDataDir,
  };
}

test('file document store creates atomically and preserves an existing state', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'co-pen-documents-'));
  try {
    const store = createDocumentStore(fileEnvironment(tempDir));
    const initialDocument = new Y.Doc();
    const initialState = Y.encodeStateAsUpdate(initialDocument);
    initialDocument.destroy();

    assert.equal(await store.exists(DOCUMENT_NAME), false);
    await assert.rejects(() => store.save(DOCUMENT_NAME, initialState), /ENOENT/);
    assert.equal(await store.exists(DOCUMENT_NAME), false);
    assert.equal(await store.createIfAbsent(DOCUMENT_NAME, initialState), true);
    assert.equal(await store.exists(DOCUMENT_NAME), true);

    const replacement = new Uint8Array([1, 2, 3]);
    assert.equal(await store.createIfAbsent(DOCUMENT_NAME, replacement), false);
    assert.deepEqual([...(await store.load(DOCUMENT_NAME))!], [...initialState]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
