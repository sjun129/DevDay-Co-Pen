import { useSyncExternalStore } from 'react';
import { HUMAN_COLORS, type AwarenessUser } from '@co-pen/shared';

const NICKNAME_KEY = 'co-pen:nickname';

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
