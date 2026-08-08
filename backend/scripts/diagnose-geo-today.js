// ¿Qué vendedores tienen pings/pedidos geo hoy? (por nombre)
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
    const day = process.argv[2] || null; // opcional YYYY-MM-DD; si no, hoy Bogota
    const dayExpr = day ? `'${day}'` : `(now() AT TIME ZONE 'America/Bogota')::date`;

    console.log('Día:', day || '(hoy Bogotá)');

    const pings = await client.query(
      `SELECT u.name, l.user_id, COUNT(*)::int AS pings,
              MIN(l.captured_at) AS primero, MAX(l.captured_at) AS ultimo
       FROM seller_locations l
       LEFT JOIN users u ON u.id::text = l.user_id
       WHERE (l.captured_at AT TIME ZONE 'America/Bogota')::date = ${dayExpr}
       GROUP BY u.name, l.user_id
       ORDER BY pings DESC`,
    );
    console.log('\n=== Vendedores con PINGS hoy ===');
    console.table(pings.rows);

    const orders = await client.query(
      `SELECT u.name, o.seller_id, COUNT(*)::int AS pedidos_geo
       FROM orders o
       LEFT JOIN users u ON u.id::text = o.seller_id::text
       WHERE o.latitude IS NOT NULL
         AND (o.created_at AT TIME ZONE 'America/Bogota')::date = ${dayExpr}
       GROUP BY u.name, o.seller_id
       ORDER BY pedidos_geo DESC`,
    );
    console.log('\n=== Vendedores con PEDIDOS geo hoy ===');
    console.table(orders.rows);

    // ¿MANUEL MEJIA?
    const mm = await client.query(
      `SELECT id, name FROM users WHERE name ILIKE '%MANUEL%MEJIA%'`,
    );
    console.log('\n=== Usuario MANUEL MEJIA ===');
    console.table(mm.rows);
    for (const u of mm.rows) {
      const p = await client.query(
        `SELECT COUNT(*)::int AS pings FROM seller_locations
         WHERE user_id = $1 AND (captured_at AT TIME ZONE 'America/Bogota')::date = ${dayExpr}`,
        [u.id],
      );
      const o = await client.query(
        `SELECT COUNT(*)::int AS pedidos FROM orders
         WHERE seller_id = $1 AND latitude IS NOT NULL
           AND (created_at AT TIME ZONE 'America/Bogota')::date = ${dayExpr}`,
        [u.id],
      );
      console.log(`  ${u.name}: pings=${p.rows[0].pings}, pedidos_geo=${o.rows[0].pedidos}`);
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
