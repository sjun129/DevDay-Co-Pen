import assert from 'node:assert/strict';
import test from 'node:test';
import { SOURCE_ERROR_MESSAGES, SOURCE_LIMITS } from '@co-pen/shared';
import {
  SOURCE_ACCEPT,
  SourceRequestError,
  parseSourceList,
  sourceErrorMessage,
  sourceFormatOf,
  sourceResponseError,
  validateSourceFile,
} from './sources';

const source = (number: number, overrides: Record<string, unknown> = {}) => ({
  id: `source-${number}`,
  number,
  fileName: `자료${number}.pdf`,
  format: 'pdf',
  byteSize: 1024,
  charCount: 300,
  truncated: false,
  uploadedBy: '민지',
  createdAt: '2026-10-06T00:00:00.000Z',
  ...overrides,
});

test('accept list and extension check cover every contract format, case-insensitively', () => {
  assert.equal(SOURCE_ACCEPT, '.txt,.md,.pdf,.docx,.hwp,.hwpx');
  assert.equal(sourceFormatOf('보고서.HWPX'), 'hwpx');
  assert.equal(sourceFormatOf('notes.tar.md'), 'md');
  assert.equal(sourceFormatOf('README'), null);
  assert.equal(sourceFormatOf('image.png'), null);
  assert.equal(sourceFormatOf('pdf'), null);
});

test('pre-upload validation rejects format, size, empty file, and count in that order', () => {
  const max = SOURCE_LIMITS.maxFileBytes;
  assert.equal(validateSourceFile({ name: 'a.pdf', size: 10 }, 0), null);
  assert.equal(validateSourceFile({ name: 'a.pdf', size: max }, 0), null);
  assert.equal(validateSourceFile({ name: 'a.exe', size: 10 }, 0), 'unsupported_format');
  assert.equal(validateSourceFile({ name: 'a.pdf', size: max + 1 }, 0), 'file_too_large');
  assert.equal(validateSourceFile({ name: 'a.txt', size: 0 }, 0), 'no_text');
  assert.equal(
    validateSourceFile({ name: 'a.pdf', size: 10 }, SOURCE_LIMITS.maxFilesPerDocument - 1),
    null,
  );
  assert.equal(
    validateSourceFile({ name: 'a.pdf', size: 10 }, SOURCE_LIMITS.maxFilesPerDocument),
    'too_many_files',
  );
});

test('error codes map to shared messages; unknown codes and network failures get fallbacks', () => {
  assert.equal(
    sourceErrorMessage(new SourceRequestError(503, 'storage_unavailable')),
    SOURCE_ERROR_MESSAGES.storage_unavailable,
  );
  const unknown = sourceErrorMessage(new SourceRequestError(500, 'something_new'));
  const network = sourceErrorMessage(new TypeError('Failed to fetch'));
  assert.match(unknown, /처리하지 못했어요/);
  assert.match(network, /연결하지 못했어요/);
  assert.notEqual(unknown, network);
  // 프로토타입 속성 이름이 코드로 들어와도 문구 표를 벗어나지 않는다
  assert.equal(sourceErrorMessage(new SourceRequestError(500, 'toString')), unknown);
});

test('error response body is read as { error } and falls back when missing or not JSON', async () => {
  const coded = await sourceResponseError(
    new Response(JSON.stringify({ error: 'encrypted_file' }), { status: 422 }),
  );
  assert.equal(coded.status, 422);
  assert.equal(coded.code, 'encrypted_file');

  const html = await sourceResponseError(new Response('<h1>Bad Gateway</h1>', { status: 502 }));
  assert.equal(html.code, 'request_failed');

  const wrongType = await sourceResponseError(
    new Response(JSON.stringify({ error: 42 }), { status: 400 }),
  );
  assert.equal(wrongType.code, 'request_failed');
});

test('list parsing sorts by number, drops malformed items, and rejects a missing list', () => {
  const parsed = parseSourceList({
    sources: [
      source(3, { truncated: true }),
      source(1),
      source(2, { format: 'exe' }),
      source(4, { number: '4' }),
      null,
    ],
  });
  assert.deepEqual(
    parsed.map(({ number, truncated }) => [number, truncated]),
    [
      [1, false],
      [3, true],
    ],
  );
  assert.deepEqual(parseSourceList({ sources: [] }), []);
  assert.throws(() => parseSourceList(null), /invalid_response/);
  assert.throws(() => parseSourceList({ sources: 'nope' }), /invalid_response/);
});
