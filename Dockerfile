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

FROM nginxinc/nginx-unprivileged:1.29-alpine

# server.mjs (see docker/40-start-ssr-server.sh) renders the SSR-safe routes
# and passes everything else through as the plain static shell nginx used to
# serve directly — see docker/default.conf.template's `location /`.
USER root
RUN apk add --no-cache nodejs

WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist/server ./dist/server
COPY server.mjs ./
# server.mjs reads the template itself (to inject the SSR'd app HTML/head
# tags into it) — point it at nginx's own copy below rather than keeping a
# second one that 30-envsubst-content.sh wouldn't know to also rewrite.
ENV SSR_TEMPLATE_PATH=/usr/share/nginx/html/index.html

COPY --from=build /app/dist/client/ /usr/share/nginx/html
COPY --chmod=755 docker/30-envsubst-content.sh /docker-entrypoint.d/30-envsubst-content.sh
COPY --chmod=755 docker/40-start-ssr-server.sh /docker-entrypoint.d/40-start-ssr-server.sh
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template

# Make the web root and app dir nginx-owned so (a) the entrypoint can rewrite
# files in place (sed -i writes its temp file in the target dir) and
# (b) node runs as the same nonroot user as nginx, both as the unprivileged
# nginx user this image runs as.
RUN chown -R nginx:nginx /usr/share/nginx/html /app
USER nginx

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --start-interval=2s --retries=3 \
  CMD curl --fail http://127.0.0.1:8080/healthz || exit 1
