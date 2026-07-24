// Script puntual de migración: agrega el valor 'facturacion' al tipo enum de
// roles de la tabla users (users_role_enum) en Postgres.
// Necesario porque la columna `role` es un enum nativo y en producción
// DB_SYNCHRONIZE=false, así que TypeORM no lo agrega solo.
// Es idempotente: usa "IF NOT EXISTS".
//
// Uso (desde backend/):  node scripts/add-facturacion-role.js
require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await client.connect();

  try {
    await client.query(
      `ALTER TYPE "users_role_enum" ADD VALUE IF NOT EXISTS 'facturacion'`,
    );
    console.log(
      "Valor 'facturacion' agregado al enum users_role_enum (o ya existía).",
    );
    console.log('Listo. Ya se pueden crear/editar usuarios con el rol Facturación.');
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
