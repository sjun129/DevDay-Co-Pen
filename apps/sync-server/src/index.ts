import { Server } from '@hocuspocus/server';
import { parseStatelessMessage, type AgentStatelessMessage } from '@co-pen/shared';
import { dispatchJob, dispatchJoin, dispatchLeave, dispatchUndo } from './agent-dispatch';
import { createActorStore } from './actors';
import type { ConnectionContext } from './authentication';
import { authenticateDocumentConnection } from './document-access';
import { createDocumentRequestHandler } from './document-http';
import { env } from './env';
import { createIdentityRequestHandler } from './identity-http';
import { createJobAuditStore } from './job-audit-store';
import { createJobRequestHandler } from './job-http';
import { DurableJobRuntime, JobRuntimeError, jobStatusMessage } from './job-runtime';
import { createDocumentStore, createPersistence } from './persistence';

/** 방별 사람 접속 수. 첫 사람이 들어오면 에이전트를 부르고, 마지막 사람이 나가면 내보낸다. */
const humansInRoom = new Map<string, number>();
const actorStore = createActorStore(env);
const documentStore = createDocumentStore(env);
const handleIdentityRequest = createIdentityRequestHandler(actorStore, env.guestTokenSecret);
const handleDocumentRequest = createDocumentRequestHandler(
  documentStore,
  actorStore,
  env.guestTokenSecret,
);
const jobAuditStore = env.persistenceBackend === 'supabase' ? createJobAuditStore(env) : null;

console.info(
  `[startup] environment=${env.appEnvironment} persistence=${env.persistenceBackend} database=${env.persistenceBackend === 'supabase' ? 'configured' : 'local-file'}`,
);

function logDispatchError(error: unknown) {
  void error;
  console.error('[agent-dispatch] request failed');
}

let server!: Server<ConnectionContext>;
const jobRuntime = jobAuditStore
  ? new DurableJobRuntime({
      store: jobAuditStore,
      documentStore,
      dispatchJob,
      broadcast(documentName, message) {
        server.hocuspocus.documents
          .get(documentName)
          ?.broadcastStateless(JSON.stringify(message));
      },
    })
  : null;
const handleJobRequest = createJobRequestHandler({
  runtime: jobRuntime,
  store: jobAuditStore,
  documentStore,
  actorStore,
  guestTokenSecret: env.guestTokenSecret,
  agentSharedSecret: env.agentSharedSecret,
});

server = new Server<ConnectionContext>({
  name: 'co-pen-sync',
  port: env.port,
  debounce: 2000,
  maxDebounce: 10000,
  extensions: [createPersistence(documentStore)],

  async onRequest({ request, response }) {
    if (
      (await handleIdentityRequest(request, response)) ||
      (await handleDocumentRequest(request, response)) ||
      (await handleJobRequest(request, response))
    ) {
      // Hocuspocus treats an empty rejection as "handled" and skips its default HTTP response.
      throw null;
    }
  },

  async onAuthenticate({ token, documentName }) {
    return authenticateDocumentConnection(token, documentName, env, documentStore, actorStore);
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

  async onStateless({ payload, documentName, connection }) {
    const message = parseStatelessMessage(payload);
    if (!message) return;

    const { kind, actorId } = connection.context as ConnectionContext;
    if (message.type === 'agent:status') {
      // Runtime status is accepted only through the authenticated HTTP callback and DB CAS.
      return;
    }
    if (kind !== 'human') return;

    try {
      if (message.type === 'agent:mention') {
        if (!jobRuntime) {
          connection.sendStateless(
            JSON.stringify({
              type: 'agent:status',
              jobId: 'request',
              status: 'error',
              idempotencyKey:
                typeof message.idempotencyKey === 'string' ? message.idempotencyKey : undefined,
              message: '이 환경에서는 영속 AI 작업을 사용할 수 없습니다.',
            } satisfies AgentStatelessMessage),
          );
          return;
        }
        const result = await jobRuntime.acceptMention({
          documentName,
          actorId,
          actorNameSnapshot: message.requestedBy,
          idempotencyKey: message.idempotencyKey,
          mentionText: message.mentionText,
          stateVector: message.stateVector,
        });
        if (!result.created) {
          connection.sendStateless(JSON.stringify(jobStatusMessage(result.job)));
        }
      } else {
        await dispatchUndo({ documentName, requestedBy: message.requestedBy });
      }
    } catch (error) {
      const runtimeError = error instanceof JobRuntimeError ? error : null;
      console.error(`[agent-job] ${runtimeError?.code ?? 'request_failed'}`);
      const failed: AgentStatelessMessage = {
        type: 'agent:status',
        jobId: runtimeError?.jobId ?? 'request',
        status: 'error',
        idempotencyKey: runtimeError?.idempotencyKey,
        message:
          runtimeError?.code === 'idempotency_conflict'
            ? '같은 요청 키가 다른 내용에 사용되었습니다.'
            : runtimeError?.code === 'invalid_agent_request'
              ? 'AI 요청 형식이 올바르지 않습니다.'
              : 'AI 요청을 안전하게 저장하지 못했습니다.',
      };
      connection.sendStateless(JSON.stringify(failed));
    }
  },
});

if (jobRuntime) {
  const recovery = await jobRuntime.recoverOnStartup(env.jobStaleAfterMs);
  console.info(
    `[job-recovery] queued_dispatched=${recovery.queuedDispatched} queued_failed=${recovery.queuedFailed} stale_failed=${recovery.staleFailed}`,
  );
}

await server.listen();
