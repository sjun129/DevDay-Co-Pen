import {
  AGENT_SECRET_HEADER,
  type AgentJobRequest,
  type AgentRoomRequest,
  type AgentUndoRequest,
} from '@co-pen/shared';
import { env } from './env';

async function post(pathname: string, body: AgentRoomRequest) {
  const response = await fetch(new URL(pathname, env.agentWorkerUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      [AGENT_SECRET_HEADER]: env.agentSharedSecret,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`agent worker ${pathname} 응답 ${response.status}: ${await response.text()}`);
  }
}

export const dispatchJoin = (documentName: string) => post('/join', { documentName });
export const dispatchLeave = (documentName: string) => post('/leave', { documentName });
export const dispatchJob = (job: AgentJobRequest) => post('/jobs', job);
export const dispatchUndo = (request: AgentUndoRequest) => post('/undo', request);
