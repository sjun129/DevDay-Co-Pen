import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { SOURCE_LIMITS, type SourceErrorCode } from '@co-pen/shared';
import type { ActorStore } from './actors';
import { authenticateGuestCredential, GuestAuthenticationError } from './authentication';
import type { DocumentStore } from './persistence';
import {
  extractSourceInWorker,
  INVISIBLE_CONTROLS,
  SourceExtractionError,
  type ExtractedSource,
} from './source-extract';
import type { SourceStore } from './source-store';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_FILE_NAME_LENGTH = 200;
const OVERSIZED_DRAIN_MS = 10_000;
// ponytail: 게스트 토큰과 업로드 요청에 이름이 없어 업로더 이름은 고정값이다. 계약에 이름이 생기면 바꾼다
const UPLOADER_NAME = 'Guest';

const CORS_HEADERS = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };

const ERROR_STATUS: Record<SourceErrorCode, number> = {
  unauthorized: 401,
  document_not_found: 404,
  source_not_found: 404,
  file_too_large: 413,
  too_many_files: 409,
  unsupported_format: 415,
  encrypted_file: 422,
  no_text: 422,
  extraction_failed: 422,
  storage_unavailable: 503,
};

interface SourceRequestHandlerDependencies {
  store: SourceStore | null;
  documentStore: DocumentStore;
  actorStore: ActorStore;
  guestTokenSecret: string;
  /** 목록이 바뀐 방에 sources:changed를 보낸다 */
  broadcastChanged(documentName: string): void;
  extract?: (bytes: Uint8Array, fileName: string) => Promise<ExtractedSource>;
}

function writeJson(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(value));
}

function writeError(response: ServerResponse, code: SourceErrorCode) {
  writeJson(response, ERROR_STATUS[code], { error: code });
}

function bearerToken(request: IncomingMessage): string | null {
  const authorization = request.headers.authorization;
  if (!authorization) return null;
  return /^Bearer ([^\s]+)$/i.exec(authorization)?.[1] ?? null;
}

function sourcesPath(pathname: string): { documentName: string; sourceId: string | null } | null {
  const match = /^\/documents\/([^/]+)\/sources(?:\/([^/]+))?$/.exec(pathname);
  if (!match) return null;
  try {
    return {
      documentName: decodeURIComponent(match[1]!),
      sourceId: match[2] === undefined ? null : decodeURIComponent(match[2]),
    };
  } catch {
    return { documentName: '', sourceId: null };
  }
}

/** 표시용 이름만 남긴다. 경로·제어 문자를 지우고 길이를 줄인다 */
export function sanitizeFileName(header: string | string[] | undefined): string {
  const raw = Array.isArray(header) ? header[0] : header;
  let name = raw ?? '';
  try {
    name = decodeURIComponent(name);
  } catch {
    // 인코딩이 깨졌으면 받은 그대로 정리한다
  }
  name = name
    .split(/[/\\]/)
    .pop()!
    .replace(INVISIBLE_CONTROLS, '')
    .replace(/\s+/g, ' ')
    .trim();
  return name || 'file';
}

/**
 * maxFileBytes를 넘는 순간 읽기를 멈춘다. 넘으면 null.
 * for await에서 빠져나오면 스트림이 파괴되어 소켓이 먼저 끊기고 413 응답이 닿지 않으므로 이벤트로 읽는다.
 */
function readBody(request: IncomingMessage): Promise<Uint8Array | null> {
  const declared = Number(request.headers['content-length']);
  if (Number.isFinite(declared) && declared > SOURCE_LIMITS.maxFileBytes) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const stop = (value: Uint8Array | null) => {
      request.off('data', onData).off('end', onEnd).off('error', onError);
      resolve(value);
    };
    const onData = (chunk: Buffer) => {
      size += chunk.length;
      if (size > SOURCE_LIMITS.maxFileBytes) {
        request.pause();
        stop(null);
      } else {
        chunks.push(chunk);
      }
    };
    const onEnd = () => stop(new Uint8Array(Buffer.concat(chunks)));
    // 업로드 도중 끊긴 요청. 응답은 닿지 않으니 크기 초과와 같은 경로로 닫는다
    const onError = () => stop(null);
    request.on('data', onData).once('end', onEnd).once('error', onError);
  });
}

