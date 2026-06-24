#!/bin/sh
set -e

# Puerto público de Nginx: usa el $PORT de la plataforma o 80 por defecto.
export NGINX_PORT="${PORT:-80}"

# Renderiza la config de Nginx sustituyendo solo NGINX_PORT
# (las variables propias de Nginx como $host se conservan).
envsubst '${NGINX_PORT}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

# Arranca el backend en un puerto interno fijo (3001) en segundo plano.
cd /app/backend
PORT=3001 node dist/main &

# Arranca Nginx en primer plano (mantiene vivo el contenedor).
exec nginx -g 'daemon off;'
