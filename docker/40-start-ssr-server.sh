#!/bin/sh
set -eu

# Runs as part of nginx-unprivileged's own docker-entrypoint.d chain, after
# 30-envsubst-content.sh and before nginx itself starts (see Dockerfile) —
# backgrounds the SSR process so nginx's own entrypoint can continue to its
# final `exec nginx`.
node /app/server.mjs &

# nginx's `location /` proxy_passes to this process (see
# default.conf.template). Without this wait, nginx can start accepting
# traffic before Node has bound its port, turning every deploy's first
# request(s) into a 502.
i=0
until wget -q -O /dev/null http://127.0.0.1:3000/ 2>/dev/null || [ "$i" -ge 50 ]; do
  i=$((i + 1))
  sleep 0.1
done
