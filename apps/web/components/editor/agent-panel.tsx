'use client';

import type { HocuspocusProvider } from '@hocuspocus/provider';
import {
  AGENT_IDS,
  AGENT_ROLES,
  wordDiff,
  type AgentId,
  type AgentJobStatus,
} from '@co-pen/shared';
import {
  Check,
  CircleAlert,
  CircleCheck,
  LoaderCircle,
  MousePointer2,
  PenLine,
  Sparkles,
  SpellCheck,
  TriangleAlert,
  Undo2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAgentStatus } from '@/lib/collab/use-agent-status';
import type { PendingSuggestion } from '@/lib/editor/ai-suggestion';

const STATUS: Record<AgentJobStatus | 'idle', { label: string; icon: LucideIcon; tone: string; spin?: boolean }> = {
  idle: { label: '대기 중', icon: Sparkles, tone: 'bg-slate-100 text-slate-600' },
  queued: { label: '요청을 받았어요', icon: LoaderCircle, tone: 'bg-amber-50 text-amber-700', spin: true },
  planning: { label: '위치를 정하는 중', icon: MousePointer2, tone: 'bg-amber-50 text-amber-700' },
  writing: { label: '작성 중', icon: LoaderCircle, tone: 'bg-brand-50 text-brand-700', spin: true },
  done: { label: '작성 완료', icon: CircleCheck, tone: 'bg-emerald-50 text-emerald-700' },
  error: { label: '오류가 발생했어요', icon: CircleAlert, tone: 'bg-rose-50 text-rose-700' },
};

const ROLE_ICON: Record<AgentId, LucideIcon> = { draft: PenLine, proofread: SpellCheck };

interface AgentPanelProps {
  provider: HocuspocusProvider;
  suggestions: PendingSuggestion[];
  onAccept: (jobId: string, force?: boolean) => void;
  onReject: (jobId: string) => void;
  onUndoAgent: (agentId: AgentId) => void;
}

export function AgentPanel({ provider, suggestions, onAccept, onReject, onUndoAgent }: AgentPanelProps) {
  const statuses = useAgentStatus(provider);

  return (
    <aside className="order-first grid w-full shrink-0 items-start gap-4 md:grid-cols-2 xl:sticky xl:top-32 xl:order-none xl:flex xl:w-80 xl:flex-col xl:items-stretch">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft">
        <h2 className="font-semibold text-ink">AI 팀</h2>
        <p className="mt-0.5 text-xs text-slate-500">문단 첫머리에 호출어를 쓰고 Enter를 누르세요.</p>

        <ul className="mt-4 flex flex-col gap-3">
          {AGENT_IDS.map((agentId) => {
            const role = AGENT_ROLES[agentId];
            const status = statuses[agentId];
            const current = STATUS[status?.status ?? 'idle'];
            const StatusIcon = current.icon;
            const RoleIcon = ROLE_ICON[agentId];
            return (
              <li key={agentId} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3" data-agent={agentId}>
                <div className="flex items-center gap-2.5">
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-white"
                    style={{ backgroundColor: role.color }}
                  >
                    <RoleIcon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-ink">{role.name}</h3>
                    <p className="truncate text-xs text-slate-500">{role.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUndoAgent(agentId)}
                    title={`${role.name}의 가장 최근 작업만 되돌리기`}
                    aria-label={`${role.name}의 가장 최근 작업만 되돌리기`}
                    className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-slate-500 ring-1 ring-slate-200 transition hover:text-brand-600 hover:ring-brand-200"
                  >
                    <Undo2 className="size-4" />
                  </button>
                </div>

                <div
                  className={`mt-2.5 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium ${current.tone}`}
                  role="status"
                >
                  <StatusIcon className={`size-3.5 shrink-0 ${current.spin ? 'animate-spin' : ''}`} />
                  <span>{current.label}</span>
                </div>
                {status?.status === 'error' && status.message && (
                  <p className="mt-1.5 text-xs text-rose-600">{status.message}</p>
                )}
                <p className="mt-2 w-fit rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                  {role.example}
                </p>
              </li>
            );
          })}
        </ul>
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
            {suggestions.map((suggestion) => (
              <SuggestionCard key={suggestion.jobId} suggestion={suggestion} onAccept={onAccept} onReject={onReject} />
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}

function SuggestionCard({
  suggestion,
  onAccept,
  onReject,
}: {
  suggestion: PendingSuggestion;
  onAccept: (jobId: string, force?: boolean) => void;
  onReject: (jobId: string) => void;
}) {
  const { jobId, agentId, text, original } = suggestion;
  const role = AGENT_ROLES[agentId];
  const changed = original?.changed ?? false;

  return (
    <li className="rounded-xl border border-brand-100 bg-brand-50/60 p-3" data-job-id={jobId}>
      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
        <span className="size-2 rounded-full" style={{ backgroundColor: role.color }} />
        {role.name}
        {original && <span className="font-normal text-slate-400">· 원문과 달라진 부분</span>}
      </p>

      {original ? (
        // 단어 단위 차이는 화면에서만 계산한다. 문서에는 원문과 수정본이 문단째로 들어 있다.
        <p className="mt-1.5 max-h-48 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
          {wordDiff(original.text, text).map((part, index) =>
            part.type === 'same' ? (
              <span key={index}>{part.text}</span>
            ) : part.type === 'removed' ? (
              <del key={index} className="bg-rose-100 text-rose-700">
                {part.text}
              </del>
            ) : (
              <ins key={index} className="bg-emerald-100 text-emerald-800 no-underline">
                {part.text}
              </ins>
            ),
          )}
        </p>
      ) : (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-700">{text}</p>
      )}

      {changed && (
        <p className="mt-2 flex gap-1.5 rounded-lg bg-amber-50 p-2 text-xs leading-relaxed text-amber-800 ring-1 ring-amber-200">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          요청한 뒤에 원문이 수정됐어요. 교체하면 그 수정도 함께 지워져요.
        </p>
      )}

      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={() => onAccept(jobId, changed)}
          className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-white transition ${
            changed ? 'bg-amber-600 hover:bg-amber-700' : 'bg-brand-600 hover:bg-brand-700'
          }`}
        >
          <Check className="size-3.5" />
          {changed ? '그래도 교체' : original ? '수정본으로 교체' : '수락'}
        </button>
        <button
          type="button"
          onClick={() => onReject(jobId)}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
          <X className="size-3.5" />
          {original ? '원문 유지' : '거절'}
        </button>
      </div>
    </li>
  );
}
