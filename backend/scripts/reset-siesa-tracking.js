// Script puntual: limpia los campos de trazabilidad de Siesa en TODOS los
// pedidos, para forzar una re-sincronización limpia tras corregir el cruce de
// estados (NUM_REFERENCIA) y el tipo de documento. No borra pedidos.
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
    const res = await client.query(
      `UPDATE orders
         SET siesa_estado = NULL,
             siesa_estado_previo = NULL,
             siesa_state_notification_pending = false,
             siesa_tracking_done = false
       WHERE siesa_estado IS NOT NULL
          OR siesa_tracking_done = true
          OR siesa_state_notification_pending = true`,
    );
    console.log(`Pedidos con trazabilidad de Siesa reseteada: ${res.rowCount}`);
    console.log('Listo. El scheduler volverá a consultar el estado real en Siesa.');
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
