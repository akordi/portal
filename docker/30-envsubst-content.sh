#!/bin/sh

for line in $(ls -1p /usr/share/nginx/html/assets/ | grep -v /); do
  sed -i "s|//BASE_PATH//|${BASE_PATH:-"/"}|g" /usr/share/nginx/html/assets/${line}
  sed -i "s|{{PUBLIC_URL}}|${PUBLIC_URL:-""}|g" /usr/share/nginx/html/assets/${line}
done

for line in $(ls -1p /usr/share/nginx/html/ | grep -v /); do
  sed -i "s|//BASE_PATH//|${BASE_PATH:-"/"}|g" /usr/share/nginx/html/${line}
  sed -i "s|{{PUBLIC_URL}}|${PUBLIC_URL:-""}|g" /usr/share/nginx/html/${line}
  sed -i "s|{{ENVIRONMENT}}|${ENVIRONMENT:-"production"}|g" /usr/share/nginx/html/${line}
  sed -i "s|{{SERVICE_URL}}|${SERVICE_URL:-"/api"}|g" /usr/share/nginx/html/${line}
  sed -i "s|{{AUTH_URL}}|${AUTH_URL:-"/auth"}|g" /usr/share/nginx/html/${line}
done
