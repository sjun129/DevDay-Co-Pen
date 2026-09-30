import type { BlockSummary } from '../doc-model';

/**
 * L3 결정론적 계획 검증.
 * LLM이 고른 계획은 코드가 사람 입력만으로 계산한 허용 범위 안에 있을 때만 실행한다.
 * 문서 본문에 무엇이 쓰여 있든 대상 블록과 행동은 이 범위를 벗어날 수 없다.
 */

export const PLAN_ACTIONS = ['insert_after', 'rewrite'] as const;
export type PlanAction = (typeof PLAN_ACTIONS)[number];

/** 실행기가 지금 수행할 수 있는 행동. rewrite는 교정 방식(6장 3번)이 정해지면 연다. */
export const EXECUTABLE_ACTIONS: ReadonlySet<PlanAction> = new Set(['insert_after']);

export interface VerifiedPlan {
  targetIndex: number;
  action: PlanAction;
  /** 계획을 버리고 기본 위치로 돌아갔다면 그 이유 (측정용) */
  rejected?: string;
}

/** 멘션이 없으면 문서 끝, 있으면 멘션 블록 뒤가 기본 위치다. */
export function defaultTarget(blocks: BlockSummary[], mentionIndex: number): number {
  return mentionIndex >= 0 ? mentionIndex : blocks.length - 1;
}

/**
 * 허용 집합 = 멘션 블록 + 사람의 요청에 제목이 그대로 등장하는 제목 블록.
 * 문서 본문(비신뢰 데이터)은 후보를 넓히지 못하고, 사람의 요청문만 넓힐 수 있다.
 */
export function allowedTargets(
  blocks: BlockSummary[],
  mentionIndex: number,
  prompt: string,
): Set<number> {
  const allowed = new Set<number>();
  const fallback = defaultTarget(blocks, mentionIndex);
  if (fallback >= 0) allowed.add(fallback);

  const request = normalize(prompt);
  for (const block of blocks) {
    if (block.type !== 'heading') continue;
    const title = normalize(block.text);
    if (title.length >= 2 && request.includes(title)) allowed.add(block.index);
  }
  return allowed;
}

export function verifyPlan(
  raw: unknown,
  allowed: ReadonlySet<number>,
  fallbackIndex: number,
): VerifiedPlan {
  const reject = (reason: string): VerifiedPlan => ({
    targetIndex: fallbackIndex,
    action: 'insert_after',
    rejected: reason,
  });

  if (typeof raw !== 'object' || raw === null) return reject('계획 형식 아님');
  const { targetIndex, action } = raw as { targetIndex?: unknown; action?: unknown };

  if (!Number.isInteger(targetIndex)) return reject('targetIndex가 정수가 아님');
  if (!allowed.has(targetIndex as number)) return reject(`targetIndex ${targetIndex} 허용 집합 밖`);
  if (!PLAN_ACTIONS.includes(action as PlanAction)) return reject(`알 수 없는 행동 ${String(action)}`);
  if (!EXECUTABLE_ACTIONS.has(action as PlanAction)) return reject(`실행 불가 행동 ${String(action)}`);

  return { targetIndex: targetIndex as number, action: action as PlanAction };
}

function normalize(text: string): string {
  return text.replace(/\s+/g, '').toLowerCase();
}
