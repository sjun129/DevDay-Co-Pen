import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createServer, request as httpRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { SOURCE_LIMITS, type DocumentSource } from '@co-pen/shared';
import type { ActorStore } from './actors';
import { issueGuestToken } from './guest-token';
import type { DocumentStore } from './persistence';
import { extractSourceText } from './source-extract';
import { createSourceRequestHandler, sanitizeFileName } from './source-http';
import type { CreateSourceInput, SourceStore } from './source-store';

const DOCUMENT_NAME = '22222222-2222-4222-8222-222222222222';
const OTHER_DOCUMENT = '33333333-3333-4333-8333-333333333333';
const ACTOR_ID = '44444444-4444-4444-8444-444444444444';
const GUEST_SECRET = 'guest-token-secret-that-is-at-least-32-bytes';

class MemorySourceStore implements SourceStore {
  readonly sources: Array<DocumentSource & { documentName: string; deleted: boolean; input: CreateSourceInput }> = [];

  async listSources(documentName: string) {
    return this.sources
      .filter((source) => source.documentName === documentName && !source.deleted)
      .map(({ documentName: _document, deleted: _deleted, input: _input, ...source }) => source);
  }

  async createSource(input: CreateSourceInput) {
    if ((await this.listSources(input.documentName)).length >= SOURCE_LIMITS.maxFilesPerDocument) {
      return 'too_many_files' as const;
    }
    const source = {
      id: randomUUID(),
      number: this.sources.filter((item) => item.documentName === input.documentName).length + 1,
      fileName: input.fileName,
      format: input.format,
      byteSize: input.byteSize,
      charCount: input.charCount,
      truncated: input.truncated,
      uploadedBy: input.actorName,
      createdAt: '2026-10-06T00:00:00.000Z',
    };
    this.sources.push({ ...source, documentName: input.documentName, deleted: false, input });
    return source;
  }

  async deleteSource(documentName: string, sourceId: string) {
    const source = this.sources.find(
      (item) => item.id === sourceId && item.documentName === documentName && !item.deleted,
    );
    if (!source) return false;
    source.deleted = true;
    return true;
  }

  async listChunks() {
    return [];
  }
}

function documents(): DocumentStore {
  return {
    async load() {
      return null;
    },
    async save() {},
    async exists(name) {
      return name === DOCUMENT_NAME;
    },
    async createIfAbsent() {
      return false;
    },
  };
}

function actors(): ActorStore {
  return {
    async createAnonymousActor() {
      return ACTOR_ID;
    },
    async anonymousActorExists() {
      return true;
    },
  };
}

