import assert from 'node:assert/strict';
import test from 'node:test';
import { mentionContext, selectExcerpts } from './source-excerpts';
import type { StoredSourceChunk } from './source-store';

const chunk = (number: number, ordinal: number, text: string): StoredSourceChunk => ({
  number,
  fileName: `file-${number}.txt`,
  ordinal,
  text,
});

test('everything under the budget is attached in file and chunk order', () => {
  const excerpts = selectExcerpts(
    [chunk(2, 1, '둘째 파일'), chunk(1, 2, '첫 파일 둘째 조각'), chunk(1, 1, '첫 파일 첫 조각')],
    '무관한 질의',
  );
  assert.deepEqual(excerpts, [
    { label: '자료1', fileName: 'file-1.txt', text: '첫 파일 첫 조각' },
    { label: '자료1', fileName: 'file-1.txt', text: '첫 파일 둘째 조각' },
    { label: '자료2', fileName: 'file-2.txt', text: '둘째 파일' },
  ]);
});

test('over budget, chunks sharing the most bigrams with the query win', () => {
  const filler = (word: string) => `${word} `.repeat(20).trim();
  const chunks = [
    chunk(1, 1, filler('날씨')),
    chunk(1, 2, `${filler('기타')} 한국형발사체 누리호 발사 일정`),
    chunk(2, 1, filler('요리')),
    chunk(3, 1, `누리호 발사 성공 ${filler('우주')}`),
  ];
  const budget = chunks[1]!.text.length + chunks[3]!.text.length;
  const excerpts = selectExcerpts(chunks, '누리호 발사가 언제였는지 써줘', budget);
  assert.deepEqual(
    excerpts.map((excerpt) => [excerpt.label, excerpt.text.includes('누리호')]),
    [
      ['자료1', true],
      ['자료3', true],
    ],
  );
  assert.ok(excerpts.reduce((total, excerpt) => total + excerpt.text.length, 0) <= budget);
});

test('a chunk that does not fit is skipped and the rest of the budget is still filled', () => {
  const excerpts = selectExcerpts(
    [chunk(1, 1, `누리호 ${'가'.repeat(50)}`), chunk(1, 2, '누리호 짧은 조각'), chunk(1, 3, '무관')],
    '누리호',
    20,
  );
  assert.deepEqual(
    excerpts.map((excerpt) => excerpt.text),
    ['누리호 짧은 조각', '무관'],
  );
});

test('mention context takes the paragraphs around the last matching mention', () => {
  const paragraphs = ['서론', '배경 설명', '누리호 개요', '발사 과정', '@AI 결과를 정리해줘', '맺음말'];
  assert.equal(
    mentionContext(paragraphs, ' @AI 결과를 정리해줘 '),
    '배경 설명\n누리호 개요\n발사 과정\n@AI 결과를 정리해줘\n맺음말',
  );
  assert.equal(mentionContext(paragraphs, '@AI 없는 문단'), '');
});
