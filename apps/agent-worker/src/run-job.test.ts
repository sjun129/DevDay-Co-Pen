import assert from 'node:assert/strict';
import test from 'node:test';
import * as Y from 'yjs';
import {
  DOC_FIELD,
  type AgentJobRequest,
  type AgentJobStatus,
  type AgentJobTransitionRequest,
  type AgentJobTransitionResponse,
} from '@co-pen/shared';
import { runJob, type RunJobDependencies } from './run-job';
import type { AgentSession } from './session';

const JOB: AgentJobRequest = {
  jobId: '11111111-1111-4111-8111-111111111111',
  documentName: '22222222-2222-4222-8222-222222222222',
  prompt: '결론을 써줘',
  requestedBy: 'Requester',
  mentionText: '@AI 결론을 써줘',
  stateVector: '',
};

function fixture() {
  const doc = new Y.Doc();
  const paragraph = new Y.XmlElement('paragraph');
  const text = new Y.XmlText();
  text.insert(0, JOB.mentionText);
  paragraph.insert(0, [text]);
  doc.getXmlFragment(DOC_FIELD).insert(0, [paragraph]);
  const session = {
    doc,
    provider: { awareness: null },
    undoManager: { stopCapturing() {} },
  } as unknown as AgentSession;
  return { doc, session, job: { ...JOB, stateVector: Buffer.from(Y.encodeStateVector(doc)).toString('base64') } };
}

function lifecycle(overrides: Partial<RunJobDependencies> = {}) {
  let status: AgentJobStatus = 'queued';
  const calls: AgentJobTransitionRequest[] = [];
  const dependencies: RunJobDependencies = {
    async transition(request): Promise<AgentJobTransitionResponse> {
      calls.push(request);
      if (status !== request.expectedStatus) {
        return { jobId: request.jobId, status, transitioned: false };
      }
      status = request.nextStatus;
      return { jobId: request.jobId, status, transitioned: true };
    },
    async plan() {
      return { targetIndex: 0, action: 'insert_after' };
    },
    stream() {
      return (async function* () {
        yield '작성 결과';
      })();
    },
    ...overrides,
  };
  return { dependencies, calls, status: () => status };
}

test('planning callback failure prevents planning and all Yjs mutation', async () => {
  const { doc, session, job } = fixture();
  const before = Y.encodeStateAsUpdate(doc);
  const { dependencies } = lifecycle({
    async transition() {
      throw new Error('callback unavailable');
    },
  });
  await assert.rejects(() => runJob(session, job, dependencies));
  assert.deepEqual(Y.encodeStateAsUpdate(doc), before);
  doc.destroy();
});

test('writing callback rejection prevents insertion and streaming', async () => {
  const { doc, session, job } = fixture();
  const before = Y.encodeStateAsUpdate(doc);
  let streamCalls = 0;
  const { dependencies } = lifecycle({
    async transition(request) {
      if (request.nextStatus === 'planning') {
        return { jobId: request.jobId, status: 'planning', transitioned: true };
      }
      return { jobId: request.jobId, status: 'error', transitioned: false };
    },
    stream() {
      streamCalls += 1;
      return (async function* () {})();
    },
  });
  await runJob(session, job, dependencies);
  assert.equal(streamCalls, 0);
  assert.deepEqual(Y.encodeStateAsUpdate(doc), before);
  doc.destroy();
});

test('duplicate dispatch obtains one planning claim and mutates once', async () => {
  const { doc, session, job } = fixture();
  const control = lifecycle();
  await Promise.all([
    runJob(session, job, control.dependencies),
    runJob(session, job, control.dependencies),
  ]);
  assert.equal(
    control.calls.filter((call) => call.expectedStatus === 'queued' && call.nextStatus === 'planning').length,
    2,
  );
  assert.equal(doc.getXmlFragment(DOC_FIELD).length, 2);
  assert.equal(control.status(), 'done');
  doc.destroy();
});

test('execution failure reports a bounded durable error transition', async () => {
  const { doc, session, job } = fixture();
  const control = lifecycle({
    async plan() {
      throw new Error('raw provider details must not be forwarded');
    },
  });
  await assert.rejects(() => runJob(session, job, control.dependencies));
  const failure = control.calls.at(-1)!;
  assert.equal(failure.expectedStatus, 'planning');
  assert.equal(failure.nextStatus, 'error');
  assert.equal(failure.errorCode, 'worker_execution_failed');
  assert.equal(failure.errorMessage, 'AI 작업 실행에 실패했습니다.');
  assert.equal(JSON.stringify(failure).includes('raw provider details'), false);
  doc.destroy();
});
