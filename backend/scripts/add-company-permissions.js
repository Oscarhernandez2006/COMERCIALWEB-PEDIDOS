// Script puntual de migración: agrega la columna `permissions` (jsonb) a la
// tabla user_companies para soportar permisos de módulos POR compañía.
// Es idempotente: usa "IF NOT EXISTS", así que se puede correr varias veces.
//
// Uso (desde backend/):  node scripts/add-company-permissions.js
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
      `ALTER TABLE user_companies
         ADD COLUMN IF NOT EXISTS permissions jsonb NOT NULL DEFAULT '[]'::jsonb`,
    );
    console.log('Columna user_companies.permissions creada (o ya existía).');
    console.log(
      'Listo. Los permisos por compañía empiezan vacíos: cada usuario verá ' +
        'todos los módulos de su rol hasta que el admin asigne módulos específicos por empresa.',
    );
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
