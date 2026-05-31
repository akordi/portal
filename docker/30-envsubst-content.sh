#!/bin/sh
set -eu

# Substitute runtime config tokens into the built assets in place.
# The web root is made nginx-owned in the Dockerfile, so `sed -i` (which writes
# its temp file in the target directory) works as the nonroot nginx user.
# Only text assets are scanned, so fonts/images are left untouched.
find /usr/share/nginx/html -type f \
  \( -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.json' \
     -o -name '*.svg' -o -name '*.txt' -o -name '*.webmanifest' \) \
  -exec sed -i \
    -e "s|//BASE_PATH//|${BASE_PATH:-/}|g" \
    -e "s|{{PUBLIC_URL}}|${PUBLIC_URL:-}|g" \
    -e "s|{{APP_NAME}}|${APP_NAME:-Akordi}|g" \
    -e "s|{{APP_TITLE}}|${APP_TITLE:-Akordi}|g" \
    -e "s|{{APP_DESCRIPTION}}|${APP_DESCRIPTION:-}|g" \
    -e "s|{{AUTH_URL}}|${AUTH_URL:-}|g" \
    -e "s|{{AUTH_ENABLED}}|${AUTH_ENABLED:-false}|g" \
    -e "s|{{DEFAULT_LANGUAGE}}|${DEFAULT_LANGUAGE:-lv}|g" \
    -e "s|{{ENVIRONMENT}}|${ENVIRONMENT:-production}|g" \
    -e "s|{{GTAG_ENABLED}}|${GTAG_ENABLED:-false}|g" \
    -e "s|{{GTAG_ID}}|${GTAG_ID:-}|g" \
    -e "s|{{SERVICE_URL}}|${SERVICE_URL:-/api}|g" \
    {} +
