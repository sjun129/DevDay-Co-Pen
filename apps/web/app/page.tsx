'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { ArrowRight, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { createSingleFlightDocumentCreator } from '@/lib/documents';

const FEATURES = [
  {
    icon: Users,
    title: '실시간 동시 편집',
    body: '링크만 공유하면 로그인 없이 바로 입장. 팀원의 커서가 실시간으로 보이고, 동시에 써도 충돌 없이 합쳐집니다.',
  },
  {
    icon: Sparkles,
    title: 'AI가 팀원처럼 작성',
    body: '@AI 한 줄이면 AI 커서가 해당 위치로 이동해 타이핑하듯 글을 씁니다. 그 사이 다른 곳을 고쳐도 깨지지 않아요.',
  },
  {
    icon: ShieldCheck,
    title: '통제권은 사람에게',
    body: 'AI 글은 제안으로 표시되어 수락하거나 거절할 수 있고, AI가 한 수정만 골라서 한 번에 되돌릴 수 있습니다.',
  },
];

export default function Home() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const createDocument = useMemo(
    () => createSingleFlightDocumentCreator((path) => router.push(path)),
    [router],
  );

  async function createNewDocument() {
    setCreating(true);
    setCreateError(null);
    try {
      await createDocument();
    } catch {
      setCreateError('문서를 만들 수 없습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setCreating(false);
    }
  }

  function openByCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = new FormData(event.currentTarget).get('code')?.toString().trim();
    if (code) router.push(`/d/${encodeURIComponent(code)}`);
  }

  return (
    <div className="relative isolate flex flex-1 flex-col overflow-hidden bg-white">
      <div className="hero-backdrop absolute inset-0 -z-10" />
      <div className="hero-grid absolute inset-0 -z-10" />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <button
          type="button"
          onClick={() => void createNewDocument()}
          disabled={creating}
          className="rounded-full border border-slate-200 bg-white/70 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:border-slate-300 hover:bg-white"
        >
          {creating ? '생성 중…' : '새 문서'}
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 sm:px-8">
        <section className="grid items-center gap-14 pt-10 pb-20 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white/80 px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm backdrop-blur">
              <Sparkles className="size-3.5" />
              AI가 커서를 가진 팀원으로 참여해요
            </span>
            <h1 className="mt-6 text-4xl leading-[1.15] font-extrabold tracking-tight text-ink sm:text-5xl lg:text-[3.5rem]">
              AI와 함께,
              <br />
              <span className="text-brand-gradient">같은 문서를 동시에.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">
              팀플 보고서, 회의록을 함께 쓰는 동안 AI가 옆자리 팀원처럼 초안을 쓰고 문체를 다듬습니다. 복사·붙여넣기 없이 문서 안에서 바로.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => void createNewDocument()}
                disabled={creating}
                className="bg-brand-gradient group inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/35"
              >
                {creating ? '문서 생성 중…' : '새 문서 만들기'}
                <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
              </button>
              <form
                onSubmit={openByCode}
                className="flex items-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm focus-within:border-brand-400 focus-within:ring-4 focus-within:ring-brand-100"
              >
                <input
                  name="code"
                  placeholder="문서 코드"
                  aria-label="문서 코드"
                  maxLength={64}
                  className="w-32 bg-transparent px-3 py-2 font-mono text-sm outline-none placeholder:font-sans placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  입장
                </button>
              </form>
            </div>
            {createError ? (
              <p className="mt-3 text-sm text-rose-600" role="alert">
                {createError}
              </p>
            ) : null}
          </div>

          <EditorPreview />
        </section>

        <section className="grid gap-5 pb-20 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-soft backdrop-blur transition hover:-translate-y-0.5 hover:shadow-lift"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                <Icon className="size-5" />
              </span>
              <h2 className="mt-5 text-lg font-bold text-ink">{title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{body}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-200/70 bg-white/60 py-6 text-center text-sm text-slate-500 backdrop-blur">
        Co-Pen · 동아대학교 DevDay
      </footer>
    </div>
  );
}

function PreviewCaret({ name, color }: { name: string; color: string }) {
  return (
    <span className="relative inline-block h-5 w-0.5 translate-y-1 align-baseline" style={{ backgroundColor: color }}>
      <span
        className="absolute -top-5 left-0 rounded-md rounded-bl-sm px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap text-white shadow-md"
        style={{ backgroundColor: color }}
      >
        {name}
      </span>
    </span>
  );
}

function EditorPreview() {
  return (
    <div className="relative" aria-hidden>
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-brand-200/50 via-indigo-100/40 to-sky-100/50 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lift">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-slate-200" />
            <span className="size-2.5 rounded-full bg-slate-200" />
            <span className="size-2.5 rounded-full bg-slate-200" />
          </div>
          <div className="flex -space-x-1.5">
            <span className="grid size-6 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white">지</span>
            <span className="grid size-6 place-items-center rounded-full bg-sky-500 text-[10px] font-bold text-white ring-2 ring-white">현</span>
            <span className="bg-brand-gradient grid size-6 place-items-center rounded-full text-white ring-2 ring-white">
              <Sparkles className="size-3" />
            </span>
          </div>
        </div>
        <div className="space-y-5 px-7 py-7 text-[15px] leading-7 text-slate-700">
          <p className="text-xl font-bold text-ink">3장. 결론</p>
          <p>
            문체와 분량이 제각각이라 취합이 오래 걸렸다
            <PreviewCaret name="지민" color="#e11d48" />
          </p>
          <p className="text-brand-700">@AI 결론 문단 정리해줘</p>
          <p>
            <span className="ai-suggestion">AI가 초안과 문체 통일을 함께 맡도록 제안한다</span>
            <PreviewCaret name="Co-Pen AI" color="#7c3aed" />
          </p>
          <div className="flex items-center gap-2 pt-1">
            <span className="rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white">수락</span>
            <span className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">거절</span>
          </div>
        </div>
      </div>
    </div>
  );
}
