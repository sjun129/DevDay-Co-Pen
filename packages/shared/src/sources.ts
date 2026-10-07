/**
 * 자료함 (RAG). 팀이 문서마다 올린 자료 파일에서 텍스트만 뽑아 저장하고,
 * AI가 글을 쓸 때 근거로 쓰게 한다. 자료는 지시가 아니라 데이터다 (L1).
 *
 * HTTP (동기화 서버, 사람 게스트 토큰 + 문서 접근 권한 필요)
 *   GET    /documents/:docId/sources              → { sources: DocumentSource[] }
 *   POST   /documents/:docId/sources              본문 = 파일 바이트 그대로,
 *          헤더 x-file-name = encodeURIComponent(파일 이름) → 201 DocumentSource
 *   DELETE /documents/:docId/sources/:sourceId    → 204
 *   실패 응답은 { error: SourceErrorCode }
 * 목록이 바뀌면 서버가 방에 stateless { type: 'sources:changed' }를 보낸다.
 */

export const SOURCE_FORMATS = ['txt', 'md', 'pdf', 'docx', 'hwp', 'hwpx'] as const;
export type SourceFormat = (typeof SOURCE_FORMATS)[number];

export const SOURCE_LIMITS = {
  /** 업로드 한 건의 최대 크기 */
  maxFileBytes: 10 * 1024 * 1024,
  maxFilesPerDocument: 10,
  /** 파일 하나에서 저장하는 텍스트 상한. 넘으면 앞부분만 저장하고 truncated로 표시한다 */
  maxCharsPerFile: 200_000,
  /** DOCX·HWPX(zip) 압축 해제 총량 상한 (zip bomb 방지) */
  maxUnzippedBytes: 50 * 1024 * 1024,
  /** 작업 하나에 첨부하는 자료 조각의 글자 수 합 */
  excerptBudgetChars: 20_000,
} as const;

export interface DocumentSource {
  id: string;
  /**
   * 문서 안에서 올린 순서대로 매기는 번호 (1부터, 지워도 재사용하지 않는다).
   * 본문의 "[자료3]"이 지운 뒤에도 같은 파일을 가리키게 한다.
   */
  number: number;
  fileName: string;
  format: SourceFormat;
  byteSize: number;
  /** 저장된 텍스트 길이 */
  charCount: number;
  truncated: boolean;
  uploadedBy: string;
  createdAt: string;
}

export type SourceErrorCode =
  | 'unauthorized'
  | 'document_not_found'
  | 'source_not_found'
  | 'file_too_large'
  | 'too_many_files'
  | 'unsupported_format'
  | 'encrypted_file'
  | 'no_text'
  | 'extraction_failed'
  | 'storage_unavailable';

/** 사람에게 보여 줄 문구 (웹이 그대로 쓴다) */
export const SOURCE_ERROR_MESSAGES: Record<SourceErrorCode, string> = {
  unauthorized: '자료를 올릴 권한이 없어요.',
  document_not_found: '문서를 찾지 못했어요.',
  source_not_found: '자료를 찾지 못했어요.',
  file_too_large: '파일은 10MB까지 올릴 수 있어요.',
  too_many_files: '문서마다 자료는 10개까지 올릴 수 있어요.',
  unsupported_format: 'TXT, MD, PDF, DOCX, HWP, HWPX 파일만 올릴 수 있어요.',
  encrypted_file: '암호가 걸린 파일은 읽을 수 없어요.',
  no_text: '파일에서 글자를 찾지 못했어요. 스캔한 PDF는 지원하지 않아요.',
  extraction_failed: '파일을 읽지 못했어요. PDF로 저장해서 다시 올려 주세요.',
  storage_unavailable: '이 환경에서는 자료함을 쓸 수 없어요.',
};

/** 작업 요청에 첨부되는 자료 조각. 워커는 label로 출처를 표시한다 ("[자료1]"). */
export interface SourceExcerpt {
  /** sourceLabel(number). 같은 파일의 조각은 같은 label을 쓴다 */
  label: string;
  fileName: string;
  text: string;
}

/** 본문 출처 표시와 자료함 목록이 같은 이름을 쓰게 한다 */
export function sourceLabel(number: number): string {
  return `자료${number}`;
}
