// Script puntual: crea el vendedor GUTIERREZ BOLIVAR LEON FELIPE con sus
// codigos de vendedor por compañía. Idempotente: si ya existe, solo
// actualiza/crea los mapeos de compañía.
require('dotenv').config();
const { randomUUID } = require('crypto');
const bcrypt = require('bcrypt');
const { Client } = require('pg');

const DOCUMENT_ID = '1129536792';
const NAME = 'BURGOS BORRERO BELKYS DAYANA';
const PASSWORD = DOCUMENT_ID.slice(-4); // 6792
const ROLE = 'seller';
const COMPANY_CODES = [
  { companyId: '3', sellerCode: '028' },
];

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
    // ¿Ya existe el usuario?
    let userId;
    const found = await client.query(
      'SELECT id FROM users WHERE document_id = $1',
      [DOCUMENT_ID],
    );

    if (found.rowCount > 0) {
      userId = found.rows[0].id;
      console.log(`Usuario ya existe (id ${userId}). Se actualizan compañías.`);
    } else {
      userId = randomUUID();
      const passwordHash = await bcrypt.hash(PASSWORD, 10);
      await client.query(
        `INSERT INTO users
           (id, document_id, name, password_hash, role, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, now(), now())`,
        [userId, DOCUMENT_ID, NAME, passwordHash, ROLE],
      );
      console.log(`Usuario creado -> cedula: ${DOCUMENT_ID} | password: ${PASSWORD}`);
    }

    // Mapeos de compañía con su codigo de vendedor (upsert manual).
    for (const { companyId, sellerCode } of COMPANY_CODES) {
      const existing = await client.query(
        'SELECT id FROM user_companies WHERE user_id = $1 AND company_id = $2',
        [userId, companyId],
      );
      if (existing.rowCount > 0) {
        await client.query(
          `UPDATE user_companies
             SET siesa_seller_code = $1, active = true, updated_at = now()
           WHERE id = $2`,
          [sellerCode, existing.rows[0].id],
        );
        console.log(`Compañía ${companyId}: código actualizado a ${sellerCode}`);
      } else {
        await client.query(
          `INSERT INTO user_companies
             (id, user_id, company_id, siesa_seller_code, active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, true, now(), now())`,
          [randomUUID(), userId, companyId, sellerCode],
        );
        console.log(`Compañía ${companyId}: código ${sellerCode} asignado`);
      }
    }

    console.log('Listo.');
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
