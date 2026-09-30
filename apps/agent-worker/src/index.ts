import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import {
  AGENT_SECRET_HEADER,
  type AgentJobRequest,
  type AgentRoomRequest,
  type AgentUndoRequest,
} from '@co-pen/shared';
import { env } from './env';
import { llmMode } from './llm';
import { joinSession, leaveSession } from './session';

type Handler = (body: unknown) => void;

const routes: Record<string, Handler> = {
  '/join': (body) => joinSession((body as AgentRoomRequest).documentName),
  '/leave': (body) => leaveSession((body as AgentRoomRequest).documentName),
  '/jobs': (body) => {
    const job = body as AgentJobRequest;
    joinSession(job.documentName).enqueueJob(job);
  },
  '/undo': (body) => joinSession((body as AgentUndoRequest).documentName).enqueueUndo(),
};

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function reply(response: ServerResponse, status: number, body?: object) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(body ? JSON.stringify(body) : undefined);
}

const server = createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    return reply(response, 200, { ok: true, llm: llmMode });
  }

  const handler = request.method === 'POST' && request.url ? routes[request.url] : undefined;
  if (!handler) return reply(response, 404);
  if (request.headers[AGENT_SECRET_HEADER] !== env.agentSharedSecret) return reply(response, 401);

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return reply(response, 400, { error: 'invalid json' });
  }

  // 작업은 방별 큐에서 비동기로 진행되고, 진행 상황은 stateless 메시지로 방에 알린다
  handler(body);
  reply(response, 202, { accepted: true });
});

server.listen(env.port, () => {
  console.log(`[agent-worker] http://localhost:${env.port} · sync ${env.syncServerUrl} · llm ${llmMode}`);
});
