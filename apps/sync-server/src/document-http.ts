import type { IncomingMessage, ServerResponse } from 'node:http';
import * as Y from 'yjs';
import type { ActorStore } from './actors';
import { authenticateGuestCredential, GuestAuthenticationError } from './authentication';
import { isNewDocumentName } from './document-id';
import type { DocumentStore } from './persistence';

const MAX_REQUEST_BYTES = 16 * 1024;

interface DocumentCreateResponse {
  documentName: string;
  created: boolean;
}

function writeJson(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(value));
}

function bearerToken(request: IncomingMessage): string | null {
  const authorization = request.headers.authorization;
  if (!authorization) return null;
  return /^Bearer ([^\s]+)$/i.exec(authorization)?.[1] ?? null;
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_REQUEST_BYTES) throw new Error('request_too_large');
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
}

export function emptyYjsDocumentState(): Uint8Array {
  const document = new Y.Doc();
  try {
    return Y.encodeStateAsUpdate(document);
  } finally {
    document.destroy();
  }
}

export async function createDocument(
  store: DocumentStore,
  documentName: string,
): Promise<DocumentCreateResponse> {
  const created = await store.createIfAbsent(documentName, emptyYjsDocumentState());
  return { documentName, created };
}

export function createDocumentRequestHandler(
  store: DocumentStore,
  actorStore: ActorStore,
  guestTokenSecret: string,
) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (pathname !== '/documents') return false;

    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Headers': 'authorization, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
      });
      response.end();
      return true;
    }

    if (request.method !== 'POST') {
      writeJson(response, 405, { error: 'method_not_allowed' });
      return true;
    }

    const token = bearerToken(request);
    if (!token) {
      writeJson(response, 401, { error: 'invalid_guest_token' });
      return true;
    }
    try {
      await authenticateGuestCredential(token, guestTokenSecret, actorStore);
    } catch (error) {
      if (
        error instanceof GuestAuthenticationError &&
        error.code === 'identity_validation_unavailable'
      ) {
        console.error('[identity] actor validation unavailable');
        writeJson(response, 503, { error: 'identity_validation_unavailable' });
        return true;
      }
      writeJson(response, 401, { error: 'invalid_guest_token' });
      return true;
    }

    let body: unknown;
    try {
      body = await readJson(request);
    } catch {
      writeJson(response, 400, { error: 'invalid_request' });
      return true;
    }

    const documentName =
      typeof body === 'object' && body !== null && 'documentName' in body
        ? (body as { documentName?: unknown }).documentName
        : undefined;
    if (!isNewDocumentName(documentName)) {
      writeJson(response, 400, { error: 'invalid_document_name' });
      return true;
    }

    try {
      const result = await createDocument(store, documentName);
      writeJson(response, result.created ? 201 : 200, result);
    } catch {
      console.error('[documents] creation failed');
      writeJson(response, 500, { error: 'document_creation_failed' });
    }
    return true;
  };
}
