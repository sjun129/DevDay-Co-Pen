import { Mark, mergeAttributes } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { AI_SUGGESTION_MARK } from '@co-pen/shared';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiSuggestion: {
      acceptAiSuggestion: (jobId: string) => ReturnType;
      rejectAiSuggestion: (jobId: string) => ReturnType;
    };
  }
}

interface Range {
  from: number;
  to: number;
}

function hasSuggestion(node: ProseMirrorNode, jobId: string) {
  return node.marks.some(
    (mark) => mark.type.name === AI_SUGGESTION_MARK && mark.attrs.jobId === jobId,
  );
}

/** 제안 텍스트 범위. 문단 전체가 제안이면 문단째로 잡아 거절 시 빈 문단이 남지 않게 한다. */
function suggestionRanges(doc: ProseMirrorNode, jobId: string): { text: Range[]; blocks: Range[] } {
  const text: Range[] = [];
  const blocks: Range[] = [];
  doc.descendants((node, pos) => {
    if (node.isTextblock && node.childCount > 0) {
      let whole = true;
      node.forEach((child) => {
        if (!child.isText || !hasSuggestion(child, jobId)) whole = false;
      });
      if (whole) {
        blocks.push({ from: pos, to: pos + node.nodeSize });
        return false;
      }
    }
    if (node.isText && hasSuggestion(node, jobId)) {
      text.push({ from: pos, to: pos + node.nodeSize });
    }
    return true;
  });
  return { text, blocks };
}

export interface PendingSuggestion {
  jobId: string;
  preview: string;
}

/** 문서에 남아 있는 (아직 수락·거절하지 않은) 제안과 앞부분 미리보기 */
export function pendingSuggestions(doc: ProseMirrorNode): PendingSuggestion[] {
  const previews = new Map<string, string>();
  doc.descendants((node) => {
    if (!node.isText) return;
    const mark = node.marks.find((m) => m.type.name === AI_SUGGESTION_MARK && m.attrs.jobId);
    if (!mark) return;
    const jobId = mark.attrs.jobId as string;
    const text = previews.get(jobId) ?? '';
    if (text.length < 80) previews.set(jobId, `${text}${text ? ' ' : ''}${node.text ?? ''}`);
  });
  return [...previews].map(([jobId, preview]) => ({ jobId, preview: preview.trim() }));
}

/**
 * F8 제안 모드. 워커가 Yjs 텍스트 속성 { aiSuggestion: { jobId } }로 넣은 것이
 * y-tiptap을 거쳐 이 마크로 보인다. 이름은 AI_SUGGESTION_MARK와 반드시 같아야 한다.
 */
export const AiSuggestion = Mark.create({
  name: AI_SUGGESTION_MARK,
  inclusive: false,

  addAttributes() {
    return {
      jobId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-job-id'),
        renderHTML: (attributes) => ({ 'data-job-id': attributes.jobId }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-ai-suggestion]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-ai-suggestion': '', class: 'ai-suggestion' }), 0];
  },

  addCommands() {
    return {
      acceptAiSuggestion:
        (jobId) =>
        ({ tr, state, dispatch }) => {
          const { text, blocks } = suggestionRanges(state.doc, jobId);
          const ranges = [...text, ...blocks];
          if (ranges.length === 0) return false;
          if (dispatch) ranges.forEach(({ from, to }) => tr.removeMark(from, to, this.type));
          return true;
        },

      rejectAiSuggestion:
        (jobId) =>
        ({ tr, state, dispatch }) => {
          const { text, blocks } = suggestionRanges(state.doc, jobId);
          const ranges = [...text, ...blocks].sort((a, b) => b.from - a.from);
          if (ranges.length === 0) return false;
          if (dispatch) ranges.forEach(({ from, to }) => tr.delete(from, to));
          return true;
        },
    };
  },
});
