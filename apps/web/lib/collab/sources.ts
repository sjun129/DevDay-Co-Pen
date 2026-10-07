import {
  SOURCE_ERROR_MESSAGES,
  SOURCE_FORMATS,
  SOURCE_LIMITS,
  type DocumentSource,
  type SourceErrorCode,
  type SourceFormat,
} from '@co-pen/shared';

/** <input type="file"> accept 값 */
export const SOURCE_ACCEPT = SOURCE_FORMATS.map((format) => `.${format}`).join(',');

const UNKNOWN_ERROR_MESSAGE = '자료함 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.';
const NETWORK_ERROR_MESSAGE = '동기화 서버에 연결하지 못했어요. 연결 상태를 확인해 주세요.';

export class SourceRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

export function sourceFormatOf(fileName: string): SourceFormat | null {
  const dot = fileName.lastIndexOf('.');
  if (dot < 0) return null;
  const extension = fileName.slice(dot + 1).toLowerCase();
  return (SOURCE_FORMATS as readonly string[]).includes(extension) ? (extension as SourceFormat) : null;
}

/** 업로드 전 브라우저 검사. 헛걸음만 줄이는 용도이고 최종 판정은 서버가 한다. */
export function validateSourceFile(
  file: { name: string; size: number },
  existingCount: number,
): SourceErrorCode | null {
  if (!sourceFormatOf(file.name)) return 'unsupported_format';
  if (file.size > SOURCE_LIMITS.maxFileBytes) return 'file_too_large';
  if (file.size === 0) return 'no_text';
  if (existingCount >= SOURCE_LIMITS.maxFilesPerDocument) return 'too_many_files';
  return null;
}

function isSourceErrorCode(code: string): code is SourceErrorCode {
  return Object.hasOwn(SOURCE_ERROR_MESSAGES, code);
}

/** SourceRequestError가 아니면 fetch 자체가 실패한 것(서버 꺼짐, CORS 등)으로 본다 */
export function sourceErrorMessage(error: unknown): string {
  if (!(error instanceof SourceRequestError)) return NETWORK_ERROR_MESSAGE;
  return isSourceErrorCode(error.code) ? SOURCE_ERROR_MESSAGES[error.code] : UNKNOWN_ERROR_MESSAGE;
}

export async function sourceResponseError(response: Response): Promise<SourceRequestError> {
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return new SourceRequestError(
    response.status,
    typeof body?.error === 'string' ? body.error : 'request_failed',
  );
}

function isDocumentSource(value: unknown): value is DocumentSource {
  if (typeof value !== 'object' || value === null) return false;
  const source = value as Record<string, unknown>;
  return (
    typeof source.id === 'string' &&
    Number.isInteger(source.number) &&
    typeof source.fileName === 'string' &&
    typeof source.format === 'string' &&
    (SOURCE_FORMATS as readonly string[]).includes(source.format) &&
    typeof source.byteSize === 'number' &&
    typeof source.charCount === 'number' &&
    typeof source.truncated === 'boolean' &&
    typeof source.uploadedBy === 'string' &&
    typeof source.createdAt === 'string'
  );
}

/** GET 응답 본문 → 번호 순 목록. 모양이 틀린 항목은 버리고, 목록 자체가 없으면 실패로 본다. */
export function parseSourceList(value: unknown): DocumentSource[] {
  const sources = (value as { sources?: unknown } | null)?.sources;
  if (!Array.isArray(sources)) throw new SourceRequestError(200, 'invalid_response');
  return sources.filter(isDocumentSource).sort((a, b) => a.number - b.number);
}
