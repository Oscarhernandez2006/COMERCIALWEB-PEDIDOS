#!/usr/bin/env bash
# ============================================================
# Restaura los labels de Traefik para el servicio SIGCOM en
# Docker Swarm (Traefik v2.11, provider docker swarmMode).
#
# Por qué existe: Dokploy recrea el servicio en cada deploy y
# borra los labels que se ponen a mano. Vuelve a ejecutar este
# script DESPUÉS de cada deploy si el sitio deja de responder.
#
# Solución permanente: configurar el dominio en la pestaña
# "Domains" de la aplicación en la UI de Dokploy (host, puerto
# 3003, HTTPS + certresolver letsencrypt). Eso persiste solo.
#
# Uso:  sudo bash deploy/restore-traefik-sigcom.sh
# ============================================================
set -euo pipefail

DOMAIN="sigcom.grupo-santacruz.com"   # <-- cambia el dominio si aplica
PORT="3003"                           # Nginx de la imagen combinada (frontend + proxy /api)
NETWORK="dokploy-network"
CERTRESOLVER="letsencrypt"
ROUTER="sigcom"

# Nombre (o prefijo) del servicio de la APP WEB. OJO: debe ser la app, NO la
# base de datos. Antes esto usaba '^sigcom', que hacía match con el postgres
# 'sigcompro-...' y le ponía el dominio web a la DB (causa del 502).
APP_MATCH="insitu-app-comercial"

# Detecta automáticamente el servicio de la app web (el sufijo cambia por deploy)
SERVICE="$(docker service ls --format '{{.Name}}' | grep -i "${APP_MATCH}" | head -n1 || true)"
if [ -z "${SERVICE}" ]; then
  echo "ERROR: no se encontró ningún servicio que coincida con '${APP_MATCH}'."
  echo "Servicios disponibles:"
  docker service ls --format '  - {{.Name}}'
  exit 1
fi

# Seguridad: limpia labels de Traefik que pudieran haber quedado en OTROS
# servicios (p. ej. la base de datos) reclamando el mismo dominio. Sin esto,
# Traefik balancea entre la app y un backend muerto -> 502 intermitente.
for OTHER in $(docker service ls --format '{{.Name}}'); do
  [ "${OTHER}" = "${SERVICE}" ] && continue
  if docker service inspect "${OTHER}" --format '{{json .Spec.Labels}}' 2>/dev/null | grep -q "${DOMAIN}"; then
    echo ">> Quitando labels de Traefik (dominio ${DOMAIN}) del servicio ajeno: ${OTHER}"
    docker service update \
      --label-rm 'traefik.enable' \
      --label-rm 'traefik.http.middlewares.sigcom-redirect.redirectscheme.scheme' \
      --label-rm 'traefik.http.routers.sigcom-secure.entrypoints' \
      --label-rm 'traefik.http.routers.sigcom-secure.rule' \
      --label-rm 'traefik.http.routers.sigcom-secure.tls' \
      --label-rm 'traefik.http.routers.sigcom-secure.tls.certresolver' \
      --label-rm 'traefik.http.routers.sigcom-web.entrypoints' \
      --label-rm 'traefik.http.routers.sigcom-web.middlewares' \
      --label-rm 'traefik.http.routers.sigcom-web.rule' \
      --label-rm 'traefik.http.services.sigcom.loadbalancer.server.port' \
      "${OTHER}" || true
  fi
done

echo ">> Servicio detectado: ${SERVICE}"
echo ">> Aplicando labels de Traefik (dominio ${DOMAIN}, puerto ${PORT})..."

docker service update \
  --label-add 'traefik.enable=true' \
  --label-add "traefik.docker.network=${NETWORK}" \
  --label-add "traefik.http.routers.${ROUTER}-web.rule=Host(\`${DOMAIN}\`)" \
  --label-add "traefik.http.routers.${ROUTER}-web.entrypoints=web" \
  --label-add "traefik.http.routers.${ROUTER}-web.middlewares=${ROUTER}-redirect" \
  --label-add "traefik.http.routers.${ROUTER}-secure.rule=Host(\`${DOMAIN}\`)" \
  --label-add "traefik.http.routers.${ROUTER}-secure.entrypoints=websecure" \
  --label-add "traefik.http.routers.${ROUTER}-secure.tls=true" \
  --label-add "traefik.http.routers.${ROUTER}-secure.tls.certresolver=${CERTRESOLVER}" \
  --label-add "traefik.http.middlewares.${ROUTER}-redirect.redirectscheme.scheme=https" \
  --label-add "traefik.http.services.${ROUTER}.loadbalancer.server.port=${PORT}" \
  "${SERVICE}"

echo ">> Listo. Traefik debería enrutar https://${DOMAIN} en unos segundos."
echo ">> Verifica con:  curl -I https://${DOMAIN}"
