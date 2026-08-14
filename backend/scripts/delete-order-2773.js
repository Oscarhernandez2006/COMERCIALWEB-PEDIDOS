// Script puntual: elimina el pedido #2773 de AGROPECUARIA (compañía 3).
require('dotenv').config();
const { Client } = require('pg');

const COMPANY_ID = '3';
const ORDER_NUMBER = '2773';

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
    const found = await client.query(
      `SELECT o.id, o.order_number, o.company_id, o.status, o.total,
              c.name AS cliente
       FROM orders o
       LEFT JOIN client_records c ON c.id = o.customer_id
       WHERE o.company_id = $1 AND o.order_number = $2`,
      [COMPANY_ID, ORDER_NUMBER],
    );

    if (found.rowCount === 0) {
      console.log(`No se encontró el pedido #${ORDER_NUMBER} en compañía ${COMPANY_ID}.`);
      return;
    }
    console.log('Pedido(s) a eliminar:');
    console.table(found.rows);

    await client.query('BEGIN');
    for (const o of found.rows) {
      await client.query('DELETE FROM order_items WHERE order_id = $1', [o.id]);
      await client.query('DELETE FROM orders WHERE id = $1', [o.id]);
      console.log(`Eliminado pedido ${o.order_number} (id ${o.id}).`);
    }
    await client.query('COMMIT');
    console.log('Listo. Pedido(s) eliminado(s).');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error, se revirtió:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
