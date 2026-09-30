import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import {
  AGENT_ORIGIN,
  AGENT_USER,
  type AgentJobRequest,
  type AgentStatelessMessage,
} from '@co-pen/shared';
import { getFragment } from './doc-model';
import { env } from './env';
import { runJob } from './run-job';

/**
 * F4: 에이전트는 방마다 헤드리스 Yjs 클라이언트로 접속한다.
 * 서버 입장에서는 사람 브라우저와 똑같은 참여자다.
 */
export class AgentSession {
  readonly doc = new Y.Doc();
  readonly provider: HocuspocusProvider;
  /** F9: AGENT_ORIGIN 트랜잭션만 추적하므로 undo해도 사람 편집은 그대로 남는다 */
  readonly undoManager: Y.UndoManager;
  private readonly synced: Promise<void>;
  private queue: Promise<void> = Promise.resolve();

  constructor(readonly documentName: string) {
    let markSynced!: () => void;
    this.synced = new Promise((resolve) => (markSynced = resolve));

    this.provider = new HocuspocusProvider({
      url: env.syncServerUrl,
      name: documentName,
      document: this.doc,
      token: env.agentSharedSecret,
      onSynced: () => markSynced(),
    });
    this.provider.awareness?.setLocalStateField('user', AGENT_USER);

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
      } catch (error) {
        console.error(`[job ${job.jobId}]`, error);
        this.sendStatus({ type: 'agent:status', jobId: job.jobId, status: 'error', message: String(error) });
      }
    });
  }

  enqueueUndo() {
    this.enqueue(async () => {
      this.undoManager.undo();
    });
  }

  sendStatus(message: AgentStatelessMessage) {
    this.provider.sendStateless(JSON.stringify(message));
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

export function joinSession(documentName: string): AgentSession {
  let session = sessions.get(documentName);
  if (!session) {
    session = new AgentSession(documentName);
    sessions.set(documentName, session);
    console.log(`[session] join ${documentName}`);
  }
  return session;
}

export function leaveSession(documentName: string) {
  sessions.get(documentName)?.destroy();
  if (sessions.delete(documentName)) console.log(`[session] leave ${documentName}`);
}
