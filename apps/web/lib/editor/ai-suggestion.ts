import { Mark, mergeAttributes } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { AI_DELETION_MARK, AI_SUGGESTION_MARK, isAgentId, textHash, type AgentId } from '@co-pen/shared';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    aiSuggestion: {
      /**
       * 제안을 받아들인다. 교정 제안이면 원문 문단을 지우고 수정본만 남긴다.
       * 요청 뒤에 원문이 바뀌었으면 force 없이는 실행되지 않는다 (사람 수정을 말없이 지우지 않는다).
       */
      acceptAiSuggestion: (jobId: string, options?: { force?: boolean }) => ReturnType;
      rejectAiSuggestion: (jobId: string) => ReturnType;
    };
  }
}

interface Range {
  from: number;
  to: number;
}

function markFor(node: ProseMirrorNode, markName: string, jobId: string) {
  return node.marks.find((mark) => mark.type.name === markName && mark.attrs.jobId === jobId);
}

interface JobRanges {
  /** 제안 텍스트 범위. 문단 전체가 제안이면 blocks에 문단째로 잡아 거절 시 빈 문단이 남지 않게 한다. */
  text: Range[];
  blocks: Range[];
  /** 교정 작업의 원문 문단 (aiDeletion 표시가 붙은 문단) */
  originals: Range[];
  /** 원문이 요청 시점과 달라졌는지 */
  originalChanged: boolean;
}

function jobRanges(doc: ProseMirrorNode, jobId: string): JobRanges {
  const ranges: JobRanges = { text: [], blocks: [], originals: [], originalChanged: false };
  doc.descendants((node, pos) => {
    if (node.isTextblock && node.childCount > 0) {
      let whole = true;
      let base: string | null = null;
      node.forEach((child) => {
        if (!child.isText || !markFor(child, AI_SUGGESTION_MARK, jobId)) whole = false;
        const deletion = markFor(child, AI_DELETION_MARK, jobId);
        if (deletion) base = deletion.attrs.base as string;
      });
      if (whole) {
        ranges.blocks.push({ from: pos, to: pos + node.nodeSize });
        return false;
      }
      if (base !== null) {
        ranges.originals.push({ from: pos, to: pos + node.nodeSize });
        if (textHash(node.textContent) !== base) ranges.originalChanged = true;
        return false;
      }
    }
    if (node.isText && markFor(node, AI_SUGGESTION_MARK, jobId)) {
      ranges.text.push({ from: pos, to: pos + node.nodeSize });
    }
    return true;
  });
  return ranges;
}

export interface PendingSuggestion {
  jobId: string;
  agentId: AgentId;
  /** AI가 쓴 글 전체 */
  text: string;
  /** 교정 제안일 때만: 고쳐 쓰려는 원문과, 요청 뒤에 사람이 원문을 고쳤는지 */
  original?: { text: string; changed: boolean };
}

/** 문서에 남아 있는 (아직 수락·거절하지 않은) 제안 */
export function pendingSuggestions(doc: ProseMirrorNode): PendingSuggestion[] {
  const pending = new Map<string, PendingSuggestion>();
  const entry = (jobId: string, agentId: unknown) => {
    let item = pending.get(jobId);
    if (!item) {
      item = { jobId, agentId: isAgentId(agentId) ? agentId : 'draft', text: '' };
      pending.set(jobId, item);
    }
    return item;
  };

  doc.descendants((node) => {
    if (!node.isTextblock) return true;
    let lastSuggestion: PendingSuggestion | undefined;
    node.forEach((child) => {
      if (!child.isText) return;
      for (const mark of child.marks) {
        if (!mark.attrs.jobId) continue;
        const item = entry(mark.attrs.jobId as string, mark.attrs.agentId);
        if (mark.type.name === AI_SUGGESTION_MARK) {
          // 문단이 바뀔 때만 줄바꿈을 넣어 여러 문단 제안도 읽을 수 있게 한다
          if (item.text && lastSuggestion !== item) item.text += '\n';
          item.text += child.text ?? '';
          lastSuggestion = item;
        } else if (mark.type.name === AI_DELETION_MARK && !item.original) {
          item.original = {
            text: node.textContent,
            changed: textHash(node.textContent) !== mark.attrs.base,
          };
        }
      }
    });
    return false;
  });
  // 수정본이 아직 한 글자도 안 들어온 교정 작업은 목록에 올리지 않는다
  return [...pending.values()].filter((item) => item.text.trim());
}

function jobAttributes(extra: Record<string, string> = {}) {
  const attribute = (name: string, dataName: string) => ({
    default: null,
    parseHTML: (element: HTMLElement) => element.getAttribute(dataName),
    renderHTML: (attributes: Record<string, unknown>) => (attributes[name] ? { [dataName]: attributes[name] } : {}),
  });
  return {
    jobId: attribute('jobId', 'data-job-id'),
    agentId: attribute('agentId', 'data-agent-id'),
    ...Object.fromEntries(Object.entries(extra).map(([name, dataName]) => [name, attribute(name, dataName)])),
  };
}

/**
 * F8 제안 모드. 워커가 Yjs 텍스트 속성 { aiSuggestion: { jobId, agentId } }로 넣은 것이
 * y-tiptap을 거쳐 이 마크로 보인다. 이름은 AI_SUGGESTION_MARK와 반드시 같아야 한다.
 */
export const AiSuggestion = Mark.create({
  name: AI_SUGGESTION_MARK,
  inclusive: false,

  addAttributes() {
    return jobAttributes();
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
        (jobId, options) =>
        ({ tr, state, dispatch }) => {
          const { text, blocks, originals, originalChanged } = jobRanges(state.doc, jobId);
          const suggestion = [...text, ...blocks];
          if (suggestion.length === 0) return false;
          if (originalChanged && !options?.force) return false;
          if (dispatch) {
            suggestion.forEach(({ from, to }) => tr.removeMark(from, to, this.type));
            // 뒤에서부터 지워야 앞쪽 위치가 밀리지 않는다
            [...originals].sort((a, b) => b.from - a.from).forEach(({ from, to }) => tr.delete(from, to));
          }
          return true;
        },

      rejectAiSuggestion:
        (jobId) =>
        ({ tr, state, dispatch }) => {
          const { text, blocks, originals } = jobRanges(state.doc, jobId);
          const suggestion = [...text, ...blocks].sort((a, b) => b.from - a.from);
          if (suggestion.length === 0 && originals.length === 0) return false;
          if (dispatch) {
            const deletion = state.schema.marks[AI_DELETION_MARK];
            // 표시 제거는 위치를 바꾸지 않으므로 삭제보다 먼저 한다
            if (deletion) originals.forEach(({ from, to }) => tr.removeMark(from, to, deletion));
            suggestion.forEach(({ from, to }) => tr.delete(from, to));
          }
          return true;
        },
    };
  },
});

/**
 * 교정 제안의 원문 표시. 워커가 { aiDeletion: { jobId, agentId, base } }로 넣는다.
 * base는 요청 시점 원문의 지문이라, 수락 직전에 원문이 바뀌었는지 비교할 수 있다.
 */
export const AiDeletion = Mark.create({
  name: AI_DELETION_MARK,
  inclusive: false,

  addAttributes() {
    return jobAttributes({ base: 'data-base' });
  },

  parseHTML() {
    return [{ tag: 'span[data-ai-deletion]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-ai-deletion': '', class: 'ai-deletion' }), 0];
  },
});
