/** TipTap Collaboration 확장이 사용하는 Y.XmlFragment 이름 */
export const DOC_FIELD = 'default';

/** 에이전트 트랜잭션 origin. 워커의 Y.UndoManager가 이 origin만 추적한다 (F9). */
export const AGENT_ORIGIN = 'co-pen-agent';

/** AI가 삽입한 텍스트에 붙는 제안 마크 이름 (F8). 에디터 Mark 이름과 반드시 같아야 한다. */
export const AI_SUGGESTION_MARK = 'aiSuggestion';

/** "@AI 3장 결론 써줘" 형태의 멘션. 문단 첫머리에서만 인식한다. */
export const MENTION_PATTERN = /^@(?:AI|초안)\s+(.+)$/i;

export type ParticipantKind = 'human' | 'agent';

/** awareness의 `user` 필드. y-tiptap 커서 렌더링 규약상 color는 6자리 hex여야 한다. */
export interface AwarenessUser {
  name: string;
  color: string;
  kind: ParticipantKind;
}

export const AGENT_USER: AwarenessUser = {
  name: 'Co-Pen AI',
  color: '#7c3aed',
  kind: 'agent',
};

export const HUMAN_COLORS = [
  '#e11d48',
  '#ea580c',
  '#ca8a04',
  '#16a34a',
  '#0891b2',
  '#2563eb',
  '#db2777',
  '#4f46e5',
] as const;
