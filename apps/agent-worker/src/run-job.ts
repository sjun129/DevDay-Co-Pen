import * as Y from 'yjs';
import {
  AGENT_ORIGIN,
  extractMentionPrompt,
  type AgentJobRequest,
  type AgentJobTransitionRequest,
  type AgentJobTransitionResponse,
} from '@co-pen/shared';
import {
  anchorAfterEachBlock,
  findMentionBlock,
  getFragment,
  insertParagraph,
  resolveBlockIndex,
  summarizeBlocks,
} from './doc-model';
import { env } from './env';
import { StreamSanitizer } from './guard/output-sanitizer';
import { requestJobTransition } from './job-callback';
import { planEdit, streamDraft } from './llm';
import type { AgentSession } from './session';
import { StreamWriter } from './stream-writer';

const SYNC_WAIT_TIMEOUT_MS = 3000;

export interface RunJobDependencies {
  transition(request: AgentJobTransitionRequest): Promise<AgentJobTransitionResponse>;
  plan: typeof planEdit;
  stream: typeof streamDraft;
}

const DEFAULT_DEPENDENCIES: RunJobDependencies = {
  transition: requestJobTransition,
  plan: planEdit,
  stream: streamDraft,
};

function hasSeen(doc: Y.Doc, required: Map<number, number>): boolean {
  const current = Y.decodeStateVector(Y.encodeStateVector(doc));
  for (const [client, clock] of required) {
    if ((current.get(client) ?? 0) < clock) return false;
  }
  return true;
}

function waitForRequesterState(doc: Y.Doc, stateVector: string): Promise<void> {
  const required = Y.decodeStateVector(Buffer.from(stateVector, 'base64'));
  if (hasSeen(doc, required)) return Promise.resolve();

  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      doc.off('update', onUpdate);
      resolve();
    };
    const onUpdate = () => {
      if (hasSeen(doc, required)) finish();
    };
    const timer = setTimeout(finish, SYNC_WAIT_TIMEOUT_MS);
    doc.on('update', onUpdate);
  });
}

async function transition(
  dependencies: RunJobDependencies,
  job: AgentJobRequest,
  expectedStatus: AgentJobTransitionRequest['expectedStatus'],
  nextStatus: AgentJobTransitionRequest['nextStatus'],
): Promise<boolean> {
  const response = await dependencies.transition({
    jobId: job.jobId,
    documentName: job.documentName,
    expectedStatus,
    nextStatus,
  });
  return response.transitioned && response.status === nextStatus;
}

async function reportFailure(
  dependencies: RunJobDependencies,
  job: AgentJobRequest,
  expectedStatus: 'planning' | 'writing',
): Promise<void> {
  try {
    await dependencies.transition({
      jobId: job.jobId,
      documentName: job.documentName,
      expectedStatus,
      nextStatus: 'error',
      errorCode: 'worker_execution_failed',
      errorMessage: 'AI 작업 실행에 실패했습니다.',
    });
  } catch {
    // The Sync Server recovery path will terminalize a stale active job.
  }
}

export async function runJob(
  session: AgentSession,
  job: AgentJobRequest,
  dependencies: RunJobDependencies = DEFAULT_DEPENDENCIES,
) {
  // The queued -> planning CAS is the exclusive execution claim. Duplicate dispatches stop here.
  if (!(await transition(dependencies, job, 'queued', 'planning'))) return;
  let ownedStatus: 'planning' | 'writing' = 'planning';

  try {
    const { doc } = session;
    const fragment = getFragment(doc);
    const prompt = extractMentionPrompt(job.mentionText);
    if (!prompt) throw new Error('invalid_mention');

    await waitForRequesterState(doc, job.stateVector);
    const blocks = summarizeBlocks(fragment);
    const anchors = anchorAfterEachBlock(fragment);
    const plan = await dependencies.plan({
      prompt,
      blocks,
      mentionIndex: findMentionBlock(blocks, job.mentionText),
    });

    // No Yjs mutation is allowed until the durable planning -> writing CAS succeeds.
    if (!(await transition(dependencies, job, 'planning', 'writing'))) return;
    ownedStatus = 'writing';

    session.undoManager.stopCapturing();
    let target!: Y.XmlText;
    doc.transact(() => {
      target = insertParagraph(fragment, resolveBlockIndex(doc, anchors[plan.targetIndex]));
    }, AGENT_ORIGIN);

    const writer = new StreamWriter(
      doc,
      fragment,
      target,
      session.provider.awareness,
      env.flushIntervalMs,
      job.jobId,
    );
    const sanitizer = new StreamSanitizer();
    try {
      for await (const chunk of dependencies.stream({
        prompt,
        targetIndex: plan.targetIndex,
        blocks,
      })) {
        writer.push(sanitizer.push(chunk));
        if (sanitizer.exhausted) break;
      }
      writer.push(sanitizer.end());
    } finally {
      writer.close();
    }
    await transition(dependencies, job, 'writing', 'done');
  } catch (error) {
    await reportFailure(dependencies, job, ownedStatus);
    throw error;
  }
}
