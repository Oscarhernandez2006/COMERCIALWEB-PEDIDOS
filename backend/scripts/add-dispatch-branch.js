/* Agrega columnas de sucursal a dispatch_tat_invoice (idempotente). */
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
      `ALTER TABLE dispatch_tat_invoice ADD COLUMN IF NOT EXISTS branch_code varchar`,
    );
    await client.query(
      `ALTER TABLE dispatch_tat_invoice ADD COLUMN IF NOT EXISTS branch_name varchar`,
    );
    await client.query(
      `ALTER TABLE dispatch_tat_invoice ADD COLUMN IF NOT EXISTS branch_address varchar`,
    );
    console.log('OK: columnas de sucursal listas en dispatch_tat_invoice.');
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
