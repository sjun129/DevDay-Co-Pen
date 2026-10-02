import { randomUUID } from 'node:crypto';
import { Server } from '@hocuspocus/server';
import {
  extractMentionPrompt,
  parseStatelessMessage,
  type AgentStatelessMessage,
} from '@co-pen/shared';
import { dispatchJob, dispatchJoin, dispatchLeave, dispatchUndo } from './agent-dispatch';
import { createActorStore } from './actors';
import { authenticateConnection, type ConnectionContext } from './authentication';
import { env } from './env';
import { createIdentityRequestHandler } from './identity-http';
import { createPersistence } from './persistence';

/** 방별 사람 접속 수. 첫 사람이 들어오면 에이전트를 부르고, 마지막 사람이 나가면 내보낸다. */
const humansInRoom = new Map<string, number>();
const actorStore = createActorStore(env);
const handleIdentityRequest = createIdentityRequestHandler(actorStore, env.guestTokenSecret);

console.info(
  `[startup] environment=${env.appEnvironment} persistence=${env.persistenceBackend} database=${env.persistenceBackend === 'supabase' ? 'configured' : 'local-file'}`,
);

function logDispatchError(error: unknown) {
  console.error('[agent-dispatch]', error);
}

const server = new Server<ConnectionContext>({
  name: 'co-pen-sync',
  port: env.port,
  debounce: 2000,
  maxDebounce: 10000,
  extensions: [createPersistence(env)],

  async onRequest({ request, response }) {
    if (await handleIdentityRequest(request, response)) {
      // Hocuspocus treats an empty rejection as "handled" and skips its default HTTP response.
      throw null;
    }
  },

  async onAuthenticate({ token }) {
    return authenticateConnection(token, env);
  },

  async connected({ context, documentName }) {
    if (context.kind !== 'human') return;
    const count = (humansInRoom.get(documentName) ?? 0) + 1;
    humansInRoom.set(documentName, count);
    if (count === 1) dispatchJoin(documentName).catch(logDispatchError);
  },

  async onDisconnect({ context, documentName }) {
    if (context.kind !== 'human') return;
    const count = (humansInRoom.get(documentName) ?? 1) - 1;
    if (count > 0) {
      humansInRoom.set(documentName, count);
      return;
    }
    humansInRoom.delete(documentName);
    dispatchLeave(documentName).catch(logDispatchError);
  },

  async onStateless({ payload, document, documentName, connection }) {
    const message = parseStatelessMessage(payload);
    if (!message) return;

    const { kind } = connection.context as ConnectionContext;

    if (message.type === 'agent:status') {
      if (kind === 'agent') document.broadcastStateless(payload);
      return;
    }
    if (kind !== 'human') return;

    try {
      if (message.type === 'agent:mention') {
        // L1: 지시는 사람이 친 멘션 문단에서만 나온다. 클라이언트가 보낸 prompt를 믿지 않고 다시 꺼낸다.
        const prompt =
          typeof message.mentionText === 'string' ? extractMentionPrompt(message.mentionText) : null;
        if (!prompt || typeof message.stateVector !== 'string') return;

        const jobId = randomUUID();
        const queued: AgentStatelessMessage = { type: 'agent:status', jobId, status: 'queued' };
        document.broadcastStateless(JSON.stringify(queued));
        await dispatchJob({
          jobId,
          documentName,
          prompt,
          requestedBy: String(message.requestedBy).slice(0, 40),
          mentionText: message.mentionText.trim(),
          stateVector: message.stateVector,
        });
      } else {
        await dispatchUndo({ documentName, requestedBy: message.requestedBy });
      }
    } catch (error) {
      logDispatchError(error);
      const failed: AgentStatelessMessage = {
        type: 'agent:status',
        jobId: 'dispatch',
        status: 'error',
        message: '에이전트 워커에 연결할 수 없습니다.',
      };
      document.broadcastStateless(JSON.stringify(failed));
    }
  },
});

await server.listen();
