import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDocumentAndNavigate,
  createSingleFlightDocumentCreator,
  DocumentCreateRequestError,
  type DocumentCreationFlowDependencies,
} from './documents';

const DOCUMENT_NAME = 'abcdef12-3456-4abc-8def-1234567890ab';

function dependencies(
  overrides: Partial<DocumentCreationFlowDependencies> = {},
): DocumentCreationFlowDependencies {
  return {
    createUuid: () => DOCUMENT_NAME,
    getToken: async () => 'guest-token',
    request: async (documentName) => ({ documentName, created: true }),
    ...overrides,
  };
}

test('new document flow uses a full UUID and navigates only after create succeeds', async () => {
  const events: string[] = [];
  const documentName = await createDocumentAndNavigate(
    (path) => events.push(`navigate:${path}`),
    dependencies({
      request: async (name) => {
        events.push(`create:${name}`);
        return { documentName: name, created: true };
      },
    }),
  );

  assert.equal(documentName, DOCUMENT_NAME);
  assert.equal(documentName.length, 36);
  assert.deepEqual(events, [`create:${DOCUMENT_NAME}`, `navigate:/d/${DOCUMENT_NAME}`]);
});

test('create failure does not navigate', async () => {
  let navigations = 0;
  await assert.rejects(() =>
    createDocumentAndNavigate(
      () => {
        navigations += 1;
      },
      dependencies({
        request: async () => {
          throw new DocumentCreateRequestError(500, 'document_creation_failed');
        },
      }),
    ),
  );
  assert.equal(navigations, 0);
});

test('401 refreshes the token once and retries the same UUID', async () => {
  const tokenRequests: boolean[] = [];
  const creates: Array<[string, string]> = [];
  const navigations: string[] = [];
  let requestCount = 0;

  await createDocumentAndNavigate(
    (path) => navigations.push(path),
    dependencies({
      getToken: async (forceRefresh = false) => {
        tokenRequests.push(forceRefresh);
        return forceRefresh ? 'fresh-token' : 'expired-token';
      },
      request: async (name, token) => {
        creates.push([name, token]);
        requestCount += 1;
        if (requestCount === 1) {
          throw new DocumentCreateRequestError(401, 'invalid_guest_token');
        }
        return { documentName: name, created: true };
      },
    }),
  );

  assert.deepEqual(tokenRequests, [false, true]);
  assert.deepEqual(creates, [
    [DOCUMENT_NAME, 'expired-token'],
    [DOCUMENT_NAME, 'fresh-token'],
  ]);
  assert.deepEqual(navigations, [`/d/${DOCUMENT_NAME}`]);
});

test('a second 401 stops without navigation or an infinite retry', async () => {
  let tokenRequests = 0;
  let createRequests = 0;
  let navigations = 0;

  await assert.rejects(
    () =>
      createDocumentAndNavigate(
        () => {
          navigations += 1;
        },
        dependencies({
          getToken: async () => {
            tokenRequests += 1;
            return `token-${tokenRequests}`;
          },
          request: async () => {
            createRequests += 1;
            throw new DocumentCreateRequestError(401, 'invalid_guest_token');
          },
        }),
      ),
    /invalid_guest_token/,
  );

  assert.equal(tokenRequests, 2);
  assert.equal(createRequests, 2);
  assert.equal(navigations, 0);
});

test('single-flight creator collapses double clicks into one create and navigation', async () => {
  let createRequests = 0;
  let navigations = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const creator = createSingleFlightDocumentCreator(
    () => {
      navigations += 1;
    },
    dependencies({
      request: async (name) => {
        createRequests += 1;
        await gate;
        return { documentName: name, created: true };
      },
    }),
  );

  const first = creator();
  const second = creator();
  assert.strictEqual(first, second);
  release();
  await Promise.all([first, second]);

  assert.equal(createRequests, 1);
  assert.equal(navigations, 1);
});
