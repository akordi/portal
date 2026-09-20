# CI runs lint/test on the bare runner for fast feedback (see
# .github/workflows/docker.yml); building happens entirely in here so this
# image is reproducible from a clean checkout without needing bun installed
# on the host first.

FROM oven/bun:1.3.14-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM deps AS build
COPY . .
RUN bun run build

# A separate, production-only install for the runtime image — the full
# `deps` install above (needed to build) pulls in devDependencies (vite,
# vitest, eslint, ...) that server.mjs never touches at runtime.
FROM oven/bun:1.3.14-alpine AS prod-deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# No nginx: server.mjs serves static assets (via sirv), proxies /api/v2* (via
# http-proxy), and server-renders the routes that are actually SSR-safe —
# nothing here needs a separate process, and Traefik (in front of every
# service in this infra, per infrastructure/stacks/akordi-country.yml)
# already handles TLS termination and per-hostname routing, so there was
# never a reverse proxy left for nginx to be doing that this process can't
# do itself.
FROM oven/bun:1.3.14-alpine
WORKDIR /app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist/client ./dist/client
COPY --from=build /app/dist/server ./dist/server
COPY server.mjs ./

RUN chown -R bun:bun /app
USER bun

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --start-interval=2s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1

# --no-env-file: config comes strictly from the environment Swarm/Docker
# gives this container — bun auto-loads a .env file by default (unlike
# Node), which would silently shadow real env vars with a local dev file if
# one were ever accidentally present.
CMD ["bun", "--no-env-file", "server.mjs"]
