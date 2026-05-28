FROM node:20-alpine

# 1. Corepack을 활성화하여 pnpm을 바로 사용 가능하게 만듭니다.
RUN corepack enable

WORKDIR /app

COPY . .

# 2. 전역 설치 과정 없이 바로 pnpm 사용
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter @workspace/api-server run build

EXPOSE 8080
CMD ["pnpm", "--filter", "@workspace/api-server", "run", "start"]