export function createSourceRequestHandler(dependencies: SourceRequestHandlerDependencies) {
  const extract = dependencies.extract ?? extractSourceInWorker;

  return async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    const route = sourcesPath(pathname);
    if (!route) return false;
    const { documentName, sourceId } = route;

    if (request.method === 'OPTIONS') {
      response.writeHead(204, {
        ...CORS_HEADERS,
        'Access-Control-Allow-Headers': 'authorization, content-type, x-file-name',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      });
      response.end();
      return true;
    }

    const allowed = sourceId === null ? ['GET', 'POST'] : ['DELETE'];
    if (!allowed.includes(request.method ?? '')) {
      writeJson(response, 405, { error: 'method_not_allowed' });
      return true;
    }

    const token = bearerToken(request);
    if (!token) {
      writeError(response, 'unauthorized');
      return true;
    }
    let actorId: string;
    try {
      ({ actorId } = await authenticateGuestCredential(
        token,
        dependencies.guestTokenSecret,
        dependencies.actorStore,
      ));
    } catch (error) {
      if (
        error instanceof GuestAuthenticationError &&
        error.code === 'identity_validation_unavailable'
      ) {
        console.error('[identity] actor validation unavailable');
        writeError(response, 'storage_unavailable');
        return true;
      }
      writeError(response, 'unauthorized');
      return true;
    }

    // 파일 모드에서는 AI 작업과 마찬가지로 자료함을 쓰지 않는다
    const store = dependencies.store;
    if (!store) {
      writeError(response, 'storage_unavailable');
      return true;
    }
    try {
      if (!documentName || !(await dependencies.documentStore.exists(documentName))) {
        writeError(response, 'document_not_found');
        return true;
      }
    } catch {
      console.error('[sources] document_check_failed');
      writeError(response, 'storage_unavailable');
      return true;
    }

    if (request.method === 'GET') {
      try {
        writeJson(response, 200, { sources: await store.listSources(documentName) });
      } catch {
        console.error('[sources] list_failed');
        writeError(response, 'storage_unavailable');
      }
      return true;
    }

    if (request.method === 'DELETE') {
      if (!UUID_PATTERN.test(sourceId!)) {
        writeError(response, 'source_not_found');
        return true;
      }
      try {
        if (!(await store.deleteSource(documentName, sourceId!, actorId, UPLOADER_NAME))) {
          writeError(response, 'source_not_found');
          return true;
        }
      } catch {
        console.error('[sources] delete_failed');
        writeError(response, 'storage_unavailable');
        return true;
      }
      response.writeHead(204, CORS_HEADERS);
      response.end();
      dependencies.broadcastChanged(documentName);
      return true;
    }

    const bytes = await readBody(request);
    if (!bytes) {
      // 읽지 않은 데이터가 남은 채 소켓을 닫으면 RST가 나가 413이 닿지 않는다.
      // 남은 본문은 저장하지 않고 버리며, 오래 보내는 클라이언트는 잠시 뒤 끊는다
      request.resume();
      setTimeout(() => request.destroy(), OVERSIZED_DRAIN_MS).unref();
      writeError(response, 'file_too_large');
      return true;
    }
    if (bytes.length === 0) {
      writeError(response, 'no_text');
      return true;
    }

    try {
      // 추출 전에 확인해 꽉 찬 문서에서 헛수고를 줄인다. 최종 판정은 DB가 잠금 안에서 한다
      if ((await store.listSources(documentName)).length >= SOURCE_LIMITS.maxFilesPerDocument) {
        writeError(response, 'too_many_files');
        return true;
      }
    } catch {
      console.error('[sources] list_failed');
      writeError(response, 'storage_unavailable');
      return true;
    }

    const fileName = sanitizeFileName(request.headers['x-file-name']);
    let extracted: ExtractedSource;
    try {
      extracted = await extract(bytes, fileName);
    } catch (error) {
      const code = error instanceof SourceExtractionError ? error.code : 'extraction_failed';
      console.error(`[sources] ${code}`);
      writeError(response, code);
      return true;
    }

    let created: Awaited<ReturnType<SourceStore['createSource']>>;
    try {
      created = await store.createSource({
        documentName,
        fileName: fileName.slice(0, MAX_FILE_NAME_LENGTH),
        format: extracted.format,
        byteSize: bytes.length,
        charCount: extracted.charCount,
        truncated: extracted.truncated,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        actorId,
        actorName: UPLOADER_NAME,
        chunks: extracted.chunks,
      });
    } catch {
      console.error('[sources] create_failed');
      writeError(response, 'storage_unavailable');
      return true;
    }
    if (created === 'too_many_files') {
      writeError(response, 'too_many_files');
      return true;
    }
    writeJson(response, 201, created);
    dependencies.broadcastChanged(documentName);
    return true;
  };
}
