'use client';

import type { HocuspocusProvider } from '@hocuspocus/provider';
import type { AgentJobStatus } from '@co-pen/shared';
import {
  Check,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  MousePointer2,
  Sparkles,
  Undo2,
  WandSparkles,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAgentStatus } from '@/lib/collab/use-agent-status';
import type { PendingSuggestion } from '@/lib/editor/ai-suggestion';

const STATUS: Record<AgentJobStatus | 'idle', { label: string; icon: LucideIcon; tone: string; spin?: boolean }> = {
  idle: { label: '대기 중', icon: Sparkles, tone: 'bg-slate-100 text-slate-600' },
  queued: { label: '요청을 받았어요', icon: LoaderCircle, tone: 'bg-amber-50 text-amber-700', spin: true },
  planning: { label: '쓸 위치를 정하는 중', icon: MousePointer2, tone: 'bg-amber-50 text-amber-700' },
  writing: { label: '작성 중', icon: LoaderCircle, tone: 'bg-brand-50 text-brand-700', spin: true },
  done: { label: '작성 완료', icon: CircleCheck, tone: 'bg-emerald-50 text-emerald-700' },
  error: { label: '오류가 발생했어요', icon: CircleAlert, tone: 'bg-rose-50 text-rose-700' },
};

const EXAMPLES = ['@AI 3장 결론 써줘', '@AI 문체를 보고서체로 다듬어줘', '@AI 회의 내용 요약해줘'];

interface AgentPanelProps {
  provider: HocuspocusProvider;
  suggestions: PendingSuggestion[];
  onAccept: (jobId: string) => void;
  onReject: (jobId: string) => void;
  onUndoAgent: () => void;
}

export function AgentPanel({ provider, suggestions, onAccept, onReject, onUndoAgent }: AgentPanelProps) {
  const status = useAgentStatus(provider);
  const current = STATUS[status?.status ?? 'idle'];
  const StatusIcon = current.icon;

  return (
    <aside className="order-first grid w-full shrink-0 items-start gap-4 md:grid-cols-3 xl:sticky xl:top-32 xl:order-none xl:flex xl:w-80 xl:flex-col xl:items-stretch">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <span className="bg-brand-gradient grid size-10 place-items-center rounded-xl text-white shadow-md shadow-brand-500/30">
            <Sparkles className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold text-ink">Co-Pen AI</h2>
            <p className="text-xs text-slate-500">문서에 참여 중인 AI 팀원</p>
          </div>
        </div>

        <div
          className={`mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${current.tone}`}
          role="status"
        >
          <StatusIcon className={`size-4 shrink-0 ${current.spin ? 'animate-spin' : ''}`} />
          <span>{current.label}</span>
        </div>
        {status?.message && <p className="mt-2 text-xs text-rose-600">{status.message}</p>}

        <div className="mt-4 hidden rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-100 xl:block">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <WandSparkles className="size-3.5 text-brand-500" />
            이렇게 불러보세요
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">문단 첫머리에 입력하고 Enter를 누르세요.</p>
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {EXAMPLES.map((example) => (
              <li
                key={example}
                className="rounded-md bg-white px-2 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-100"
              >
                {example}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink">검토할 제안</h2>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              suggestions.length ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {suggestions.length}
          </span>
        </div>

        {suggestions.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
            AI가 쓴 글은 여기서
            <br />
            수락하거나 거절할 수 있어요
          </p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2.5">
            {suggestions.map(({ jobId, preview }) => (
              <li key={jobId} className="rounded-xl border border-brand-100 bg-brand-50/60 p-3">
                <p className="line-clamp-2 text-sm leading-relaxed text-slate-700">{preview}</p>
                <div className="mt-2.5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onAccept(jobId)}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand-600 px-2 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700"
                  >
                    <Check className="size-3.5" />
                    수락
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(jobId)}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
                  >
                    <X className="size-3.5" />
                    거절
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        onClick={onUndoAgent}
        className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-soft transition hover:border-brand-200 hover:shadow-lift"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-brand-50 group-hover:text-brand-600">
          <Undo2 className="size-4" />
        </span>
        <span>
          <span className="block text-sm font-semibold text-ink">AI 편집 되돌리기</span>
          <span className="block text-xs text-slate-500">가장 최근 AI 작업만 취소돼요</span>
        </span>
      </button>
    </aside>
  );
}
