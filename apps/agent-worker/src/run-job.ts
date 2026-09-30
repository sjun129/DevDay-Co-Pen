import * as Y from 'yjs';
import { AGENT_ORIGIN, extractMentionPrompt, type AgentJobRequest } from '@co-pen/shared';
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
import { planEdit, streamDraft } from './llm';
import type { AgentSession } from './session';
import { StreamWriter } from './stream-writer';

const SYNC_WAIT_TIMEOUT_MS = 3000;

function hasSeen(doc: Y.Doc, required: Map<number, number>): boolean {
  const current = Y.decodeStateVector(Y.encodeStateVector(doc));
  for (const [client, clock] of required) {
    if ((current.get(client) ?? 0) < clock) return false;
  }
  return true;
}

/**
 * 작업 요청은 HTTP로, 문서 변경은 WebSocket으로 따로 오므로 요청이 먼저 도착할 수 있다.
 * 요청자가 보낸 state vector만큼 워커 문서가 따라잡을 때까지 기다린다.
 * 그렇지 않으면 멘션 직후 Enter로 생긴 빈 줄과 AI 문단이 같은 자리에 동시 삽입되어 순서가 무작위가 된다.
 */
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

export async function runJob(session: AgentSession, job: AgentJobRequest) {
  const { doc } = session;
  const fragment = getFragment(doc);
  const status = (value: 'planning' | 'writing' | 'done') =>
    session.sendStatus({ type: 'agent:status', jobId: job.jobId, status: value });

  // L1: 지시는 사람이 친 멘션 문단에서만 꺼낸다
  const prompt = extractMentionPrompt(job.mentionText);
  if (!prompt) throw new Error('멘션 형식이 아닌 요청');

  status('planning');
  await waitForRequesterState(doc, job.stateVector);
  const blocks = summarizeBlocks(fragment);
  // 계획(LLM 호출) 전에 앵커를 걸어 두어야 그 사이의 사람 편집에도 위치가 유지된다
  const anchors = anchorAfterEachBlock(fragment);
  const plan = await planEdit({
    prompt,
    blocks,
    mentionIndex: findMentionBlock(blocks, job.mentionText),
  });

  session.undoManager.stopCapturing();
  let target!: Y.XmlText;
  doc.transact(() => {
    target = insertParagraph(fragment, resolveBlockIndex(doc, anchors[plan.targetIndex]));
  }, AGENT_ORIGIN);

  status('writing');
  const writer = new StreamWriter(
    doc,
    fragment,
    target,
    session.provider.awareness,
    env.flushIntervalMs,
    job.jobId,
  );
  // L4: 모델 출력은 정화기를 거쳐서만 문서에 들어간다
  const sanitizer = new StreamSanitizer();
  try {
    for await (const chunk of streamDraft({ prompt, targetIndex: plan.targetIndex, blocks })) {
      writer.push(sanitizer.push(chunk));
      if (sanitizer.exhausted) break;
    }
    writer.push(sanitizer.end());
    writer.close();
  } catch (error) {
    // 모델 호출이 실패하면 이 작업이 넣은 문단을 남기지 않는다
    writer.close();
    session.undoManager.undo();
    throw error;
  }
  status('done');
}
