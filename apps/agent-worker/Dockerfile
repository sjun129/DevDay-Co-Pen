# 빌드 컨텍스트는 레포 루트: docker build -f apps/agent-worker/Dockerfile .
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/sync-server/package.json apps/sync-server/
COPY apps/agent-worker/package.json apps/agent-worker/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev -w @co-pen/agent-worker

COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/agent-worker apps/agent-worker

WORKDIR /app/apps/agent-worker
EXPOSE 1235
CMD ["node", "--import", "tsx", "src/index.ts"]
