import { getOrCreateGuestToken } from './identity';

const SYNC_SERVER_URL = process.env.NEXT_PUBLIC_SYNC_SERVER_URL ?? 'ws://localhost:1234';

export interface DocumentCreateResult {
  documentName: string;
  created: boolean;
}

export class DocumentCreateRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

function documentsUrl(): string {
  const url = new URL('/documents', SYNC_SERVER_URL);
  url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
  return url.toString();
}

export async function requestDocumentCreation(
  documentName: string,
  token: string,
): Promise<DocumentCreateResult> {
  const response = await fetch(documentsUrl(), {
    method: 'POST',
    cache: 'no-store',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ documentName }),
  });

  const body = (await response.json().catch(() => null)) as Partial<DocumentCreateResult> & {
    error?: unknown;
  } | null;
  if (!response.ok) {
    throw new DocumentCreateRequestError(
      response.status,
      typeof body?.error === 'string' ? body.error : 'document_creation_failed',
    );
  }
  if (
    body?.documentName !== documentName ||
    (response.status !== 200 && response.status !== 201) ||
    typeof body.created !== 'boolean'
  ) {
    throw new DocumentCreateRequestError(response.status, 'invalid_document_response');
  }
  return { documentName: body.documentName, created: body.created };
}

export interface DocumentCreationFlowDependencies {
  createUuid(): string;
  getToken(forceRefresh?: boolean): Promise<string>;
  request(documentName: string, token: string): Promise<DocumentCreateResult>;
}

const defaultDependencies: DocumentCreationFlowDependencies = {
  createUuid: () => crypto.randomUUID(),
  getToken: getOrCreateGuestToken,
  request: requestDocumentCreation,
};

export async function createDocumentAndNavigate(
  navigate: (path: string) => void,
  dependencies: DocumentCreationFlowDependencies = defaultDependencies,
): Promise<string> {
  const documentName = dependencies.createUuid();
  let token = await dependencies.getToken();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await dependencies.request(documentName, token);
      navigate(`/d/${encodeURIComponent(documentName)}`);
      return documentName;
    } catch (error) {
      const shouldRefresh =
        attempt === 0 &&
        error instanceof DocumentCreateRequestError &&
        error.status === 401 &&
        error.code === 'invalid_guest_token';
      if (!shouldRefresh) throw error;
      token = await dependencies.getToken(true);
    }
  }

  throw new Error('document_creation_failed');
}

export function createSingleFlightDocumentCreator(
  navigate: (path: string) => void,
  dependencies: DocumentCreationFlowDependencies = defaultDependencies,
) {
  let pending: Promise<string> | null = null;
  return () => {
    if (!pending) {
      pending = createDocumentAndNavigate(navigate, dependencies).finally(() => {
        pending = null;
      });
    }
    return pending;
  };
}
