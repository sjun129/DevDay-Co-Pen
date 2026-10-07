import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { inflateRawSync } from 'node:zlib';
import {
  HwpEncryptedError,
  HwpxEncryptedDocumentError,
  HwpxReader,
  hwpToText,
} from '@ssabrojs/hwpxjs';
import mammoth from 'mammoth';
import { extractText, getDocumentProxy } from 'unpdf';
import { SOURCE_LIMITS, type SourceErrorCode, type SourceFormat } from '@co-pen/shared';

export const CHUNK_CHARS = 800;
const EXTRACTION_TIMEOUT_MS = 20_000;
const WORKER_MEMORY_MB = 512;

const CFB_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];
const PDF_SIGNATURE = [...Buffer.from('%PDF-')];
// 줄바꿈·탭을 뺀 제어 문자와 양방향 제어 문자. 보이지 않는 글자로 지시를 숨기거나 순서를 뒤집는 걸 막는다
export const INVISIBLE_CONTROLS =
  /[\x00-\x08\x0E-\x1F\x7F-\x9F\u{061C}\u{200E}\u{200F}\u{202A}-\u{202E}\u{2066}-\u{2069}]/gu;

export type ExtractionErrorCode = Extract<
  SourceErrorCode,
  'file_too_large' | 'unsupported_format' | 'encrypted_file' | 'no_text' | 'extraction_failed'
>;

export class SourceExtractionError extends Error {
  constructor(readonly code: ExtractionErrorCode) {
    super(code);
  }
}

export interface ExtractedSource {
  format: SourceFormat;
  charCount: number;
  truncated: boolean;
  chunks: string[];
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function includesUtf16(bytes: Uint8Array, value: string): boolean {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).includes(
    Buffer.from(value, 'utf16le'),
  );
}

/**
 * zip의 모든 항목을 실제로 풀어 보며 총량을 센다. 헤더에 적힌 크기는 거짓일 수 있어서 믿지 않는다.
 * 항목 이름 목록을 돌려주고, DOCX·HWPX 구분에 쓴다.
 */
export function inspectZip(bytes: Uint8Array, maxUnzippedBytes = SOURCE_LIMITS.maxUnzippedBytes) {
  const view = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fail = (): never => {
    throw new SourceExtractionError('extraction_failed');
  };
  let end = -1;
  for (let offset = view.length - 22; offset >= Math.max(0, view.length - 22 - 0xffff); offset -= 1) {
    if (view.readUInt32LE(offset) === 0x06054b50) {
      end = offset;
      break;
    }
  }
  if (end < 0) fail();
  const entryCount = view.readUInt16LE(end + 10);
  let cursor = view.readUInt32LE(end + 16);
  // ZIP64는 문서 파일에서 쓸 일이 없으니 받지 않는다
  if (entryCount === 0xffff || cursor === 0xffffffff) fail();

  const names: string[] = [];
  let remaining = maxUnzippedBytes;
  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > view.length || view.readUInt32LE(cursor) !== 0x02014b50) fail();
    const flags = view.readUInt16LE(cursor + 8);
    const method = view.readUInt16LE(cursor + 10);
    const compressedSize = view.readUInt32LE(cursor + 20);
    const nameLength = view.readUInt16LE(cursor + 28);
    const extraLength = view.readUInt16LE(cursor + 30);
    const commentLength = view.readUInt16LE(cursor + 32);
    const localOffset = view.readUInt32LE(cursor + 42);
    names.push(view.toString('utf8', cursor + 46, cursor + 46 + nameLength));
    cursor += 46 + nameLength + extraLength + commentLength;

    if (flags & 1) throw new SourceExtractionError('encrypted_file');
    if (localOffset + 30 > view.length || view.readUInt32LE(localOffset) !== 0x04034b50) fail();
    const dataStart =
      localOffset + 30 + view.readUInt16LE(localOffset + 26) + view.readUInt16LE(localOffset + 28);
    if (dataStart + compressedSize > view.length) fail();
    const data = view.subarray(dataStart, dataStart + compressedSize);
    let size: number;
    if (method === 0) {
      size = data.length;
    } else if (method === 8) {
      try {
        size = inflateRawSync(data, { maxOutputLength: Math.max(1, remaining) }).length;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ERR_BUFFER_TOO_LARGE') {
          throw new SourceExtractionError('file_too_large');
        }
        return fail();
      }
    } else {
      return fail();
    }
    remaining -= size;
    if (remaining < 0) throw new SourceExtractionError('file_too_large');
  }
  return names;
}

function detectFormat(bytes: Uint8Array, fileName: string): SourceFormat {
  if (startsWith(bytes, PDF_SIGNATURE)) return 'pdf';
  if (startsWith(bytes, ZIP_SIGNATURE)) {
    const names = inspectZip(bytes);
    if (names.includes('word/document.xml')) return 'docx';
    if (names.some((name) => name.startsWith('Contents/'))) return 'hwpx';
    throw new SourceExtractionError('unsupported_format');
  }
  if (startsWith(bytes, CFB_SIGNATURE)) {
    // 암호를 건 DOCX도 같은 CFB 컨테이너라서 안쪽 스트림 이름으로 구분한다
    if (includesUtf16(bytes, 'EncryptedPackage')) throw new SourceExtractionError('encrypted_file');
    if (includesUtf16(bytes, 'FileHeader')) return 'hwp';
    throw new SourceExtractionError('unsupported_format');
  }
  // 시그니처가 없는 텍스트 파일만 확장자를 본다
  const extension = /\.([^.]+)$/.exec(fileName)?.[1]?.toLowerCase();
  if (extension === 'txt' || extension === 'md') return extension;
  throw new SourceExtractionError('unsupported_format');
}

