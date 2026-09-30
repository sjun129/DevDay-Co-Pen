import { useCallback, useSyncExternalStore } from 'react';
import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { AwarenessUser } from '@co-pen/shared';

type Awareness = NonNullable<HocuspocusProvider['awareness']>;

export interface Participant extends AwarenessUser {
  clientId: number;
  isSelf: boolean;
}

const EMPTY: Participant[] = [];
const snapshots = new WeakMap<Awareness, Participant[]>();

function readParticipants(awareness: Awareness): Participant[] {
  const participants: Participant[] = [];
  awareness.getStates().forEach((state, clientId) => {
    const user = state.user as AwarenessUser | undefined;
    if (user?.name) {
      participants.push({ ...user, clientId, isSelf: clientId === awareness.clientID });
    }
  });
  // AI를 맨 앞에, 나머지는 이름순
  return participants.sort(
    (a, b) => Number(b.kind === 'agent') - Number(a.kind === 'agent') || a.name.localeCompare(b.name),
  );
}

/** F2: awareness의 user 필드로 참여자(사람 + AI) 목록을 만든다 */
export function useParticipants(provider: HocuspocusProvider): Participant[] {
  const awareness = provider.awareness;

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!awareness) return () => {};
      const handleChange = () => {
        snapshots.set(awareness, readParticipants(awareness));
        onChange();
      };
      awareness.on('change', handleChange);
      return () => awareness.off('change', handleChange);
    },
    [awareness],
  );

  const getSnapshot = useCallback(() => {
    if (!awareness) return EMPTY;
    let snapshot = snapshots.get(awareness);
    if (!snapshot) {
      snapshot = readParticipants(awareness);
      snapshots.set(awareness, snapshot);
    }
    return snapshot;
  }, [awareness]);

  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}
