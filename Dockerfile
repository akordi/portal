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
# The SSR bundle already inlines its dependencies (vite.config.mjs's
# ssr.noExternal); bundling server.mjs too leaves the runtime image with no
# node_modules at all. The SSR entry stays a separate file, loaded from the
# same relative path as before.
RUN bun run build && \
    bun build server.mjs --target=bun --outdir bundle \
      --external ./dist/server/entry-server.mjs

# No nginx: server.mjs serves static assets, proxies /api/v2*, and
# server-renders SSR-safe routes itself. Traefik (in front of every service
# in this infra) already handles TLS and per-hostname routing.
FROM oven/bun:1.3.14-alpine
WORKDIR /app

COPY --from=build /app/dist/client ./dist/client
COPY --from=build /app/dist/server ./dist/server
COPY --from=build /app/bundle/server.js ./server.js

# Left root-owned: the server only reads these files, and re-owning them
# would copy them all into another layer.
USER bun

# vue, vue-router and @vue/server-renderer, inlined into the SSR bundle,
# still pick their dev or prod build at runtime from NODE_ENV. Without this
# they run in development mode: dev-only checks, slower renders, and
# router/Unhead warnings logged on every request.
ENV NODE_ENV=production

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --start-interval=2s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

# --no-env-file: bun auto-loads a .env file by default (unlike Node), which
# would silently shadow the real env vars this container is given.
CMD ["bun", "--no-env-file", "server.js"]
