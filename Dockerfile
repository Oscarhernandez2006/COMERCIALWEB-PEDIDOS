# ============================================================================
# Imagen única que construye y ejecuta TODO el proyecto:
#   - Backend NestJS (Node) en un puerto interno (3001)
#   - Frontend (build de Vite) servido por Nginx, con proxy de /api al backend
# Pensada para plataformas que construyen el Dockerfile en la raíz del repo.
# ============================================================================

# ---- 1) Build del frontend (Vite -> dist) ----------------------------------
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- 2) Dependencias de producción del backend (con módulos nativos) -------
FROM node:22-bookworm-slim AS backend-deps
WORKDIR /app/backend
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY backend/package*.json ./
RUN npm ci --omit=dev

# ---- 3) Build del backend (TypeScript -> dist) -----------------------------
FROM node:22-bookworm-slim AS backend-build
WORKDIR /app/backend
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# ---- 4) Imagen final: Node + Nginx en un solo contenedor -------------------
FROM node:22-bookworm-slim AS production
ENV NODE_ENV=production
RUN apt-get update \
  && apt-get install -y --no-install-recommends nginx gettext-base \
  && rm -rf /var/lib/apt/lists/* \
  && rm -f /etc/nginx/sites-enabled/default

WORKDIR /app

# Backend: dependencias + código compilado
COPY backend/package*.json ./backend/
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules
COPY --from=backend-build /app/backend/dist ./backend/dist

# Frontend: build estático servido por Nginx
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# Configuración de Nginx (plantilla) y script de arranque
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/start.sh /start.sh
RUN sed -i 's/\r$//' /start.sh && chmod +x /start.sh

# El frontend se publica en el puerto 80 (o el $PORT que inyecte la plataforma).
EXPOSE 80
CMD ["/start.sh"]
