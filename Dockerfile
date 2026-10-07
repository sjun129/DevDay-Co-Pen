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

# 두 프로세스를 동시에 띄운다. 순서대로 띄우면 무료 인스턴스에서 Render 포트 확인 시간을 넘긴다.
# 워커가 늦게 뜨는 동안의 AI 요청은 동기화 서버가 연결될 때까지 재시도한다(agent-dispatch.ts).
SHELL ["/bin/bash", "-c"]
CMD (cd apps/agent-worker && SYNC_SERVER_URL="ws://127.0.0.1:${PORT:-1234}" PORT=1235 node --import tsx src/index.ts) & \
    (cd apps/sync-server && node --import tsx src/index.ts) & \
    wait -n; exit 1
