import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import type { AwarenessUser, ClientStatelessMessage } from '@co-pen/shared';

const SYNC_SERVER_URL = process.env.NEXT_PUBLIC_SYNC_SERVER_URL ?? 'ws://localhost:1234';

export interface RoomSession {
  doc: Y.Doc;
  provider: HocuspocusProvider;
  user: AwarenessUser;
  send(message: ClientStatelessMessage): void;
  /** 지금까지 이 브라우저가 본 편집 범위 (Y.encodeStateVector, base64) */
  stateVector(): string;
  destroy(): void;
}

export function createRoomSession(docId: string, user: AwarenessUser): RoomSession {
  const doc = new Y.Doc();
  const provider = new HocuspocusProvider({
    url: SYNC_SERVER_URL,
    name: docId,
    document: doc,
    // 로그인 없음(F3). 서버는 토큰으로 사람/에이전트만 구분한다.
    token: 'guest',
  });

  return {
    doc,
    provider,
    user,
    send: (message) => provider.sendStateless(JSON.stringify(message)),
    stateVector() {
      let binary = '';
      for (const byte of Y.encodeStateVector(doc)) binary += String.fromCharCode(byte);
      return btoa(binary);
    },
    destroy() {
      provider.destroy();
      doc.destroy();
    },
  };
}
