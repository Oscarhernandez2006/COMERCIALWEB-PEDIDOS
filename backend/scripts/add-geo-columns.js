// Agrega (idempotente) las columnas y tabla de geolocalización.
// Necesario porque synchronize está en false: las columnas nuevas no se crean solas.
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
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS latitude double precision,
        ADD COLUMN IF NOT EXISTS longitude double precision,
        ADD COLUMN IF NOT EXISTS geo_accuracy double precision;
    `);
    await client.query(`
      ALTER TABLE canal_orders
        ADD COLUMN IF NOT EXISTS latitude double precision,
        ADD COLUMN IF NOT EXISTS longitude double precision,
        ADD COLUMN IF NOT EXISTS geo_accuracy double precision;
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS seller_locations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL,
        company_id varchar NOT NULL,
        latitude double precision NOT NULL,
        longitude double precision NOT NULL,
        accuracy double precision,
        captured_at timestamptz NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_seller_locations_user ON seller_locations (user_id);`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_seller_locations_company ON seller_locations (company_id);`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_seller_locations_captured ON seller_locations (captured_at);`,
    );
    console.log('Columnas y tabla de geolocalización listas.');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
