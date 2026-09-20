# CI runs lint/test on the bare runner for fast feedback (see
# .github/workflows/docker.yml); building happens entirely in here so this
# image is reproducible from a clean checkout without needing bun installed
# on the host first.

# --mount=type=cache persists bun's package-download cache across builds
# independently of layer hashing (unlike relying on layer caching alone) —
# .github/workflows/docker.yml's cache-to/from: type=gha exports/imports it
# the same way it does regular layers.
FROM oven/bun:1.3.14-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --ignore-scripts

FROM deps AS build
COPY . .
RUN bun run build

# A separate, production-only install for the runtime image — the full
# `deps` install above (needed to build) pulls in devDependencies (vite,
# vitest, eslint, ...) that server.mjs never touches at runtime.
FROM oven/bun:1.3.14-alpine AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production --ignore-scripts

# No nginx: server.mjs serves static assets, proxies /api/v2*, and
# server-renders SSR-safe routes itself. Traefik (in front of every service
# in this infra) already handles TLS and per-hostname routing.
FROM oven/bun:1.3.14-alpine
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist/client ./dist/client
COPY --from=build /app/dist/server ./dist/server
COPY server.mjs ./
# server.mjs shares the DEFAULT_LANGUAGE -> <html lang> mapping with the Vue
# app (and vite.config.mjs) instead of duplicating it.
COPY src/utils/htmlLang.js ./src/utils/htmlLang.js

RUN chown -R bun:bun /app
USER bun

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --start-interval=2s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

# --no-env-file: bun auto-loads a .env file by default (unlike Node), which
# would silently shadow the real env vars this container is given.
CMD ["bun", "--no-env-file", "server.mjs"]
