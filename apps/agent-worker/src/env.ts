import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`환경 변수 ${name}가 필요합니다 (.env.example 참고)`);
  return value;
}

const openaiApiKey = process.env.OPENAI_API_KEY || undefined;

export const env = {
  port: Number(process.env.PORT ?? 1235),
  syncServerUrl: process.env.SYNC_SERVER_URL ?? 'ws://localhost:1234',
  agentSharedSecret: required('AGENT_SHARED_SECRET'),
  openaiApiKey,
  openaiModel: openaiApiKey ? required('OPENAI_MODEL') : undefined,
  /** OpenAI 호환 API 주소 (Qwen DashScope, Ollama 등). 비우면 OpenAI 본가를 쓴다. */
  openaiBaseUrl: process.env.OPENAI_BASE_URL || undefined,
  /** 기술 과제 3: 토큰을 이 간격(ms)으로 묶어 한 트랜잭션으로 반영한다. 실험으로 조정. */
  flushIntervalMs: Number(process.env.AGENT_FLUSH_MS ?? 50),
};
