// Script de mantenimiento: carga las tasas de IVA de los productos a la tabla
// `products`, a partir de los dos Excel entregados por el negocio.
//
//   - "PRODUCTOS X IVA AGROPECUARIA.xlsx"  -> compañía 3 (AGROPECUARIA)
//   - "PRODUCTOS X IVA CARNES FRIAS.xlsx"  -> compañía 8 (CARNES FRIAS)
//
// Cada Excel tiene las columnas: Referencia, Desc. item, IVA (0, 5 o 19).
// El script actualiza `products.tax_rate` cruzando por (company_id, sku).
// El precio del producto NO cambia: el IVA solo se agrega para mostrarlo en la
// app, el PDF y al cliente. Al subir el pedido a Siesa se sigue enviando el
// precio base sin IVA (el ERP le agrega el impuesto).
//
// Es idempotente: puede correrse varias veces. La base de datos es la misma
// (remota) para local y producción, así que basta ejecutarlo una vez.
//
// Uso (desde backend/):  node scripts/load-iva-rates.js
require('dotenv').config();
const path = require('path');
const XLSX = require('xlsx');
const { Client } = require('pg');

// Excel entregados por el negocio (en la raíz del repo) y su compañía destino.
const SOURCES = [
  { companyId: '3', file: 'PRODUCTOS X IVA AGROPECUARIA.xlsx' },
  { companyId: '8', file: 'PRODUCTOS X IVA CARNES FRIAS.xlsx' },
];

/** Lee un Excel y devuelve [{ reference, iva }] con las filas válidas. */
function readRates(fileName) {
  const filePath = path.resolve(__dirname, '..', '..', fileName);
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  const out = [];
  for (const row of rows) {
    const reference = String(row['Referencia'] ?? '').trim();
    if (!reference) continue;
    const iva = Number(row['IVA']);
    if (Number.isNaN(iva)) continue;
    out.push({ reference, iva });
  }
  return out;
}

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
    for (const { companyId, file } of SOURCES) {
      const rates = readRates(file);
      let updated = 0;
      let notFound = 0;
      for (const { reference, iva } of rates) {
        const res = await client.query(
          `UPDATE products SET tax_rate = $1
             WHERE company_id = $2 AND TRIM(sku) = $3`,
          [iva, companyId, reference],
        );
        if (res.rowCount > 0) updated += res.rowCount;
        else notFound++;
      }
      console.log(
        `Compañía ${companyId} (${file}): ${rates.length} filas, ` +
          `${updated} productos actualizados, ${notFound} referencias sin match en inventario.`,
      );
    }
    console.log('Listo. Tasas de IVA cargadas.');
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
