import { setTimeout as sleep } from 'node:timers/promises';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText, Output, streamText } from 'ai';
import { z } from 'zod';
import type { BlockSummary } from './doc-model';
import { env } from './env';

const model =
  env.openaiApiKey && env.openaiModel
    ? createOpenAI({ apiKey: env.openaiApiKey })(env.openaiModel)
    : null;

export const llmMode = model ? `openai (${env.openaiModel})` : 'mock (OPENAI_API_KEY 없음)';

export interface EditPlan {
  /** 이 블록 바로 뒤에 새 문단을 쓴다 */
  targetIndex: number;
  instruction: string;
}

function outline(blocks: BlockSummary[]): string {
  return blocks
    .map((block) => `[${block.index}] (${block.type}) ${block.text.slice(0, 200)}`)
    .join('\n');
}

const planSchema = z.object({
  targetIndex: z.number().int().describe('새 내용을 이 블록 바로 뒤에 삽입'),
  instruction: z.string().describe('작성할 내용에 대한 구체적 지시'),
});

/**
 * 기술 과제 1: 대상 위치와 작업을 구조화 출력(JSON)으로 먼저 받고, 본문은 따로 스트리밍한다.
 * TODO(F11): awareness로 사람 커서가 있는 문단을 계획에서 제외
 */
export async function planEdit(input: {
  prompt: string;
  blocks: BlockSummary[];
  mentionIndex: number;
}): Promise<EditPlan> {
  const fallback: EditPlan = {
    targetIndex: input.mentionIndex >= 0 ? input.mentionIndex : input.blocks.length - 1,
    instruction: input.prompt,
  };
  if (!model || input.blocks.length === 0) return fallback;

  const { output } = await generateText({
    model,
    output: Output.object({ schema: planSchema }),
    instructions:
      '너는 협업 문서 편집 에이전트다. 사용자 요청을 보고 새 내용을 어느 블록 뒤에 쓸지 고른다. ' +
      `요청에 위치 단서가 없으면 멘션 블록(${input.mentionIndex}) 뒤를 고른다.`,
    prompt: `문서 개요:\n${outline(input.blocks)}\n\n요청: ${input.prompt}`,
  });

  const inRange = output.targetIndex >= 0 && output.targetIndex < input.blocks.length;
  return inRange ? output : fallback;
}

export function streamDraft(input: {
  plan: EditPlan;
  blocks: BlockSummary[];
}): AsyncIterable<string> {
  if (!model) return mockStream(input.plan.instruction);

  const result = streamText({
    model,
    instructions:
      '너는 팀 문서를 함께 쓰는 공동 작성자다. 본문만 한국어로 작성한다. ' +
      '마크다운 기호 없이 문단은 빈 줄로 구분한다.',
    prompt:
      `문서 개요:\n${outline(input.blocks)}\n\n` +
      `[${input.plan.targetIndex}]번 블록 뒤에 들어갈 내용을 작성하라.\n지시: ${input.plan.instruction}`,
  });
  return result.textStream;
}

async function* mockStream(instruction: string): AsyncIterable<string> {
  const text =
    `(목업 응답) "${instruction}" 요청을 받아 작성한 예시 문단입니다. ` +
    'OPENAI_API_KEY를 설정하면 실제 모델 응답으로 바뀝니다.\n\n' +
    '두 번째 문단은 줄바꿈이 새 문단으로 바뀌는지 확인하기 위한 문장입니다.';
  for (const token of text.match(/.{1,3}/gsu) ?? []) {
    await sleep(30);
    yield token;
  }
}
