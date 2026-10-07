/**
 * 메시지 흐름
 *   브라우저 --stateless--> 동기화 서버 --HTTP--> 에이전트 워커
 *   에이전트 워커 --stateless--> 동기화 서버 --broadcast--> 브라우저
 */

import type { AgentId } from './agents';
import type { SourceExcerpt } from './sources';

export type ClientStatelessMessage =
  | {
      type: 'agent:mention';
      /** One browser intent. Retries for the same pending intent reuse this UUID. */
      idempotencyKey: string;
      requestedBy: string;
      /** 멘션이 입력된 문단의 텍스트. 워커가 이 문단을 앵커로 찾는다. */
      mentionText: string;
      /** 요청 시점 브라우저의 Y.encodeStateVector (base64). 워커는 이만큼 동기화된 뒤 작업한다. */
      stateVector: string;
    }
  | {
      type: 'agent:undo';
      requestedBy: string;
      /** 되돌릴 에이전트. 없으면 이 방에서 가장 최근에 일한 에이전트 */
      agentId?: AgentId;
    };

export type AgentJobStatus = 'queued' | 'planning' | 'writing' | 'done' | 'error';

export type AgentStatelessMessage = {
  type: 'agent:status';
  agentId: AgentId;
  jobId: string;
  status: AgentJobStatus;
  /** Present for browser-originated jobs so the in-memory pending request can be acknowledged. */
  idempotencyKey?: string;
  message?: string;
};

/** 동기화 서버 → 브라우저. 자료함 목록이 바뀌었으니 다시 불러오라는 신호 */
export type SourcesStatelessMessage = { type: 'sources:changed' };

export type StatelessMessage = ClientStatelessMessage | AgentStatelessMessage | SourcesStatelessMessage;

const STATELESS_TYPES = new Set<StatelessMessage['type']>([
  'agent:mention',
  'agent:undo',
  'agent:status',
  'sources:changed',
]);

export function parseStatelessMessage(raw: string): StatelessMessage | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === 'object' &&
      value !== null &&
      'type' in value &&
      STATELESS_TYPES.has((value as { type: StatelessMessage['type'] }).type)
    ) {
      return value as StatelessMessage;
    }
  } catch {
    // 형식이 맞지 않는 메시지는 무시한다
  }
  return null;
}

/** 동기화 서버 → 에이전트 워커 HTTP 요청 (/join, /leave) */
export interface AgentRoomRequest {
  documentName: string;
}

/** POST /jobs */
export interface AgentJobRequest extends AgentRoomRequest {
  jobId: string;
  agentId: AgentId;
  prompt: string;
  requestedBy: string;
  mentionText: string;
  stateVector: string;
  /** 자료함에서 고른 근거 조각. 없거나 비면 문서만 보고 쓴다 */
  sources?: SourceExcerpt[];
}

/** Agent Worker -> Sync Server. The Sync Server remains the only database principal. */
export interface AgentJobTransitionRequest extends AgentRoomRequest {
  jobId: string;
  expectedStatus: 'queued' | 'planning' | 'writing';
  nextStatus: 'planning' | 'writing' | 'done' | 'error';
  errorCode?: string;
  errorMessage?: string;
}

export interface AgentJobTransitionResponse {
  jobId: string;
  status: AgentJobStatus;
  transitioned: boolean;
}

/** POST /undo */
export interface AgentUndoRequest extends AgentRoomRequest {
  requestedBy: string;
  agentId?: AgentId;
}

export const AGENT_SECRET_HEADER = 'x-co-pen-agent-secret';

/**
 * 워커가 보고할 수 있는 실패 사유. 사람에게 보일 문구는 서버가 이 표에서 고르므로
 * 워커 채널로 들어온 임의 문자열(모델·런타임 오류 내용)은 저장되지 않는다.
 */
export const AGENT_JOB_ERRORS = {
  worker_execution_failed: 'AI 작업 실행에 실패했습니다.',
  invalid_mention: '멘션 형식이 아닌 요청이에요.',
  rewrite_target_missing: '고칠 문단을 찾지 못했어요. 고칠 문단 바로 아래 줄에 @교정을 써 주세요.',
  rewrite_target_removed: '고칠 문단이 그 사이에 사라졌어요.',
  rewrite_target_pending: '아직 검토하지 않은 AI 제안이 있는 문단이에요. 먼저 수락하거나 거절해 주세요.',
} as const;

export type AgentJobErrorCode = keyof typeof AGENT_JOB_ERRORS;

export function isAgentJobErrorCode(value: unknown): value is AgentJobErrorCode {
  return typeof value === 'string' && Object.hasOwn(AGENT_JOB_ERRORS, value);
}
