// Diagnóstico puntual: revisa por qué los clientes de AYELEN OJEDA no aparecen.
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
    // 1) Usuario AYELEN OJEDA
    const users = await client.query(
      `SELECT id, name, document_id, role, siesa_seller_code, active
       FROM users WHERE name ILIKE '%AYELEN%' OR name ILIKE '%OJEDA%'`,
    );
    console.log('\n=== USUARIO ===');
    console.table(users.rows);

    if (users.rowCount === 0) {
      console.log('No se encontró el usuario. Fin.');
      return;
    }

    for (const u of users.rows) {
      console.log(`\n=== MAPEOS DE COMPAÑÍA para ${u.name} (id ${u.id}) ===`);
      const maps = await client.query(
        `SELECT company_id, siesa_seller_code, active
         FROM user_companies WHERE user_id = $1`,
        [u.id],
      );
      console.table(maps.rows);

      // Códigos efectivos a revisar (por compañía y el global del usuario)
      const codes = new Set();
      if (u.siesa_seller_code) codes.add(String(u.siesa_seller_code).trim());
      for (const m of maps.rows) {
        if (m.siesa_seller_code) codes.add(String(m.siesa_seller_code).trim());
      }

      for (const m of maps.rows) {
        const effectiveCode = (m.siesa_seller_code || u.siesa_seller_code || '').trim();
        console.log(
          `\n--- Compañía ${m.company_id} · código efectivo: "${effectiveCode}" ---`,
        );
        if (!effectiveCode) {
          console.log('  ⚠ Sin código de vendedor: no verá clientes.');
        }

        // Clientes que coinciden EXACTO con el código efectivo
        const exact = await client.query(
          `SELECT COUNT(*)::int AS n
           FROM client_records
           WHERE company_id = $1 AND seller_code = $2`,
          [m.company_id, effectiveCode],
        );
        console.log(`  Clientes con seller_code = "${effectiveCode}": ${exact.rows[0].n}`);

        // Clientes que coinciden ignorando espacios / ceros a la izquierda
        const loose = await client.query(
          `SELECT seller_code, COUNT(*)::int AS n
           FROM client_records
           WHERE company_id = $1
             AND TRIM(LEADING '0' FROM TRIM(seller_code)) = TRIM(LEADING '0' FROM TRIM($2))
           GROUP BY seller_code`,
          [m.company_id, effectiveCode || '___nunca___'],
        );
        if (loose.rowCount > 0) {
          console.log('  Coincidencias flexibles (ignorando espacios/ceros):');
          console.table(loose.rows);
        }
      }
    }

    // 2) ¿Existen clientes cuyo nombre de vendedor sea AYELEN? (para hallar su código real en ERP)
    console.log('\n=== Muestra de seller_code distintos por compañía (top 40) ===');
    const distinct = await client.query(
      `SELECT company_id, seller_code, COUNT(*)::int AS clientes
       FROM client_records
       GROUP BY company_id, seller_code
       ORDER BY company_id, clientes DESC
       LIMIT 40`,
    );
    console.table(distinct.rows);
  } finally {
    await client.end();
  }
})();