async function rawText(format: SourceFormat, bytes: Uint8Array): Promise<string> {
  switch (format) {
    case 'txt':
    case 'md':
      try {
        // fatal: UTF-8이 아니면 깨진 글자로 저장하지 않고 실패시킨다. BOM은 기본으로 떼어 낸다
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch {
        throw new SourceExtractionError('extraction_failed');
      }
    case 'pdf':
      // 워커가 끝나면 문서 객체도 함께 정리된다
      return (await extractText(await getDocumentProxy(new Uint8Array(bytes)), { mergePages: true }))
        .text;
    case 'docx':
      return (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value;
    case 'hwp':
      return hwpToText(bytes);
    case 'hwpx': {
      const reader = new HwpxReader();
      await reader.loadFromArrayBuffer(new Uint8Array(bytes).buffer);
      return reader.extractText();
    }
  }
}

export function normalizeText(text: string): string {
  return text
    .replace(/\r\n?|[\v\f\u{2028}\u{2029}]/gu, '\n')
    .replace(INVISIBLE_CONTROLS, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 문단 경계에서 약 CHUNK_CHARS 단위로 나눈다. 한 문단이 더 길면 그 문단만 잘라 나눈다 */
export function chunkText(text: string, size = CHUNK_CHARS): string[] {
  const chunks: string[] = [];
  let current = '';
  for (let paragraph of text.split('\n')) {
    paragraph = paragraph.trim();
    if (!paragraph) continue;
    if (current && current.length + 1 + paragraph.length > size) {
      chunks.push(current);
      current = '';
    }
    while (paragraph.length > size) {
      if (current) chunks.push(current);
      current = '';
      chunks.push(paragraph.slice(0, size));
      paragraph = paragraph.slice(size);
    }
    current = current ? `${current}\n${paragraph}` : paragraph;
  }
  if (current) chunks.push(current);
  return chunks;
}

/** 같은 스레드에서 추출한다. 서버는 시간·메모리를 제한하려고 extractSourceInWorker를 쓴다 */
export async function extractSourceText(
  bytes: Uint8Array,
  fileName: string,
): Promise<ExtractedSource> {
  if (bytes.length === 0) throw new SourceExtractionError('no_text');
  if (bytes.length > SOURCE_LIMITS.maxFileBytes) throw new SourceExtractionError('file_too_large');
  const format = detectFormat(bytes, fileName);

  let text: string;
  try {
    text = normalizeText(await rawText(format, bytes));
  } catch (error) {
    if (error instanceof SourceExtractionError) throw error;
    if (
      error instanceof HwpEncryptedError ||
      error instanceof HwpxEncryptedDocumentError ||
      (error as Error | null)?.name === 'PasswordException'
    ) {
      throw new SourceExtractionError('encrypted_file');
    }
    throw new SourceExtractionError('extraction_failed');
  }
  if (!text) throw new SourceExtractionError('no_text');

  const truncated = text.length > SOURCE_LIMITS.maxCharsPerFile;
  if (truncated) {
    text = text.slice(0, SOURCE_LIMITS.maxCharsPerFile);
    // 서로게이트 쌍 가운데서 잘렸으면 반쪽 글자를 버린다
    if (/[\uD800-\uDBFF]$/.test(text)) text = text.slice(0, -1);
    text = text.trimEnd();
  }
  return { format, charCount: text.length, truncated, chunks: chunkText(text) };
}

type WorkerResult =
  | { ok: true; source: ExtractedSource }
  | { ok: false; code: ExtractionErrorCode };

/**
 * 파서가 멈추거나 메모리를 다 쓰더라도 동기화 서버의 이벤트 루프는 살아 있어야 하므로
 * 추출은 별도 워커 스레드에서 시간·힙 제한을 걸고 돌린다.
 */
export function extractSourceInWorker(
  bytes: Uint8Array,
  fileName: string,
  timeoutMs = EXTRACTION_TIMEOUT_MS,
): Promise<ExtractedSource> {
  return new Promise((resolve, reject) => {
    // ponytail: 동시 업로드 수 제한이 없다. 업로드가 몰리면 워커 수만큼 메모리를 쓴다
    const worker = new Worker(new URL(import.meta.url), {
      workerData: { purpose: 'source-extract', bytes, fileName },
      resourceLimits: { maxOldGenerationSizeMb: WORKER_MEMORY_MB },
    });
    const finish = (settle: () => void) => {
      clearTimeout(timer);
      worker.removeAllListeners().on('error', () => undefined);
      void worker.terminate();
      settle();
    };
    const failed = () => finish(() => reject(new SourceExtractionError('extraction_failed')));
    const timer = setTimeout(failed, timeoutMs);
    worker.once('message', (result: WorkerResult) =>
      finish(() =>
        result.ok ? resolve(result.source) : reject(new SourceExtractionError(result.code)),
      ),
    );
    worker.once('error', failed);
    worker.once('exit', failed);
  });
}

if (!isMainThread && parentPort && workerData?.purpose === 'source-extract') {
  const port = parentPort;
  const { bytes, fileName } = workerData as { bytes: Uint8Array; fileName: string };
  const result: WorkerResult = await extractSourceText(bytes, fileName).then(
    (source) => ({ ok: true as const, source }),
    (error: unknown) => ({
      ok: false as const,
      code: error instanceof SourceExtractionError ? error.code : 'extraction_failed',
    }),
  );
  port.postMessage(result);
}
