// Diagnóstico puntual: revisa por qué se repite ALMACENES EXITO (890900608).
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
    const rows = await client.query(
      `SELECT company_id, code, branch, branch_name, phone, seller_code
       FROM client_records
       WHERE code = '890900608'
       ORDER BY company_id, branch`,
    );
    console.log(`Filas para código 890900608: ${rows.rowCount}`);
    console.table(rows.rows);

    // ¿Hay filas verdaderamente duplicadas (mismo company+code+branch)?
    const dups = await client.query(
      `SELECT company_id, code, branch, COUNT(*) AS n
       FROM client_records
       WHERE code = '890900608'
       GROUP BY company_id, code, branch
       HAVING COUNT(*) > 1`,
    );
    console.log(`\nDuplicados exactos (company+code+branch): ${dups.rowCount}`);
    if (dups.rowCount > 0) console.table(dups.rows);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
