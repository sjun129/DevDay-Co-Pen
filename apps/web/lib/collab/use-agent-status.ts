import { useEffect, useState } from 'react';
import type { HocuspocusProvider, onStatelessParameters } from '@hocuspocus/provider';
import { parseStatelessMessage, type AgentStatelessMessage } from '@co-pen/shared';

/** 워커가 방에 보내는 agent:status 메시지 중 가장 최근 것 */
export function useAgentStatus(provider: HocuspocusProvider): AgentStatelessMessage | null {
  const [status, setStatus] = useState<AgentStatelessMessage | null>(null);

  useEffect(() => {
    const handleStateless = ({ payload }: onStatelessParameters) => {
      const message = parseStatelessMessage(payload);
      if (message?.type === 'agent:status') setStatus(message);
    };
    provider.on('stateless', handleStateless);
    return () => {
      provider.off('stateless', handleStateless);
    };
  }, [provider]);

  return status;
}
