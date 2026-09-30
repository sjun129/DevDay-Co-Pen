'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, Check, FileText, Link2 } from 'lucide-react';
import { WebSocketStatus } from '@hocuspocus/provider';
import { createRoomSession, type RoomSession } from '@/lib/collab/room-session';
import { useConnectionStatus } from '@/lib/collab/use-connection-status';
import { humanUser, initialOf, saveNickname, useStoredNickname } from '@/lib/identity';
import { CollaborativeEditor } from '@/components/editor/collaborative-editor';
import { Logo } from '@/components/ui/logo';
import { ParticipantList } from './participant-list';

export function Room({ docId }: { docId: string }) {
  const [session, setSession] = useState<RoomSession | null>(null);

  useEffect(() => () => session?.destroy(), [session]);

  if (!session) {
    return (
      <JoinCard
        docId={docId}
        onJoin={(nickname) => setSession(createRoomSession(docId, humanUser(nickname)))}
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Logo />
            <span className="hidden h-5 w-px bg-slate-200 sm:block" />
            <span className="hidden min-w-0 items-center gap-2 text-sm text-slate-600 sm:flex">
              <FileText className="size-4 shrink-0 text-slate-400" />
              <span className="truncate font-mono text-slate-500">{docId}</span>
            </span>
            <ConnectionBadge session={session} />
          </div>
          <div className="flex items-center gap-3">
            <ParticipantList provider={session.provider} />
            <CopyLinkButton />
          </div>
        </div>
      </header>
      <CollaborativeEditor session={session} />
    </div>
  );
}

function JoinCard({ docId, onJoin }: { docId: string; onJoin: (nickname: string) => void }) {
  const storedNickname = useStoredNickname();
  const [draft, setDraft] = useState<string | null>(null);
  const nickname = draft ?? storedNickname;
  const preview = nickname.trim() ? humanUser(nickname.trim()) : null;

  function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = nickname.trim();
    if (!name) return;
    saveNickname(name);
    onJoin(name);
  }

  return (
    <div className="relative isolate flex flex-1 flex-col bg-white">
      <div className="hero-backdrop absolute inset-0 -z-10" />
      <div className="hero-grid absolute inset-0 -z-10" />
      <header className="px-5 py-5 sm:px-8">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-5 pb-24">
        <form
          onSubmit={join}
          className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-lift backdrop-blur sm:p-10"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-mono text-xs text-slate-600">
            <FileText className="size-3.5" />
            {docId}
          </span>
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">문서에 입장하기</h1>
          <p className="mt-2 text-[15px] text-slate-500">로그인 없이 닉네임만 정하면 바로 함께 편집할 수 있어요.</p>

          <label className="mt-8 block text-sm font-medium text-slate-700" htmlFor="nickname">
            닉네임
          </label>
          <div className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100">
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white transition-colors"
              style={{ backgroundColor: preview?.color ?? '#cbd5e1' }}
              aria-hidden
            >
              {preview ? initialOf(preview.name) : '?'}
            </span>
            <input
              id="nickname"
              value={nickname}
              onChange={(event) => setDraft(event.target.value)}
              required
              maxLength={20}
              placeholder="다른 사람에게 보일 이름"
              autoFocus
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={!preview}
            className="bg-brand-gradient group mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-semibold text-white shadow-lg shadow-brand-500/25 transition hover:shadow-xl hover:shadow-brand-500/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            입장하기
            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
          </button>
        </form>
      </main>
    </div>
  );
}

const CONNECTION_LABEL: Record<WebSocketStatus, { text: string; dot: string }> = {
  [WebSocketStatus.Connected]: { text: '실시간 연결됨', dot: 'bg-emerald-500' },
  [WebSocketStatus.Connecting]: { text: '연결 중…', dot: 'bg-amber-400 animate-pulse' },
  [WebSocketStatus.Disconnected]: { text: '연결 끊김', dot: 'bg-rose-500' },
};

function ConnectionBadge({ session }: { session: RoomSession }) {
  const { text, dot } = CONNECTION_LABEL[useConnectionStatus(session.provider)];
  return (
    <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 md:inline-flex">
      <span className={`size-1.5 rounded-full ${dot}`} />
      {text}
    </span>
  );
}

function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700"
    >
      {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
      <span className="hidden sm:inline">{copied ? '복사됨' : '링크 공유'}</span>
    </button>
  );
}
