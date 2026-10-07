import * as Y from 'yjs';
import {
  AGENT_ORIGIN,
  AGENT_JOB_ERRORS,
  AGENT_ROLES,
  AI_DELETION_MARK,
  AI_SUGGESTION_MARK,
  parseMention,
  textHash,
  type AgentJobErrorCode,
  type AgentJobRequest,
  type AgentJobTransitionRequest,
  type AgentJobTransitionResponse,
} from '@co-pen/shared';
import {
  anchorAfterEachBlock,
  blockId,
  blockText,
  findMentionBlock,
  formatBlock,
  getFragment,
  hasPendingAiMark,
  insertParagraph,
  resolveBlockIndex,
  summarizeBlocks,
  type BlockSummary,
} from './doc-model';
import { env } from './env';
import { lockBlock } from './guard/block-locks';
import { StreamSanitizer } from './guard/output-sanitizer';
import { rewriteTarget } from './guard/plan-guard';
import { requestJobTransition } from './job-callback';
import { planEdit, streamDraft, streamRewrite } from './llm';
import type { AgentSession } from './session';
import { StreamWriter } from './stream-writer';

const SYNC_WAIT_TIMEOUT_MS = 3000;

export interface RunJobDependencies {
  transition(request: AgentJobTransitionRequest): Promise<AgentJobTransitionResponse>;
  plan: typeof planEdit;
  stream: typeof streamDraft;
  rewrite: typeof streamRewrite;
}

const DEFAULT_DEPENDENCIES: RunJobDependencies = {
  transition: requestJobTransition,
  plan: planEdit,
  stream: streamDraft,
  rewrite: streamRewrite,
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

/** 요청자에게 보여 줄 수 있는 실패 사유. 문구는 AGENT_JOB_ERRORS 표에서만 나온다. */
export class JobError extends Error {
  constructor(readonly code: AgentJobErrorCode) {
    super(code);
  }
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
  errorCode: AgentJobErrorCode,
): Promise<void> {
  try {
    await dependencies.transition({
      jobId: job.jobId,
      documentName: job.documentName,
      expectedStatus,
      nextStatus: 'error',
      errorCode,
      errorMessage: AGENT_JOB_ERRORS[errorCode],
    });
  } catch {
    // The Sync Server recovery path will terminalize a stale active job.
  }
}

interface JobContext {
  session: AgentSession;
  job: AgentJobRequest;
  dependencies: RunJobDependencies;
  prompt: string;
  blocks: BlockSummary[];
  mentionIndex: number;
  /** 문서를 건드리기 직전에 부른다. planning -> writing CAS를 얻지 못하면 false */
  claimWriting: () => Promise<boolean>;
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
    const { doc, agentId } = session;
    // L1: 지시와 담당 에이전트는 사람이 친 멘션 문단에서만 꺼낸다
    const mention = parseMention(job.mentionText);
    if (!mention || mention.agentId !== agentId) throw new JobError('invalid_mention');

    await waitForRequesterState(doc, job.stateVector);
    const blocks = summarizeBlocks(getFragment(doc));
    const context: JobContext = {
      session,
      job,
      dependencies,
      prompt: mention.prompt,
      blocks,
      mentionIndex: findMentionBlock(blocks, job.mentionText),
      async claimWriting() {
        // No Yjs mutation is allowed until the durable planning -> writing CAS succeeds.
        if (!(await transition(dependencies, job, 'planning', 'writing'))) return false;
        ownedStatus = 'writing';
        return true;
      },
    };

    // 역할마다 할 수 있는 행동은 하나뿐이다 (L3)
    const wrote =
      AGENT_ROLES[agentId].action === 'rewrite' ? await rewriteBlock(context) : await insertDraft(context);
    if (wrote) await transition(dependencies, job, 'writing', 'done');
  } catch (error) {
    await reportFailure(
      dependencies,
      job,
      ownedStatus,
      error instanceof JobError ? error.code : 'worker_execution_failed',
    );
    throw error;
  }
}

