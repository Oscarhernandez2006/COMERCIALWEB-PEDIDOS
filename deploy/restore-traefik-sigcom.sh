docker service update \
  --label-add 'traefik.enable=true' \
  --label-add 'traefik.http.routers.sigcom.rule=Host(`sigcom.grupo-santacruz.com`)' \
  --label-add 'traefik.http.routers.sigcom.entrypoints=websecure' \
  --label-add 'traefik.http.routers.sigcom.tls=true' \
  --label-add 'traefik.http.routers.sigcom.tls.certresolver=letsencrypt' \
  --label-add 'traefik.http.routers.sigcom.service=sigcom' \
  --label-add 'traefik.http.services.sigcom.loadbalancer.server.port=3003' \
  --label-add 'traefik.http.routers.sigcom-web.rule=Host(`sigcom.grupo-santacruz.com`)' \
  --label-add 'traefik.http.routers.sigcom-web.entrypoints=web' \
  --label-add 'traefik.http.routers.sigcom-web.middlewares=sigcom-redirect-https' \
  --label-add 'traefik.http.middlewares.sigcom-redirect-https.redirectscheme.scheme=https' \
  --label-add 'traefik.http.middlewares.sigcom-redirect-https.redirectscheme.permanent=true' \
  --label-add 'traefik.docker.network=dokploy-network' \
  insitu-app-comercial-jh1sse
