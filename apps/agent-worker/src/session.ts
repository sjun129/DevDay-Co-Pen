import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import {
  AGENT_IDS,
  AGENT_ORIGIN,
  agentUser,
  type AgentId,
  type AgentJobRequest,
} from '@co-pen/shared';
import { getFragment } from './doc-model';
import { env } from './env';
import { runJob } from './run-job';

/**
 * F4: 에이전트는 (방, 역할)마다 헤드리스 Yjs 클라이언트로 접속한다.
 * 서버 입장에서는 사람 브라우저와 똑같은 참여자다.
 * 역할마다 문서 사본·커서·undo 기록·작업 큐가 따로라서 서로 다른 에이전트는 병렬로 일한다.
 */
export class AgentSession {
  readonly doc = new Y.Doc();
  readonly provider: HocuspocusProvider;
  /** F9: AGENT_ORIGIN 트랜잭션만 추적하므로 undo해도 사람 편집은 그대로 남는다 */
  readonly undoManager: Y.UndoManager;
  private readonly synced: Promise<void>;
  private queue: Promise<void> = Promise.resolve();

  constructor(
    readonly documentName: string,
    readonly agentId: AgentId,
  ) {
    let markSynced!: () => void;
    this.synced = new Promise((resolve) => (markSynced = resolve));

    this.provider = new HocuspocusProvider({
      url: env.syncServerUrl,
      name: documentName,
      document: this.doc,
      token: env.agentSharedSecret,
      onSynced: () => markSynced(),
    });
    this.provider.awareness?.setLocalStateField('user', agentUser(agentId));

    // 작업 하나 = undo 한 단계. 작업 시작마다 stopCapturing()으로 경계를 끊는다.
    this.undoManager = new Y.UndoManager(getFragment(this.doc), {
      trackedOrigins: new Set([AGENT_ORIGIN]),
      captureTimeout: Number.MAX_SAFE_INTEGER,
    });
  }

  enqueueJob(job: AgentJobRequest) {
    this.enqueue(async () => {
      try {
        await runJob(this, job);
      } catch {
        console.error(`[job ${job.jobId}] worker_execution_failed`);
      }
    });
  }

  enqueueUndo() {
    this.enqueue(async () => {
      this.undoManager.undo();
    });
  }

  destroy() {
    this.undoManager.destroy();
    this.provider.destroy();
    this.doc.destroy();
  }

  private enqueue(task: () => Promise<void>) {
    this.queue = this.queue.then(() => this.synced).then(task);
  }
}

const sessions = new Map<string, AgentSession>();
/** 방별로 가장 최근에 작업을 받은 에이전트 (대상 없이 온 되돌리기 요청용) */
const lastActive = new Map<string, AgentId>();

const sessionKey = (documentName: string, agentId: AgentId) => `${agentId}:${documentName}`;

export function joinSession(documentName: string, agentId: AgentId): AgentSession {
  const key = sessionKey(documentName, agentId);
  let session = sessions.get(key);
  if (!session) {
    session = new AgentSession(documentName, agentId);
    sessions.set(key, session);
    console.log(`[session] join ${documentName} (${agentId})`);
  }
  return session;
}

/** 첫 사람이 들어오면 모든 역할이 함께 입장한다 */
export function joinRoom(documentName: string) {
  for (const agentId of AGENT_IDS) joinSession(documentName, agentId);
}

export function leaveRoom(documentName: string) {
  for (const agentId of AGENT_IDS) {
    const key = sessionKey(documentName, agentId);
    sessions.get(key)?.destroy();
    if (sessions.delete(key)) console.log(`[session] leave ${documentName} (${agentId})`);
  }
  lastActive.delete(documentName);
}

export function enqueueJob(job: AgentJobRequest) {
  lastActive.set(job.documentName, job.agentId);
  joinSession(job.documentName, job.agentId).enqueueJob(job);
}

export function enqueueUndo(documentName: string, agentId?: AgentId) {
  const target = agentId ?? lastActive.get(documentName);
  if (target) joinSession(documentName, target).enqueueUndo();
}
