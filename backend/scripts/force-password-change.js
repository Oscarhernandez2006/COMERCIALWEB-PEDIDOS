/**
 * Script para marcar todos los usuarios existentes con mustChangePassword = true.
 * Ejecutar una única vez después de agregar la columna.
 * 
 * Uso: node scripts/force-password-change.js
 */

require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Conectado a la base de datos.');

    // Primero verifica si la columna existe
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'must_change_password'
    `);

    if (checkColumn.rows.length === 0) {
      // Crear la columna si no existe
      console.log('Creando columna must_change_password...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true
      `);
    }

    // Marcar todos los usuarios con mustChangePassword = true
    const result = await client.query(`
      UPDATE users 
      SET must_change_password = true 
      WHERE must_change_password IS NULL OR must_change_password = false
    `);

    console.log(`Usuarios actualizados: ${result.rowCount}`);
    console.log('Todos los usuarios deberán cambiar su contraseña en el próximo inicio de sesión.');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