async function withServer(
  store: SourceStore | null,
  run: (origin: string, broadcasts: string[]) => Promise<void>,
) {
  const broadcasts: string[] = [];
  const handler = createSourceRequestHandler({
    store,
    documentStore: documents(),
    actorStore: actors(),
    guestTokenSecret: GUEST_SECRET,
    broadcastChanged: (documentName) => void broadcasts.push(documentName),
    extract: extractSourceText,
  });
  const server = createServer(async (request, response) => {
    if (!(await handler(request, response))) response.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  try {
    await run(`http://127.0.0.1:${port}`, broadcasts);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

async function upload(origin: string, token: string, body: Uint8Array, fileName = 'note.txt') {
  return fetch(`${origin}/documents/${DOCUMENT_NAME}/sources`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/octet-stream',
      'x-file-name': encodeURIComponent(fileName),
    },
    body,
  });
}

const utf8 = (text: string) => new TextEncoder().encode(text);

test('preflight allows browser uploads and deletes', async () => {
  await withServer(new MemorySourceStore(), async (origin) => {
    const response = await fetch(`${origin}/documents/${DOCUMENT_NAME}/sources/abc`, {
      method: 'OPTIONS',
    });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.equal(response.headers.get('access-control-allow-methods'), 'GET, POST, DELETE, OPTIONS');
    assert.equal(
      response.headers.get('access-control-allow-headers'),
      'authorization, content-type, x-file-name',
    );
  });
});

test('authenticates first, then requires storage and an existing document', async () => {
  const { token } = await issueGuestToken(ACTOR_ID, GUEST_SECRET);
  await withServer(new MemorySourceStore(), async (origin) => {
    const missingAuth = await fetch(`${origin}/documents/${DOCUMENT_NAME}/sources`);
    assert.equal(missingAuth.status, 401);
    assert.equal(missingAuth.headers.get('access-control-allow-origin'), '*');
    assert.deepEqual(await missingAuth.json(), { error: 'unauthorized' });

    const badToken = await fetch(`${origin}/documents/${DOCUMENT_NAME}/sources`, {
      headers: { authorization: 'Bearer nope' },
    });
    assert.equal(badToken.status, 401);

    const unknown = await fetch(`${origin}/documents/${OTHER_DOCUMENT}/sources`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.deepEqual(await unknown.json(), { error: 'document_not_found' });
  });
  await withServer(null, async (origin) => {
    const response = await upload(origin, token, utf8('자료'));
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'storage_unavailable' });
  });
});

test('upload, list and delete round trip with change broadcasts', async () => {
  const { token } = await issueGuestToken(ACTOR_ID, GUEST_SECRET);
  const store = new MemorySourceStore();
  await withServer(store, async (origin, broadcasts) => {
    const body = utf8('첫 문단\n둘째 문단');
    const created = await upload(origin, token, body, '../../보고서.md');
    assert.equal(created.status, 201);
    assert.equal(created.headers.get('access-control-allow-origin'), '*');
    const source = (await created.json()) as DocumentSource;
    assert.equal(source.number, 1);
    assert.equal(source.fileName, '보고서.md');
    assert.equal(source.format, 'md');
    assert.equal(source.byteSize, body.length);
    assert.equal(store.sources[0]!.input.sha256, createHash('sha256').update(body).digest('hex'));
    assert.deepEqual(store.sources[0]!.input.chunks, ['첫 문단\n둘째 문단']);
    assert.deepEqual(broadcasts, [DOCUMENT_NAME]);

    const listed = await fetch(`${origin}/documents/${DOCUMENT_NAME}/sources`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.deepEqual(((await listed.json()) as { sources: DocumentSource[] }).sources, [source]);

    const remove = () =>
      fetch(`${origin}/documents/${DOCUMENT_NAME}/sources/${source.id}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}` },
      });
    const deleted = await remove();
    assert.equal(deleted.status, 204);
    assert.equal(deleted.headers.get('access-control-allow-origin'), '*');
    assert.deepEqual(broadcasts, [DOCUMENT_NAME, DOCUMENT_NAME]);
    assert.deepEqual(await (await remove()).json(), { error: 'source_not_found' });

    const invalidId = await fetch(`${origin}/documents/${DOCUMENT_NAME}/sources/not-a-uuid`, {
      method: 'DELETE',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(invalidId.status, 404);
    assert.equal(broadcasts.length, 2);
  });
});

test('rejects empty, unsupported and over-limit uploads without storing', async () => {
  const { token } = await issueGuestToken(ACTOR_ID, GUEST_SECRET);
  const store = new MemorySourceStore();
  await withServer(store, async (origin, broadcasts) => {
    const empty = await upload(origin, token, new Uint8Array());
    assert.equal(empty.status, 422);
    assert.deepEqual(await empty.json(), { error: 'no_text' });

    const binary = await upload(origin, token, utf8('MZ binary'), 'tool.exe');
    assert.equal(binary.status, 415);
    assert.deepEqual(await binary.json(), { error: 'unsupported_format' });

    for (let index = 0; index < SOURCE_LIMITS.maxFilesPerDocument; index += 1) {
      assert.equal((await upload(origin, token, utf8(`자료 ${index}`))).status, 201);
    }
    const full = await upload(origin, token, utf8('하나 더'));
    assert.equal(full.status, 409);
    assert.deepEqual(await full.json(), { error: 'too_many_files' });
    assert.equal(store.sources.length, SOURCE_LIMITS.maxFilesPerDocument);
    assert.equal(broadcasts.length, SOURCE_LIMITS.maxFilesPerDocument);
  });
});

test('stops reading an oversized body and answers file_too_large', async () => {
  const { token } = await issueGuestToken(ACTOR_ID, GUEST_SECRET);
  const store = new MemorySourceStore();
  await withServer(store, async (origin) => {
    // fetch는 응답 전에 본문을 다 보내려 해서, 끊긴 연결에서도 응답을 받는 http 요청으로 확인한다
    const { status, body } = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const request = httpRequest(
        `${origin}/documents/${DOCUMENT_NAME}/sources`,
        {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'x-file-name': 'big.txt' },
        },
        (response) => {
          let text = '';
          response.setEncoding('utf8');
          response.on('data', (chunk: string) => (text += chunk));
          response.on('end', () => resolve({ status: response.statusCode ?? 0, body: text }));
        },
      );
      request.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code !== 'EPIPE' && error.code !== 'ECONNRESET') reject(error);
      });
      // content-length 없이 조금씩 보내 서버가 읽는 도중 상한을 넘기게 한다
      const piece = Buffer.alloc(1024 * 1024, 0x61);
      let sent = 0;
      const pump = () => {
        while (sent <= SOURCE_LIMITS.maxFileBytes + piece.length * 4) {
          sent += piece.length;
          if (!request.write(piece)) return void request.once('drain', pump);
        }
        request.end();
      };
      pump();
    });
    assert.equal(status, 413);
    assert.deepEqual(JSON.parse(body), { error: 'file_too_large' });
    assert.equal(store.sources.length, 0);

    const declared = await new Promise<number>((resolve, reject) => {
      const request = httpRequest(
        `${origin}/documents/${DOCUMENT_NAME}/sources`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${token}`,
            'content-length': String(SOURCE_LIMITS.maxFileBytes + 1),
          },
        },
        (response) => {
          response.resume();
          resolve(response.statusCode ?? 0);
        },
      );
      request.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code !== 'EPIPE' && error.code !== 'ECONNRESET') reject(error);
      });
      request.write('a');
    });
    assert.equal(declared, 413);
  });
});

test('file names lose paths, controls and bidi marks', () => {
  assert.equal(sanitizeFileName(encodeURIComponent('C:\\Users\\me\\자료.pdf')), '자료.pdf');
  assert.equal(sanitizeFileName(`a${String.fromCodePoint(0x202e)}fdp.txt`), 'afdp.txt');
  assert.equal(sanitizeFileName('%E0%A4%A'), '%E0%A4%A');
  assert.equal(sanitizeFileName(undefined), 'file');
  assert.equal(sanitizeFileName('..%2F'), 'file');
});
