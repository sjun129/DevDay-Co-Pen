# Render 무료 등급용: 상시 실행 서비스가 1개뿐이라 동기화 서버와 에이전트 워커를 한 컨테이너에서 실행한다.
# 외부에는 동기화 서버만 열리고($PORT), 워커는 컨테이너 안 1235번에서 동기화 서버와만 통신한다.
# ponytail: 프로세스 2개를 bash로 관리, 둘 중 하나가 죽으면 컨테이너를 종료해 플랫폼이 재시작하게 한다. 유료 플랜이면 서비스를 나눌 것.
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/sync-server/package.json apps/sync-server/
COPY apps/agent-worker/package.json apps/agent-worker/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev -w @co-pen/sync-server -w @co-pen/agent-worker

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/sync-server apps/sync-server
COPY apps/agent-worker apps/agent-worker

# 워커가 먼저 떠야 한다. 동기화 서버가 먼저 요청을 받으면 그 사이 AI 요청이 dispatch_failed로 끝난다(무료 등급 콜드 스타트마다 발생).
SHELL ["/bin/bash", "-c"]
CMD (cd apps/agent-worker && SYNC_SERVER_URL="ws://127.0.0.1:${PORT:-1234}" PORT=1235 node --import tsx src/index.ts) & \
    until node -e "fetch('http://127.0.0.1:1235/health').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"; do sleep 0.5; done; \
    (cd apps/sync-server && node --import tsx src/index.ts) & \
    wait -n; exit 1