/** 초안 작성자: 허용된 위치 뒤에 새 문단을 쓴다 */
async function insertDraft({ session, job, dependencies, prompt, blocks, mentionIndex, claimWriting }: JobContext) {
  const { doc } = session;
  const fragment = getFragment(doc);
  // 계획(LLM 호출) 전에 앵커를 걸어 두어야 그 사이의 사람 편집에도 위치가 유지된다
  const anchors = anchorAfterEachBlock(fragment);
  const nodes = fragment.toArray();
  const plan = await dependencies.plan({ prompt, blocks, mentionIndex });

  // 다른 에이전트가 이 문단을 고쳐 쓰는 중이면 끝날 때까지 기다린다
  const anchorBlock = nodes[plan.targetIndex];
  const release = anchorBlock ? await lockBlock(session.documentName, blockId(anchorBlock)) : () => {};
  try {
    if (!(await claimWriting())) return false;
    session.undoManager.stopCapturing();
    let target!: Y.XmlText;
    doc.transact(() => {
      target = insertParagraph(fragment, resolveBlockIndex(doc, anchors[plan.targetIndex]));
    }, AGENT_ORIGIN);

    await streamInto(
      session,
      job,
      target,
      dependencies.stream({ prompt, targetIndex: plan.targetIndex, blocks, sources: job.sources }),
    );
    return true;
  } finally {
    release();
  }
}

/**
 * 문체 교정자: 멘션 바로 위 문단 하나를 고쳐 쓴다.
 * 원문은 지우지 않고 aiDeletion 표시만 하고, 수정본을 바로 아래 새 문단에 제안으로 쓴다.
 * 원문 지문(base)을 함께 남겨 두어, 수락할 때 그 사이 사람이 원문을 고쳤는지 알 수 있다.
 */
async function rewriteBlock({ session, job, dependencies, prompt, blocks, mentionIndex, claimWriting }: JobContext) {
  const { doc, agentId } = session;
  const fragment = getFragment(doc);

  const targetIndex = rewriteTarget(blocks, mentionIndex);
  const block = fragment.toArray()[targetIndex];
  if (!(block instanceof Y.XmlElement)) throw new JobError('rewrite_target_missing');

  const release = await lockBlock(session.documentName, blockId(block));
  try {
    // 기다리는 동안 문단이 지워졌거나 다른 제안이 붙었을 수 있다
    const index = fragment.toArray().indexOf(block);
    const original = blockText(block);
    if (index < 0 || !original.trim()) throw new JobError('rewrite_target_removed');
    if (hasPendingAiMark(block, [AI_SUGGESTION_MARK, AI_DELETION_MARK])) {
      throw new JobError('rewrite_target_pending');
    }

    if (!(await claimWriting())) return false;
    session.undoManager.stopCapturing();
    let target!: Y.XmlText;
    doc.transact(() => {
      formatBlock(block, {
        [AI_DELETION_MARK]: { jobId: job.jobId, agentId, base: textHash(original) },
      });
      target = insertParagraph(fragment, index + 1);
    }, AGENT_ORIGIN);

    await streamInto(session, job, target, dependencies.rewrite({ prompt, original }));
    return true;
  } finally {
    release();
  }
}

async function streamInto(
  session: AgentSession,
  job: AgentJobRequest,
  target: Y.XmlText,
  stream: AsyncIterable<string>,
) {
  const writer = new StreamWriter(
    session.doc,
    getFragment(session.doc),
    target,
    session.provider.awareness,
    env.flushIntervalMs,
    job.jobId,
    session.agentId,
  );
  // L4: 모델 출력은 정화기를 거쳐서만 문서에 들어간다
  const sanitizer = new StreamSanitizer();
  try {
    for await (const chunk of stream) {
      writer.push(sanitizer.push(chunk));
      if (sanitizer.exhausted) break;
    }
    writer.push(sanitizer.end());
    writer.close();
  } catch (error) {
    // 모델 호출이 실패하면 이 작업이 문서에 남긴 것(새 문단, 원문 표시)을 되돌린다
    writer.close();
    session.undoManager.undo();
    throw error;
  }
}
