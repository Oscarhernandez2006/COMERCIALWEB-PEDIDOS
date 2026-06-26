// Script puntual de migración: agrega las columnas de "alistado" a la tabla
// orders (picked / picked_at / picked_by). Permite que el alistador marque un
// pedido como ya alistado/sacado desde el módulo de Descargar pedidos y que la
// marca persista.
// Necesario porque en producción DB_SYNCHRONIZE=false, así que TypeORM no crea
// las columnas solo. Es idempotente: usa "IF NOT EXISTS".
//
// Uso (desde backend/):  node scripts/add-order-picked.js
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
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked boolean NOT NULL DEFAULT false`,
    );
    await client.query(
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_at timestamptz`,
    );
    await client.query(
      `ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_by varchar`,
    );
    console.log('Columnas picked / picked_at / picked_by agregadas a orders (o ya existían).');
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
