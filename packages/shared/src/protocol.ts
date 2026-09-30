/**
 * 메시지 흐름
 *   브라우저 --stateless--> 동기화 서버 --HTTP--> 에이전트 워커
 *   에이전트 워커 --stateless--> 동기화 서버 --broadcast--> 브라우저
 */

import type { AgentId } from './agents';

export type ClientStatelessMessage =
  | {
      type: 'agent:mention';
      prompt: string;
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
  message?: string;
};

export type StatelessMessage = ClientStatelessMessage | AgentStatelessMessage;

const STATELESS_TYPES = new Set<StatelessMessage['type']>([
  'agent:mention',
  'agent:undo',
  'agent:status',
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
}

/** POST /undo */
export interface AgentUndoRequest extends AgentRoomRequest {
  requestedBy: string;
  agentId?: AgentId;
}

export const AGENT_SECRET_HEADER = 'x-co-pen-agent-secret';
