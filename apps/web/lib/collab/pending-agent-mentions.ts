import type { AgentStatelessMessage, ClientStatelessMessage } from '@co-pen/shared';

const ACK_RETRY_MS = 3_000;
const MAX_SEND_ATTEMPTS = 3;

export type AgentMentionInput = Omit<
  Extract<ClientStatelessMessage, { type: 'agent:mention' }>,
  'type' | 'idempotencyKey'
>;

interface PendingMention {
  message: Extract<ClientStatelessMessage, { type: 'agent:mention' }>;
  attempts: number;
  timer?: ReturnType<typeof setTimeout>;
}

interface PendingMentionQueueOptions {
  createId?: () => string;
  schedule?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  cancel?: (timer: ReturnType<typeof setTimeout>) => void;
}

export class PendingAgentMentions {
  private readonly pending = new Map<string, PendingMention>();
  private readonly createId: () => string;
  private readonly schedule: NonNullable<PendingMentionQueueOptions['schedule']>;
  private readonly cancel: NonNullable<PendingMentionQueueOptions['cancel']>;

  constructor(
    private readonly send: (message: Extract<ClientStatelessMessage, { type: 'agent:mention' }>) => void,
    options: PendingMentionQueueOptions = {},
  ) {
    this.createId = options.createId ?? (() => crypto.randomUUID());
    this.schedule = options.schedule ?? ((callback, delay) => setTimeout(callback, delay));
    this.cancel = options.cancel ?? ((timer) => clearTimeout(timer));
  }

  createAndSend(input: AgentMentionInput): string {
    const idempotencyKey = this.createId();
    const pending: PendingMention = {
      message: { type: 'agent:mention', idempotencyKey, ...input },
      attempts: 0,
    };
    this.pending.set(idempotencyKey, pending);
    this.sendPending(pending);
    return idempotencyKey;
  }

  acknowledge(message: AgentStatelessMessage): void {
    if (!message.idempotencyKey) return;
    const pending = this.pending.get(message.idempotencyKey);
    if (!pending) return;
    if (pending.timer) this.cancel(pending.timer);
    this.pending.delete(message.idempotencyKey);
  }

  retryPending(): void {
    for (const pending of this.pending.values()) this.sendPending(pending);
  }

  destroy(): void {
    for (const pending of this.pending.values()) {
      if (pending.timer) this.cancel(pending.timer);
    }
    this.pending.clear();
  }

  private sendPending(pending: PendingMention): void {
    if (pending.attempts >= MAX_SEND_ATTEMPTS) return;
    if (pending.timer) this.cancel(pending.timer);
    pending.attempts += 1;
    this.send(pending.message);
    if (pending.attempts < MAX_SEND_ATTEMPTS) {
      pending.timer = this.schedule(() => this.sendPending(pending), ACK_RETRY_MS);
    }
  }
}
