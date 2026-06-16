// Script puntual: limpia usuarios previos para recrear el esquema con cedula.
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
  const res = await client.query('DELETE FROM users');
  console.log(`Filas eliminadas: ${res.rowCount}`);
  await client.end();
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
