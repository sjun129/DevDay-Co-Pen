import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`환경 변수 ${name}가 필요합니다 (.env.example 참고)`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 1234),
  agentWorkerUrl: process.env.AGENT_WORKER_URL ?? 'http://localhost:1235',
  agentSharedSecret: required('AGENT_SHARED_SECRET'),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  localDataDir: process.env.LOCAL_DATA_DIR ?? '.data',
};
