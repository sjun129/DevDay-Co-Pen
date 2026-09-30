import { useEffect, useState } from 'react';
import type { HocuspocusProvider, onStatelessParameters } from '@hocuspocus/provider';
import { parseStatelessMessage, type AgentId, type AgentStatelessMessage } from '@co-pen/shared';

export type AgentStatuses = Partial<Record<AgentId, AgentStatelessMessage>>;

/** 워커가 방에 보내는 agent:status 메시지 중 에이전트별로 가장 최근 것 */
export function useAgentStatus(provider: HocuspocusProvider): AgentStatuses {
  const [statuses, setStatuses] = useState<AgentStatuses>({});

  useEffect(() => {
    const handleStateless = ({ payload }: onStatelessParameters) => {
      const message = parseStatelessMessage(payload);
      if (message?.type === 'agent:status') {
        setStatuses((current) => ({ ...current, [message.agentId]: message }));
      }
    };
    provider.on('stateless', handleStateless);
    return () => {
      provider.off('stateless', handleStateless);
    };
  }, [provider]);

  return statuses;
}
