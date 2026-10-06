import { authenticateConnection, type AuthenticationConfig, type ConnectionContext } from './authentication';
import type { DocumentStore } from './persistence';

export class DocumentConnectionError extends Error {
  readonly reason: string;

  constructor(reason: string) {
    super(reason);
    this.reason = reason;
  }
}

export async function authenticateDocumentConnection(
  token: string,
  documentName: string,
  config: AuthenticationConfig,
  store: DocumentStore,
): Promise<ConnectionContext> {
  let context: ConnectionContext;
  try {
    context = await authenticateConnection(token, config);
  } catch {
    throw new DocumentConnectionError('invalid_guest_token');
  }

  try {
    if (!(await store.exists(documentName))) {
      throw new DocumentConnectionError('document_not_found');
    }
  } catch (error) {
    if (error instanceof DocumentConnectionError) throw error;
    console.error('[documents] existence check failed');
    throw new DocumentConnectionError('document_access_unavailable');
  }

  return context;
}
