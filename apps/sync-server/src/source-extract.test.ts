import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { crc32, deflateRawSync } from 'node:zlib';
import { SOURCE_LIMITS } from '@co-pen/shared';
import {
  chunkText,
  extractSourceInWorker,
  extractSourceText,
  SourceExtractionError,
  type ExtractionErrorCode,
} from './source-extract';

const fixture = async (name: string) =>
  new Uint8Array(await readFile(new URL(`../test-fixtures/${name}`, import.meta.url)));

/** 테스트용 최소 zip. 실제 크기를 정직하게 적되, 검사기는 헤더를 믿지 않는다 */
function zip(entries: Array<{ name: string; data: Uint8Array | string; deflate?: boolean; flags?: number }>) {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const raw = Buffer.from(entry.data);
    const data = entry.deflate ? deflateRawSync(raw) : raw;
    const name = Buffer.from(entry.name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(entry.flags ?? 0, 6);
    local.writeUInt16LE(entry.deflate ? 8 : 0, 8);
    local.writeUInt32LE(crc32(raw), 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(entry.flags ?? 0, 8);
    central.writeUInt16LE(entry.deflate ? 8 : 0, 10);
    central.writeUInt32LE(crc32(raw), 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, data);
    centrals.push(central, name);
    offset += local.length + name.length + data.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, directory, end]));
}

function docx(paragraphs: string[]) {
  const body = paragraphs.map((text) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`).join('');
  return zip([
    {
      name: '[Content_Types].xml',
      data: '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    },
    {
      name: '_rels/.rels',
      data: '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    },
    {
      name: 'word/document.xml',
      data: `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
      deflate: true,
    },
  ]);
}

function pdf(text: string | null) {
  const stream = text === null ? '' : `BT /F1 12 Tf 20 100 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(body, 'latin1'));
}

const utf8 = (text: string) => new TextEncoder().encode(text);

async function rejectsWith(promise: Promise<unknown>, code: ExtractionErrorCode) {
  await assert.rejects(
    promise,
    (error: unknown) => error instanceof SourceExtractionError && error.code === code,
  );
}

test('extracts every supported format by signature', async () => {
  const text = await extractSourceText(utf8('첫 문단\n\n둘째 문단'), 'note.txt');
  assert.equal(text.format, 'txt');
  assert.deepEqual(text.chunks, ['첫 문단\n둘째 문단']);
  assert.equal((await extractSourceText(utf8('# 제목'), 'README.MD')).format, 'md');

  const word = await extractSourceText(docx(['근거 자료 첫 문단', '둘째 문단']), 'report.docx');
  assert.equal(word.format, 'docx');
  assert.match(word.chunks.join('\n'), /근거 자료 첫 문단\n둘째 문단/);

  const portable = await extractSourceText(pdf('Hello Co-Pen'), 'paper.pdf');
  assert.equal(portable.format, 'pdf');
  assert.match(portable.chunks[0]!, /Hello Co-Pen/);

  const hwp = await extractSourceText(await fixture('table.hwp'), 'table.hwp');
  assert.equal(hwp.format, 'hwp');
  assert.match(hwp.chunks[0]!, /^ABC\n123/);

  const hwpx = await extractSourceText(await fixture('testdoc.hwpx'), 'testdoc.hwpx');
  assert.equal(hwpx.format, 'hwpx');
  assert.match(hwpx.chunks[0]!, /개요 내용입니다/);
});

test('format comes from magic bytes, not the file name', async () => {
  assert.equal((await extractSourceText(pdf('Disguised'), 'looks-like.docx')).format, 'pdf');
  assert.equal((await extractSourceText(docx(['진짜 워드']), 'notes.txt')).format, 'docx');
  await rejectsWith(extractSourceText(utf8('MZ\x90\x00 executable'), 'paper.pdf'), 'unsupported_format');
  await rejectsWith(extractSourceText(zip([{ name: 'a.txt', data: 'x' }]), 'a.docx'), 'unsupported_format');
  await rejectsWith(extractSourceText(new Uint8Array([0xff, 0xfe, 0xfd]), 'a.txt'), 'extraction_failed');
  const cfb = Buffer.alloc(512);
  Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]).copy(cfb);
  await rejectsWith(extractSourceText(new Uint8Array(cfb), 'old.doc'), 'unsupported_format');
});

test('encrypted containers are reported as encrypted', async () => {
  const cfb = Buffer.alloc(512);
  Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]).copy(cfb);
  Buffer.from('EncryptedPackage', 'utf16le').copy(cfb, 100);
  await rejectsWith(extractSourceText(new Uint8Array(cfb), 'secret.docx'), 'encrypted_file');
  await rejectsWith(
    extractSourceText(zip([{ name: 'word/document.xml', data: 'x', flags: 1 }]), 'secret.docx'),
    'encrypted_file',
  );
});

test('zip bombs are rejected by actual inflated size', async () => {
  const bomb = zip([
    { name: 'word/document.xml', data: new Uint8Array(SOURCE_LIMITS.maxUnzippedBytes + 1), deflate: true },
  ]);
  assert.ok(bomb.length < SOURCE_LIMITS.maxFileBytes);
  await rejectsWith(extractSourceText(bomb, 'bomb.docx'), 'file_too_large');
});

test('empty, blank and textless files have no text', async () => {
  await rejectsWith(extractSourceText(new Uint8Array(), 'empty.txt'), 'no_text');
  await rejectsWith(extractSourceText(utf8(' \n\t\r\n '), 'blank.md'), 'no_text');
  await rejectsWith(extractSourceText(pdf(null), 'scan.pdf'), 'no_text');
});

test('removes BOM, control and bidi characters', async () => {
  const hidden = [0xfeff, 0x202e, 0x2066, 0x200f, 0x07].map((code) => String.fromCodePoint(code));
  const source = await extractSourceText(
    utf8(`${hidden[0]}안녕${hidden[1]}하세요${hidden[2]}\r\n다음${hidden[3]}줄${hidden[4]}`),
    'a.txt',
  );
  assert.deepEqual(source.chunks, ['안녕하세요\n다음줄']);
  assert.equal(source.charCount, '안녕하세요\n다음줄'.length);
});

test('long text is truncated and chunked on paragraph boundaries', async () => {
  const paragraph = '가'.repeat(299);
  const text = Array.from({ length: 1000 }, () => paragraph).join('\n');
  const source = await extractSourceText(utf8(text), 'long.txt');
  assert.equal(source.truncated, true);
  assert.ok(source.charCount <= SOURCE_LIMITS.maxCharsPerFile);
  assert.ok(source.chunks.every((chunk) => chunk.length <= 800));
  // 299자 문단 두 개(+줄바꿈)가 한 조각에 들어가고 세 개는 넘친다
  assert.equal(source.chunks[0], `${paragraph}\n${paragraph}`);

  assert.deepEqual(chunkText('가'.repeat(1700)), ['가'.repeat(800), '가'.repeat(800), '가'.repeat(100)]);
});

test('worker extraction returns the same result and enforces the time limit', async () => {
  const source = await extractSourceInWorker(await fixture('testdoc.hwpx'), 'testdoc.hwpx');
  assert.equal(source.format, 'hwpx');
  await rejectsWith(extractSourceInWorker(utf8('# 제목'), 'a.md', 1), 'extraction_failed');
  await rejectsWith(extractSourceInWorker(new Uint8Array(), 'a.md'), 'no_text');
});
