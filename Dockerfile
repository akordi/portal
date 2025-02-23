FROM nginx:1.27-alpine

COPY --chown=nginx:nginx dist/ /usr/share/nginx/html
COPY --chown=nginx:nginx docker/30-envsubst-content.sh /docker-entrypoint.d/30-envsubst-content.sh
COPY --chown=nginx:nginx docker/default.conf.template /etc/nginx/templates/default.conf.template

RUN chmod +x /docker-entrypoint.d/30-envsubst-content.sh
