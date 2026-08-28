// Script puntual de migración: crea la tabla dispatch_tat_invoice, que guarda las
// facturas TAT descargadas de Siesa (agrupadas por consecutivo) y su selección
// para despacho en Drivin.
//
// Necesario porque DB_SYNCHRONIZE=false. Es idempotente (IF NOT EXISTS).
// Elimina la tabla previa dispatch_tat_selection si existía (diseño anterior).
//
// Uso (desde backend/):  node scripts/add-dispatch-tat-invoice.js
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
    await client.query(`DROP TABLE IF EXISTS dispatch_tat_selection`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS dispatch_tat_invoice (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        company_id varchar NOT NULL,
        invoice_number varchar NOT NULL,
        document_date date NOT NULL,
        client_code varchar NOT NULL,
        client_name varchar NOT NULL,
        tipo_comercial varchar,
        quantity numeric(16,2) NOT NULL DEFAULT 0,
        subtotal numeric(16,2) NOT NULL DEFAULT 0,
        selected boolean NOT NULL DEFAULT false,
        published boolean NOT NULL DEFAULT false,
        CONSTRAINT uq_dispatch_tat_company_invoice UNIQUE (company_id, invoice_number)
      )
    `);
    // Para tablas ya creadas antes de agregar la columna de publicación.
    await client.query(
      `ALTER TABLE dispatch_tat_invoice ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_dispatch_tat_company ON dispatch_tat_invoice (company_id)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_dispatch_tat_invoice_num ON dispatch_tat_invoice (invoice_number)`,
    );
    await client.query(
      `CREATE INDEX IF NOT EXISTS idx_dispatch_tat_date ON dispatch_tat_invoice (document_date)`,
    );
    console.log('OK: tabla dispatch_tat_invoice lista.');
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
