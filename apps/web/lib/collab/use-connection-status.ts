import { useCallback, useSyncExternalStore } from 'react';
import { WebSocketStatus, type HocuspocusProvider } from '@hocuspocus/provider';

export function useConnectionStatus(provider: HocuspocusProvider): WebSocketStatus {
  const subscribe = useCallback(
    (onChange: () => void) => {
      provider.on('status', onChange);
      return () => {
        provider.off('status', onChange);
      };
    },
    [provider],
  );

  return useSyncExternalStore(
    subscribe,
    () => provider.configuration.websocketProvider.status,
    () => WebSocketStatus.Connecting,
  );
}
