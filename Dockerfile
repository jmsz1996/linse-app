# syntax=docker/dockerfile:1.7
# Multi-stage build for linse.
# Stages: base → deps → (dev | build → runner)

FROM node:22-alpine AS base
# ffmpeg powers video thumbnail/poster extraction (src/lib/video.ts).
RUN corepack enable && apk add --no-cache libc6-compat openssl ffmpeg

# ---- Dependencies (shared) ----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# ---- Development (used by compose.dev.yml; source is bind-mounted at runtime) ----
FROM base AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
EXPOSE 3000
CMD ["pnpm", "dev"]

# ---- Production build ----
FROM base AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---- Production runtime (non-root) ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
LABEL org.opencontainers.image.source=https://github.com/jmsz1996/linse-app
LABEL org.opencontainers.image.description="Self-hosted event photo sharing"
LABEL org.opencontainers.image.licenses=AGPL-3.0-or-later
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next ./.next
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --from=build --chown=app:app /app/prisma ./prisma
USER app
EXPOSE 3000
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm prisma db seed && pnpm start"]
