import {
  AGENT_SECRET_HEADER,
  type AgentJobRequest,
  type AgentRoomRequest,
  type AgentUndoRequest,
} from '@co-pen/shared';
import { env } from './env';

/** 워커가 아직 부팅 중일 때 기다리는 최대 시간. 무료 등급 콜드 스타트에서 동기화 서버가 먼저 뜬다. */
const WORKER_BOOT_WAIT_MS = 30_000;

/** 연결 거부는 요청이 워커에 닿지 않았다는 뜻이라 다시 보내도 작업이 두 번 실행되지 않는다 */
function isConnectionRefused(error: unknown): boolean {
  return (error as { cause?: { code?: string } })?.cause?.code === 'ECONNREFUSED';
}

async function post(pathname: string, body: AgentRoomRequest) {
  const deadline = Date.now() + WORKER_BOOT_WAIT_MS;
  for (;;) {
    let response: Response;
    try {
      response = await fetch(new URL(pathname, env.agentWorkerUrl), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          [AGENT_SECRET_HEADER]: env.agentSharedSecret,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5_000),
      });
    } catch (error) {
      if (!isConnectionRefused(error) || Date.now() > deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }
    if (!response.ok) {
      throw new Error(`agent_dispatch_failed:${response.status}`);
    }
    return;
  }
}

export const dispatchJoin = (documentName: string) => post('/join', { documentName });
export const dispatchLeave = (documentName: string) => post('/leave', { documentName });
export const dispatchJob = (job: AgentJobRequest) => post('/jobs', job);
export const dispatchUndo = (request: AgentUndoRequest) => post('/undo', request);
