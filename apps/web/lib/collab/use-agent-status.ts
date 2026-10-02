import { useEffect, useState } from 'react';
import type { onStatelessParameters } from '@hocuspocus/provider';
import { parseStatelessMessage, type AgentStatelessMessage } from '@co-pen/shared';
import type { RoomSession } from './room-session';

/** DB에서 복원한 최신 상태와 실시간 agent:status 중 가장 최근 것 */
export function useAgentStatus(session: RoomSession): AgentStatelessMessage | null {
  const [status, setStatus] = useState<AgentStatelessMessage | null>(null);

  useEffect(() => {
    let active = true;
    let receivedRealtime = false;
    const handleStateless = ({ payload }: onStatelessParameters) => {
      const message = parseStatelessMessage(payload);
      if (message?.type === 'agent:status') {
        receivedRealtime = true;
        setStatus(message);
      }
    };
    session.provider.on('stateless', handleStateless);
    void session
      .loadLatestAgentStatus()
      .then((latest) => {
        if (active && !receivedRealtime && latest) setStatus(latest);
      })
      .catch(() => undefined);
    return () => {
      active = false;
      session.provider.off('stateless', handleStateless);
    };
  }, [session]);

  return status;
}
