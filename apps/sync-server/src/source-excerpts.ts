import { SOURCE_LIMITS, sourceLabel, type SourceExcerpt } from '@co-pen/shared';
import type { StoredSourceChunk } from './source-store';

const CONTEXT_BEFORE = 3;
const CONTEXT_AFTER = 1;

/** 글자 두 개씩 묶은 집합. 형태소 분석 없이 한국어 조사·어미 변화에도 겹침을 잡는다 */
function bigrams(text: string): Set<string> {
  const result = new Set<string>();
  for (const word of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
    for (let index = 0; index + 1 < word.length; index += 1) {
      result.add(word.slice(index, index + 2));
    }
  }
  return result;
}

/** 멘션 문단과 그 앞뒤 문단. 사람이 쓰던 맥락을 검색 질의에 보탠다 */
export function mentionContext(paragraphs: string[], mentionText: string): string {
  const target = mentionText.trim();
  const index = paragraphs.findLastIndex((paragraph) => paragraph.trim() === target);
  if (index < 0) return '';
  return paragraphs.slice(Math.max(0, index - CONTEXT_BEFORE), index + CONTEXT_AFTER + 1).join('\n');
}

/**
 * 조각 전체가 예산 안이면 전부, 넘으면 질의와 bigram이 많이 겹치는 조각부터 예산까지 고른다.
 * 결과는 파일 번호·조각 순서대로 정렬해 원문 흐름을 지킨다.
 */
export function selectExcerpts(
  chunks: StoredSourceChunk[],
  query: string,
  budget: number = SOURCE_LIMITS.excerptBudgetChars,
): SourceExcerpt[] {
  const byPosition = (a: StoredSourceChunk, b: StoredSourceChunk) =>
    a.number - b.number || a.ordinal - b.ordinal;
  let selected: StoredSourceChunk[];
  if (chunks.reduce((total, chunk) => total + chunk.text.length, 0) <= budget) {
    selected = [...chunks];
  } else {
    const queryBigrams = bigrams(query);
    const ranked = chunks
      .map((chunk) => {
        let score = 0;
        for (const gram of bigrams(chunk.text)) if (queryBigrams.has(gram)) score += 1;
        return { chunk, score };
      })
      .sort((a, b) => b.score - a.score || byPosition(a.chunk, b.chunk));
    selected = [];
    let used = 0;
    for (const { chunk } of ranked) {
      if (used + chunk.text.length > budget) continue;
      selected.push(chunk);
      used += chunk.text.length;
    }
  }
  return selected.sort(byPosition).map((chunk) => ({
    label: sourceLabel(chunk.number),
    fileName: chunk.fileName,
    text: chunk.text,
  }));
}
