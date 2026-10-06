const DOCUMENT_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isNewDocumentName(value: unknown): value is string {
  return typeof value === 'string' && DOCUMENT_UUID_PATTERN.test(value);
}
