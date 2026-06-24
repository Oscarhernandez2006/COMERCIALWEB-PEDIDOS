#!/bin/sh
# ============================================================================
# Construye la imagen y despliega el stack de swarm. Se ejecuta EN EL SERVIDOR.
# ============================================================================
set -e

IMAGE="sigcom-app:latest"
STACK="sigcom"
STACK_FILE="docker-stack.yml"

if [ ! -f backend/.env ]; then
  echo "ERROR: falta backend/.env en el servidor. Crealo antes de desplegar." >&2
  exit 1
fi

echo "==> Construyendo la imagen ($IMAGE)..."
docker build -t "$IMAGE" .

echo "==> Desplegando stack '$STACK' en swarm..."
docker stack deploy -c "$STACK_FILE" "$STACK" --resolve-image never

echo "==> Servicios del stack:"
docker stack services "$STACK"

echo "==> Listo. Revisa logs con: docker service logs -f ${STACK}_app"
