import {
  HocuspocusProvider,
  WebSocketStatus,
  type onStatelessParameters,
  type onStatusParameters,
} from '@hocuspocus/provider';
import * as Y from 'yjs';
import {
  parseStatelessMessage,
  type AgentStatelessMessage,
  type AwarenessUser,
  type ClientStatelessMessage,
} from '@co-pen/shared';
import {
  PendingAgentMentions,
  type AgentMentionInput,
} from './pending-agent-mentions';

const SYNC_SERVER_URL = process.env.NEXT_PUBLIC_SYNC_SERVER_URL ?? 'ws://localhost:1234';

export interface RoomSession {
  doc: Y.Doc;
  provider: HocuspocusProvider;
  user: AwarenessUser;
  send(message: ClientStatelessMessage): void;
  sendAgentMention(input: AgentMentionInput): string;
  loadLatestAgentStatus(): Promise<AgentStatelessMessage | null>;
  /** 지금까지 이 브라우저가 본 편집 범위 (Y.encodeStateVector, base64) */
  stateVector(): string;
  destroy(): void;
}

interface RoomSessionOptions {
  token: string;
  onAuthenticated?: () => void;
  onAuthenticationFailed?: (reason: string) => void;
}

export function createRoomSession(
  docId: string,
  user: AwarenessUser,
  options: RoomSessionOptions,
): RoomSession {
  const doc = new Y.Doc();
  const provider = new HocuspocusProvider({
    url: SYNC_SERVER_URL,
    name: docId,
    document: doc,
    token: options.token,
    onAuthenticated: () => options.onAuthenticated?.(),
    onAuthenticationFailed: ({ reason }) => options.onAuthenticationFailed?.(reason),
  });
  const pendingMentions = new PendingAgentMentions((message) =>
    provider.sendStateless(JSON.stringify(message)),
  );

  const handleStateless = ({ payload }: onStatelessParameters) => {
    const message = parseStatelessMessage(payload);
    if (message?.type !== 'agent:status' || !message.idempotencyKey) return;
    pendingMentions.acknowledge(message);
  };
  const handleStatus = ({ status }: onStatusParameters) => {
    if (status !== WebSocketStatus.Connected) return;
    pendingMentions.retryPending();
  };
  provider.on('stateless', handleStateless);
  provider.on('status', handleStatus);

  async function loadLatestAgentStatus(): Promise<AgentStatelessMessage | null> {
    const url = new URL(SYNC_SERVER_URL);
    if (url.protocol === 'ws:') url.protocol = 'http:';
    else if (url.protocol === 'wss:') url.protocol = 'https:';
    url.pathname = `/documents/${encodeURIComponent(docId)}/agent-jobs`;
    url.search = '';
    url.hash = '';
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${options.token}` },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('agent_status_unavailable');
    const value: unknown = await response.json();
    const jobs =
      typeof value === 'object' && value !== null && Array.isArray((value as { jobs?: unknown }).jobs)
        ? (value as { jobs: unknown[] }).jobs
            .map((job) => parseStatelessMessage(JSON.stringify(job)))
            .filter((job): job is AgentStatelessMessage => job?.type === 'agent:status')
        : [];
    return (
      jobs.find((job) => ['queued', 'planning', 'writing'].includes(job.status)) ??
      jobs[0] ??
      null
    );
  }

  return {
    doc,
    provider,
    user,
    send: (message) => provider.sendStateless(JSON.stringify(message)),
    sendAgentMention(input) {
      return pendingMentions.createAndSend(input);
    },
    loadLatestAgentStatus,
    stateVector() {
      let binary = '';
      for (const byte of Y.encodeStateVector(doc)) binary += String.fromCharCode(byte);
      return btoa(binary);
    },
    destroy() {
      provider.off('stateless', handleStateless);
      provider.off('status', handleStatus);
      pendingMentions.destroy();
      provider.destroy();
      doc.destroy();
    },
  };
}
