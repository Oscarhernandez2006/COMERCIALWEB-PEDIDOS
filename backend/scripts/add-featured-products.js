/* Crea la tabla featured_product (productos estrella/favoritos por compañía). */
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
    await client.query(`
      CREATE TABLE IF NOT EXISTS featured_product (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        company_id varchar NOT NULL,
        sku varchar NOT NULL,
        name varchar NOT NULL,
        CONSTRAINT uq_featured_company_sku UNIQUE (company_id, sku)
      )
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_featured_company ON featured_product (company_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_featured_sku ON featured_product (sku)`,
    );
    console.log('OK: tabla featured_product lista.');
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
