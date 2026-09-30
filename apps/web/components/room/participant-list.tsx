'use client';

import type { HocuspocusProvider } from '@hocuspocus/provider';
import { Sparkles } from 'lucide-react';
import { useParticipants } from '@/lib/collab/use-participants';
import { initialOf } from '@/lib/identity';

const MAX_VISIBLE = 5;

export function ParticipantList({ provider }: { provider: HocuspocusProvider }) {
  const participants = useParticipants(provider);
  const visible = participants.slice(0, MAX_VISIBLE);
  const hidden = participants.length - visible.length;

  return (
    <div className="flex items-center gap-2.5">
      <ul className="flex -space-x-2" aria-label="참여자">
        {visible.map((participant) => {
          const label = `${participant.name}${participant.isSelf ? ' (나)' : ''}`;
          return (
            <li key={participant.clientId} className="group relative">
              {participant.kind === 'agent' ? (
                <span className="bg-brand-gradient grid size-8 place-items-center rounded-full text-white ring-2 ring-white">
                  <Sparkles className="size-4" />
                </span>
              ) : (
                <span
                  className="grid size-8 place-items-center rounded-full text-xs font-bold text-white ring-2 ring-white"
                  style={{ backgroundColor: participant.color }}
                >
                  {initialOf(participant.name)}
                </span>
              )}
              {participant.isSelf && (
                <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              )}
              <span
                role="tooltip"
                className="pointer-events-none absolute top-full left-1/2 z-20 mt-2 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition group-hover:opacity-100"
              >
                {label}
              </span>
              <span className="sr-only">{label}</span>
            </li>
          );
        })}
        {hidden > 0 && (
          <li className="grid size-8 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 ring-2 ring-white">
            +{hidden}
          </li>
        )}
      </ul>
      <span className="hidden text-sm text-slate-500 sm:inline">{participants.length}명 참여 중</span>
    </div>
  );
}
