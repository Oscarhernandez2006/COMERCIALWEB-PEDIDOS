// Script puntual: resetea SOLO los pedidos (orders + order_items).
// NO toca inventario, productos, usuarios ni clientes.
// El consecutivo de pedidos se calcula por conteo, así que al quedar la tabla
// vacía la numeración vuelve a empezar en 1 por compañía (1, 2, 3, ...).
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
    await client.query('BEGIN');
    // Primero las líneas (FK hacia orders), luego los pedidos.
    const items = await client.query('DELETE FROM order_items');
    const orders = await client.query('DELETE FROM orders');
    await client.query('COMMIT');

    console.log(`Líneas de pedido eliminadas: ${items.rowCount}`);
    console.log(`Pedidos eliminados: ${orders.rowCount}`);
    console.log('Reset de pedidos completado. Inventario y usuarios intactos.');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
