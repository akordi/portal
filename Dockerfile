FROM nginxinc/nginx-unprivileged:1.29-alpine

COPY --chown=nginx:nginx dist/ /usr/share/nginx/html
COPY --chown=nginx:nginx --chmod=755 docker/30-envsubst-content.sh /docker-entrypoint.d/30-envsubst-content.sh
COPY --chown=nginx:nginx docker/default.conf.template /etc/nginx/templates/default.conf.template

# Make the web root nginx-owned so the entrypoint can rewrite files in place
# (sed -i writes its temp file in the target dir) as the nonroot nginx user.
USER root
RUN chown -R nginx:nginx /usr/share/nginx/html
USER nginx

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl --fail http://127.0.0.1:8080/healthz || exit 1
