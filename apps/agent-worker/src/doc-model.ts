import * as Y from 'yjs';
import { DOC_FIELD } from '@co-pen/shared';

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
