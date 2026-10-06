import assert from 'node:assert/strict';
import test from 'node:test';
import type { ClientStatelessMessage } from '@co-pen/shared';
import { PendingAgentMentions } from './pending-agent-mentions';

const KEY = '11111111-1111-4111-8111-111111111111';

test('timeout and reconnect retries reuse the same in-memory idempotency key', () => {
  const sent: Array<Extract<ClientStatelessMessage, { type: 'agent:mention' }>> = [];
  const scheduled: Array<() => void> = [];
  const queue = new PendingAgentMentions((message) => sent.push(message), {
    createId: () => KEY,
    schedule(callback) {
      scheduled.push(callback);
      return {} as ReturnType<typeof setTimeout>;
    },
    cancel() {},
  });
  const returned = queue.createAndSend({
    requestedBy: 'Requester',
    mentionText: '@AI 결론을 써줘',
    stateVector: 'AA==',
  });
  assert.equal(returned, KEY);
  scheduled.shift()!();
  queue.retryPending();
  assert.equal(sent.length, 3);
  assert.ok(sent.every((message) => message.idempotencyKey === KEY));
  queue.destroy();
});

test('durable status acknowledgment stops further retries', () => {
  const sent: Array<Extract<ClientStatelessMessage, { type: 'agent:mention' }>> = [];
  const scheduled: Array<() => void> = [];
  const queue = new PendingAgentMentions((message) => sent.push(message), {
    createId: () => KEY,
    schedule(callback) {
      scheduled.push(callback);
      return {} as ReturnType<typeof setTimeout>;
    },
    cancel() {},
  });
  queue.createAndSend({ requestedBy: 'Requester', mentionText: '@AI 요청', stateVector: 'AA==' });
  queue.acknowledge({
    type: 'agent:status',
    agentId: 'draft',
    jobId: '22222222-2222-4222-8222-222222222222',
    status: 'queued',
    idempotencyKey: KEY,
  });
  queue.retryPending();
  assert.equal(sent.length, 1);
  queue.destroy();
});
