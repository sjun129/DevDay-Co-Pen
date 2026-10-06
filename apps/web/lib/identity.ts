import { useSyncExternalStore } from 'react';
import { HUMAN_COLORS, type AwarenessUser } from '@co-pen/shared';

const NICKNAME_KEY = 'co-pen:nickname';
const GUEST_TOKEN_KEY = 'co-pen:guest-token';
const SYNC_SERVER_URL = process.env.NEXT_PUBLIC_SYNC_SERVER_URL ?? 'ws://localhost:1234';

interface GuestCredentialResponse {
  token: string;
  actorId: string;
  expiresAt: string;
}

let pendingCredential: Promise<string> | null = null;

function loadGuestToken(): string {
  try {
    return localStorage.getItem(GUEST_TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveGuestToken(token: string) {
  try {
    localStorage.setItem(GUEST_TOKEN_KEY, token);
  } catch {
    // Storage-disabled browsers can still use the credential for the current page session.
  }
}

export function clearGuestToken() {
  try {
    localStorage.removeItem(GUEST_TOKEN_KEY);
  } catch {
    // A failed removal is handled by force-refreshing without reusing the stored value.
  }
}

function guestIdentityUrl(): string {
  const url = new URL('/identity/guest', SYNC_SERVER_URL);
  url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
  return url.toString();
}

async function requestGuestToken(): Promise<string> {
  const response = await fetch(guestIdentityUrl(), {
    method: 'POST',
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });
  if (!response.ok) throw new Error('guest_identity_unavailable');

  const credential = (await response.json()) as Partial<GuestCredentialResponse>;
  if (
    typeof credential.token !== 'string' ||
    !credential.token ||
    typeof credential.actorId !== 'string' ||
    typeof credential.expiresAt !== 'string'
  ) {
    throw new Error('invalid_guest_identity_response');
  }

  saveGuestToken(credential.token);
  return credential.token;
}

export async function getOrCreateGuestToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const stored = loadGuestToken();
    if (stored) return stored;
  } else {
    clearGuestToken();
  }

  if (!pendingCredential) {
    pendingCredential = requestGuestToken().finally(() => {
      pendingCredential = null;
    });
  }
  return pendingCredential;
}

export function loadNickname(): string {
  try {
    return localStorage.getItem(NICKNAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveNickname(nickname: string) {
  try {
    localStorage.setItem(NICKNAME_KEY, nickname);
  } catch {
    // 저장이 막힌 환경(시크릿 모드 등)에서는 매번 입력받는다
  }
}

function subscribeStorage(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

/** 마지막으로 쓴 닉네임. 서버 렌더에서는 빈 문자열이다. */
export function useStoredNickname(): string {
  return useSyncExternalStore(subscribeStorage, loadNickname, () => '');
}

export function humanUser(name: string): AwarenessUser {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return { name, color: HUMAN_COLORS[hash % HUMAN_COLORS.length]!, kind: 'human' };
}

export function initialOf(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() ?? '?';
}
