# syntax=docker/dockerfile:1
#
# Build context must be the monorepo root, e.g.:
#   docker build -f apps/web/Dockerfile -t honobun-web .

FROM node:22-slim AS base
RUN npm install -g pnpm@12.4.2
WORKDIR /app

FROM base AS build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @honobun/web build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

ENV PORT=3000
EXPOSE 3000

CMD ["node", "apps/web/server.js"]
