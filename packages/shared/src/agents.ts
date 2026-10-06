import type { AwarenessUser } from './constants';

/**
 * 역할 에이전트 목록. 역할은 지시문이 아니라 권한(action)으로 나눈다.
 * 어떤 에이전트가 일할지는 사람이 친 호출어로만 정해진다 (모델이 고르지 않는다).
 */
export type AgentId = 'draft' | 'proofread';
export type AgentAction = 'insert_after' | 'rewrite';

export interface AgentRole {
  id: AgentId;
  name: string;
  /** y-tiptap 커서 규약상 6자리 hex */
  color: string;
  /** "@호출어" 의 호출어. 대소문자 구분 없음 */
  triggers: readonly string[];
  /** 이 에이전트가 문서에 할 수 있는 유일한 행동 */
  action: AgentAction;
  /** 호출어만 쓰고 요청을 비웠을 때 쓰는 지시. 없으면 요청이 필수다 */
  defaultPrompt?: string;
  description: string;
  example: string;
}

export const AGENT_ROLES: Record<AgentId, AgentRole> = {
  draft: {
    id: 'draft',
    name: '초안 작성자',
    color: '#7c3aed',
    triggers: ['AI', '초안'],
    action: 'insert_after',
    description: '요청한 내용을 새 문단으로 씁니다',
    example: '@초안 3장 결론 써줘',
  },
  proofread: {
    id: 'proofread',
    name: '문체 교정자',
    color: '#0d9488',
    triggers: ['교정'],
    action: 'rewrite',
    defaultPrompt: '맞춤법과 문체를 다듬어줘',
    description: '바로 위 문단을 고쳐 씁니다',
    example: '@교정 보고서체로 다듬어줘',
  },
};

export const AGENT_IDS = Object.keys(AGENT_ROLES) as AgentId[];

export function isAgentId(value: unknown): value is AgentId {
  return typeof value === 'string' && value in AGENT_ROLES;
}

export function agentUser(agentId: AgentId): AwarenessUser {
  const { name, color } = AGENT_ROLES[agentId];
  return { name, color, kind: 'agent', agentId };
}

const TRIGGERS = AGENT_IDS.flatMap((id) => AGENT_ROLES[id].triggers);

/** "@초안 3장 결론 써줘" 형태의 멘션. 문단 첫머리에서만 인식한다. */
export const MENTION_PATTERN = new RegExp(String.raw`^@(${TRIGGERS.join('|')})(?:\s+(.+))?$`, 'i');

/** AI 출력에 남으면 안 되는 호출 표시 (출력 정화에서 '@'를 지운다) */
export const MENTION_MARK_PATTERN = new RegExp(`[@＠](?=${TRIGGERS.join('|')})`, 'gi');

/** 멘션 문단 최대 길이. 지시 채널(L1)로 들어가는 유일한 입력이라 짧게 제한한다. */
export const MAX_MENTION_LENGTH = 500;

export interface Mention {
  agentId: AgentId;
  prompt: string;
}

/**
 * 멘션 문단 텍스트에서 담당 에이전트와 요청 본문을 꺼낸다. 형식이 아니거나 너무 길면 null.
 * 브라우저·동기화 서버·워커가 같은 규칙을 쓰도록 여기 한 곳에 둔다.
 */
export function parseMention(mentionText: string): Mention | null {
  const text = mentionText.trim();
  if (text.length > MAX_MENTION_LENGTH) return null;
  const match = text.match(MENTION_PATTERN);
  if (!match) return null;

  const trigger = match[1]!.toLowerCase();
  const role = AGENT_IDS.map((id) => AGENT_ROLES[id]).find((candidate) =>
    candidate.triggers.some((word) => word.toLowerCase() === trigger),
  );
  const prompt = match[2]?.trim() || role?.defaultPrompt;
  return role && prompt ? { agentId: role.id, prompt } : null;
}

/**
 * 교정 요청 시점의 원문 지문 (FNV-1a 32비트).
 * 워커가 마크에 기록하고, 브라우저가 수락 직전에 현재 원문과 비교한다. 보안용이 아니라 변경 감지용이다.
 */
export function textHash(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** 역할마다 행동이 하나뿐이라 작업의 행동으로 담당 에이전트를 알 수 있다 */
export function agentForAction(action: AgentAction): AgentId {
  return AGENT_IDS.find((id) => AGENT_ROLES[id].action === action)!;
}
