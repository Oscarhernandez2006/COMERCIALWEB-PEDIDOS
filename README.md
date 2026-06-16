# Comercial — Software de Toma de Pedidos

Monorepo de un sistema web para que los vendedores tomen pedidos, con
integración a las APIs del ERP **Siesa**.

## Stack

| Capa     | Tecnología                                                        |
| -------- | ----------------------------------------------------------------- |
| Backend  | NestJS · TypeScript · TypeORM · PostgreSQL · JWT · Swagger        |
| Frontend | React · Vite · TypeScript · Tailwind CSS v4 · shadcn-style UI     |
| Datos    | PostgreSQL 16                                                     |

## Estructura

```
COMERCIAL/
├─ backend/         API NestJS (auth, clientes, productos, pedidos, Siesa)
├─ frontend/        SPA React (login, dashboard, toma de pedidos)
└─ docker-compose.yml
```

## Requisitos

- Node.js 20+ (probado con 24)
- Docker (para PostgreSQL) o una instancia de Postgres propia

## Puesta en marcha

### 1. Base de datos

```bash
docker compose up -d db
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # ajusta credenciales de Siesa y DB
npm install
npm run start:dev
```

- API: http://localhost:3000/api
- Swagger: http://localhost:3000/api/docs
- En el primer arranque (modo desarrollo) se crea un usuario admin:
  - **email:** `admin@comercial.local`
  - **password:** `admin123` *(cámbialo)*

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:5173 (proxy de `/api` al backend)

## Integración con Siesa

La integración vive en `backend/src/modules/siesa`:

- `siesa.client.ts` — cliente HTTP (auth ConniKey/ConniToken, timeouts).
- `siesa.service.ts` — endpoints de clientes, productos y creación de pedidos.
- `siesa.types.ts` — tipos de la respuesta cruda de Siesa.

Configura las variables `SIESA_*` en el `.env`. Los paths de la API
(`/api/v1/customers`, etc.) y el mapeo de campos (`f200_*`, `f120_*`) son
plantillas: **ajústalos a tu instancia real de Siesa** (Enterprise / Cloud /
conector REST). Todo el mapeo está centralizado en esos archivos.

### Flujo de un pedido

1. El vendedor crea el pedido (estado `draft`).
2. Lo confirma (`confirmed`).
3. Lo sincroniza a Siesa (`syncing` → `synced` o `failed`).

Los catálogos de clientes y productos se cachean localmente y se sincronizan
desde Siesa con `POST /api/customers/sync` y `POST /api/products/sync`
(solo rol admin).

## Scripts útiles

| Carpeta   | Comando             | Acción                          |
| --------- | ------------------- | ------------------------------- |
| backend   | `npm run start:dev` | API con recarga en caliente     |
| backend   | `npm run build`     | Compila a `dist/`               |
| frontend  | `npm run dev`       | Dev server Vite                 |
| frontend  | `npm run build`     | Build de producción             |

## Seguridad

- Contraseñas con bcrypt, autenticación JWT y guards por rol.
- Validación estricta de entrada con `class-validator` (whitelist).
- Cambia `JWT_SECRET` y las credenciales por defecto antes de producción.
- `DB_SYNCHRONIZE=true` solo para desarrollo; usa migraciones en producción.
