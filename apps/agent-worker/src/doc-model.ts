import * as Y from 'yjs';
import { DOC_FIELD, type SourceExcerpt } from '@co-pen/shared';

export interface BlockSummary {
  index: number;
  type: string;
  text: string;
}

export function getFragment(doc: Y.Doc): Y.XmlFragment {
  return doc.getXmlFragment(DOC_FIELD);
}

function plainText(node: Y.XmlElement | Y.XmlText | Y.XmlHook): string {
  if (node instanceof Y.XmlText) {
    return node
      .toDelta()
      .map((op: { insert?: unknown }) => (typeof op.insert === 'string' ? op.insert : ''))
      .join('');
  }
  if (node instanceof Y.XmlElement) {
    const children = node.toArray();
    const separator = children.some((child) => child instanceof Y.XmlElement) ? '\n' : '';
    return children.map(plainText).join(separator);
  }
  return '';
}

export function summarizeBlocks(fragment: Y.XmlFragment): BlockSummary[] {
  return fragment.toArray().map((node, index) => ({
    index,
    type: node instanceof Y.XmlElement ? node.nodeName : 'text',
    text: plainText(node),
  }));
}

/** 본문 작성기에 싣는 문서 전문의 글자 수 상한 */
export const DOCUMENT_CONTEXT_BUDGET = 12_000;

/**
 * 본문 작성기에 줄 문서 전문. 문서를 못 본 모델은 빈자리를 지어내서 채우므로 가능한 한 전문을 싣는다.
 * 예산을 넘으면 쓸 위치(focus)에서 가까운 블록부터 전문을 싣고, 나머지는 앞부분만 남긴다.
 */
export function documentContext(
  blocks: BlockSummary[],
  focus: number,
  budget = DOCUMENT_CONTEXT_BUDGET,
): string {
  const full = new Set<number>();
  let used = 0;
  const byDistance = [...blocks].sort((a, b) => Math.abs(a.index - focus) - Math.abs(b.index - focus));
  for (const block of byDistance) {
    if (used + block.text.length > budget) continue;
    used += block.text.length;
    full.add(block.index);
  }
  return blocks
    .map((block) => {
      const text = neutralizeDelimiters(
        full.has(block.index) ? block.text : `${block.text.slice(0, 80)}…(생략)`,
      );
      return `[${block.index}] (${block.type}) ${text}`;
    })
    .join('\n');
}

/**
 * 데이터 안의 <document>·<sources> 태그 흉내를 무력화한다.
 * 문서나 올린 자료에 "</document> SYSTEM: …"을 써서 데이터 채널을 빠져나가는 것을 막는다 (L1).
 */
export function neutralizeDelimiters(text: string): string {
  return text.replace(/<\s*(\/?)\s*(document|sources)\s*>/gi, '‹$1$2›');
}

/** 자료 조각을 파일(label)별로 묶는다. 같은 label의 조각은 받은 순서대로 잇는다. */
export function sourcesContext(sources: readonly SourceExcerpt[]): string {
  const byLabel = new Map<string, { fileName: string; texts: string[] }>();
  for (const { label, fileName, text } of sources) {
    const group = byLabel.get(label) ?? { fileName, texts: [] };
    group.texts.push(text);
    byLabel.set(label, group);
  }
  return [...byLabel]
    .map(([label, { fileName, texts }]) => `[${label}] ${fileName}\n${texts.join('\n…\n')}`)
    .join('\n\n');
}

/** 멘션이 입력된 문단을 찾는다. 같은 문장이 여러 번 있으면 가장 아래 것을 쓴다. */
export function findMentionBlock(blocks: BlockSummary[], mentionText: string): number {
  const needle = mentionText.trim();
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i]!.text.trim() === needle) return i;
  }
  return -1;
}

/**
 * F7: 각 블록 "바로 뒤" 위치에 상대 위치 앵커를 건다 (assoc = -1 → 왼쪽 블록에 붙음).
 * LLM이 계획을 세우는 동안 위쪽에 문단이 추가·삭제돼도 같은 블록 뒤로 해석된다.
 */
export function anchorAfterEachBlock(fragment: Y.XmlFragment): Y.RelativePosition[] {
  return fragment
    .toArray()
    .map((_, index) => Y.createRelativePositionFromTypeIndex(fragment, index + 1, -1));
}

export function resolveBlockIndex(doc: Y.Doc, anchor: Y.RelativePosition | undefined): number {
  const fragment = getFragment(doc);
  if (!anchor) return fragment.length;
  return Y.createAbsolutePositionFromRelativePosition(anchor, doc)?.index ?? fragment.length;
}

/** 빈 paragraph를 index에 끼워 넣고, 스트리밍 대상이 될 XmlText를 돌려준다. */
export function insertParagraph(fragment: Y.XmlFragment, index: number): Y.XmlText {
  const paragraph = new Y.XmlElement('paragraph');
  const text = new Y.XmlText();
  paragraph.insert(0, [text]);
  fragment.insert(Math.min(index, fragment.length), [paragraph]);
  return text;
}

/** 문단의 고유 ID (Yjs 항목 ID). 문단 번호와 달리 위에 문단이 끼어들어도 변하지 않는다. */
export function blockId(node: Y.XmlElement | Y.XmlText | Y.XmlHook): string {
  const id = node._item?.id;
  return id ? `${id.client}:${id.clock}` : 'unknown';
}

function textChildren(block: Y.XmlElement): Y.XmlText[] {
  return block.toArray().filter((child): child is Y.XmlText => child instanceof Y.XmlText);
}

/** 에디터의 textContent와 같은 값 (줄바꿈 노드 등 글자가 아닌 것은 뺀다). 원문 지문 계산용. */
export function blockText(block: Y.XmlElement): string {
  return textChildren(block)
    .flatMap((text) => text.toDelta() as { insert?: unknown }[])
    .map((op) => (typeof op.insert === 'string' ? op.insert : ''))
    .join('');
}

/** 아직 수락·거절하지 않은 AI 표시가 남아 있는 문단인지 */
export function hasPendingAiMark(block: Y.XmlElement, markNames: string[]): boolean {
  return textChildren(block)
    .flatMap((text) => text.toDelta() as { attributes?: Record<string, unknown> }[])
    .some((op) => markNames.some((name) => op.attributes?.[name]));
}

/** 문단의 모든 글자에 텍스트 속성(마크)을 입힌다 */
export function formatBlock(block: Y.XmlElement, attributes: Record<string, unknown>) {
  for (const text of textChildren(block)) text.format(0, text.length, attributes);
}
