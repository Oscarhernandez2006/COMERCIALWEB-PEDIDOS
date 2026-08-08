// Diagnóstico: ¿hay datos de geolocalización?
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
    const locExists = await client.query(
      `SELECT to_regclass('public.seller_locations') AS t;`,
    );
    console.log('Tabla seller_locations:', locExists.rows[0].t);

    const locCount = await client.query(
      `SELECT COUNT(*)::int AS n FROM seller_locations;`,
    );
    console.log('Pings registrados:', locCount.rows[0].n);

    const lastPings = await client.query(
      `SELECT user_id, company_id, latitude, longitude, captured_at
       FROM seller_locations ORDER BY captured_at DESC LIMIT 5;`,
    );
    console.table(lastPings.rows);

    const ordersGeo = await client.query(
      `SELECT COUNT(*)::int AS con_geo
       FROM orders WHERE latitude IS NOT NULL;`,
    );
    console.log('Pedidos con geo:', ordersGeo.rows[0].con_geo);

    const recentOrders = await client.query(
      `SELECT order_number, company_id, seller_id, latitude, longitude,
              (created_at AT TIME ZONE 'America/Bogota')::date AS dia
       FROM orders
       ORDER BY created_at DESC LIMIT 8;`,
    );
    console.table(recentOrders.rows);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
