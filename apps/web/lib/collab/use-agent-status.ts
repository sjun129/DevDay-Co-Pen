import { useEffect, useState } from 'react';
import type { onStatelessParameters } from '@hocuspocus/provider';
import { parseStatelessMessage, type AgentId, type AgentStatelessMessage } from '@co-pen/shared';
import type { RoomSession } from './room-session';

export type AgentStatuses = Partial<Record<AgentId, AgentStatelessMessage>>;

/** 에이전트별 최신 상태. DB에서 복원한 상태보다 실시간 agent:status가 우선한다. */
export function useAgentStatus(session: RoomSession): AgentStatuses {
  const [statuses, setStatuses] = useState<AgentStatuses>({});

  useEffect(() => {
    let active = true;
    let receivedRealtime = false;
    const handleStateless = ({ payload }: onStatelessParameters) => {
      const message = parseStatelessMessage(payload);
      if (message?.type === 'agent:status') {
        receivedRealtime = true;
        setStatuses((current) => ({ ...current, [message.agentId]: message }));
      }
    };
    session.provider.on('stateless', handleStateless);
    void session
      .loadLatestAgentStatus()
      .then((latest) => {
        if (active && !receivedRealtime && latest) setStatuses({ [latest.agentId]: latest });
      })
      .catch(() => undefined);
    return () => {
      active = false;
      session.provider.off('stateless', handleStateless);
    };
  }, [session]);

  return statuses;
}
