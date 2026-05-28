# node:20-alpine 대신 22-alpine 사용
FROM node:22-alpine

RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @workspace/api-server run build

EXPOSE 8080
CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]
