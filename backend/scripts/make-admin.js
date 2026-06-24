// Script puntual: asigna el rol 'admin' a un usuario por su documento.
require('dotenv').config();
const { Client } = require('pg');

const DOCUMENT_ID = '1129536792';

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
    const res = await client.query(
      `UPDATE users SET role = 'admin' WHERE document_id = $1
       RETURNING id, name, document_id, role`,
      [DOCUMENT_ID],
    );

    if (res.rowCount === 0) {
      console.log(`No se encontró ningún usuario con documento ${DOCUMENT_ID}.`);
    } else {
      for (const u of res.rows) {
        console.log(`Usuario ${u.name} (${u.document_id}) -> rol: ${u.role}`);
      }
    }
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
