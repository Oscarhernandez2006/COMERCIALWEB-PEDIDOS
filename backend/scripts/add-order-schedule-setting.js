// Script puntual de migración: crea la tabla order_schedule_setting, que guarda
// la ventana horaria (configurable desde el panel admin) para crear pedidos.
// Inserta una fila por defecto (7:00 a.m. – 4:30 p.m., activa) si no existe.
//
// Necesario porque en producción DB_SYNCHRONIZE=false, así que TypeORM no crea
// la tabla solo. Es idempotente: usa "IF NOT EXISTS" y solo inserta si está vacía.
//
// Uso (desde backend/):  node scripts/add-order-schedule-setting.js
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
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_schedule_setting (
        id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        enabled boolean NOT NULL DEFAULT true,
        open_hour int NOT NULL DEFAULT 7,
        open_minute int NOT NULL DEFAULT 0,
        close_hour int NOT NULL DEFAULT 16,
        close_minute int NOT NULL DEFAULT 30
      )
    `);

    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS n FROM order_schedule_setting`,
    );
    if (rows[0].n === 0) {
      await client.query(`
        INSERT INTO order_schedule_setting
          (enabled, open_hour, open_minute, close_hour, close_minute)
        VALUES (true, 7, 0, 16, 30)
      `);
      console.log('Tabla order_schedule_setting creada y fila por defecto insertada (7:00 a.m. – 4:30 p.m.).');
    } else {
      console.log('Tabla order_schedule_setting ya existía con datos. No se modificó.');
    }
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
