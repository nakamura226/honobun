# syntax=docker/dockerfile:1
#
# Build context must be the monorepo root, e.g.:
#   docker build -f apps/api/Dockerfile -t honobun-api .

FROM node:22-slim AS base
RUN npm install -g pnpm@12.4.2
WORKDIR /app

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @honobun/api build
RUN pnpm --filter @honobun/api deploy --prod /prod/api

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /prod/api ./

ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
