// Script puntual: reenvía a Siesa la parte BOVINA (RES) del pedido #3701 que
// no se separó en su momento, usando el siguiente consecutivo del pool de
// AGROPECUARIA como `second_number`. El porcino (2002) ya está en Siesa como
// 3701 y se deja tal cual. Reintenta hasta que Siesa acepte el documento.
require('dotenv').config();
const { Client } = require('pg');
const axios = require('axios');

const COMPANY_ID = '3';
const ORDER_NUMBER = '3701';
const WAREHOUSE = '30103'; // AGROPECUARIA (getWarehouse('3'))
const BOVINO_ENDPOINT = 'ventas/pedidos-subproductos-bovino';
// Referencias que pertenecen a RES (bovino) según la clasificación canónica.
const RES_SKUS = new Set(['3003', '3213']);

const MAX_ATTEMPTS = 20;
const RETRY_DELAY_MS = 4000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Fecha de hoy YYYYMMDD en horario de Colombia. */
function erpToday() {
  const s = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return s.replace(/-/g, '');
}

/** ¿Siesa rechazó el documento? (printTipoError != 0, aunque el HTTP sea 200). */
function erpRejection(data) {
  const text = typeof data === 'string' ? data : JSON.stringify(data ?? '');
  const tipo = text.match(/<printTipoError>\s*(\d+)\s*<\/printTipoError>/i);
  if (tipo && Number(tipo[1]) !== 0) {
    const detalle = text.match(/<f_detalle>([^<]*)<\/f_detalle>/i);
    return detalle?.[1]?.trim() || 'Siesa rechazó el pedido.';
  }
  return null;
}

(async () => {
  const baseUrl = process.env.PRICE_LISTS_BASE_URL;
  const token = process.env.PRICE_LISTS_TOKEN;
  const timeout = Number(process.env.PRICE_LISTS_TIMEOUT_MS || 30000);
  if (!baseUrl || !token) {
    console.error('Faltan PRICE_LISTS_BASE_URL o PRICE_LISTS_TOKEN en .env');
    process.exit(1);
  }

  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await client.connect();

  try {
    // 1) Cargar el pedido con los datos necesarios para el payload.
    const orderRes = await client.query(
      `SELECT o.id, o.order_number, o.second_number, o.status, o.type,
              to_char(o.delivery_date, 'YYYYMMDD') AS fecha_entrega_erp,
              o.logistics_note, o.notes,
              c.code AS cliente_code, c.branch AS sucursal,
              c.payment_term AS cond_pago,
              u.document_id AS vendedor
       FROM orders o
       JOIN client_records c ON c.id = o.customer_id
       JOIN users u ON u.id = o.seller_id
       WHERE o.company_id = $1 AND o.order_number = $2`,
      [COMPANY_ID, ORDER_NUMBER],
    );
    if (orderRes.rowCount === 0) {
      console.error(`No se encontró el pedido #${ORDER_NUMBER}.`);
      process.exit(1);
    }
    const order = orderRes.rows[0];
    if (order.type !== 'subproducto') {
      console.error('El pedido no es de subproductos.');
      process.exit(1);
    }

    const itemsRes = await client.query(
      `SELECT sku, unit_of_measure, quantity, unit_price
       FROM order_items WHERE order_id = $1 ORDER BY sku`,
      [order.id],
    );
    const bovinoItems = itemsRes.rows.filter((it) => RES_SKUS.has(it.sku.trim()));
    if (bovinoItems.length === 0) {
      console.error('El pedido no tiene ítems bovinos (RES) para reenviar.');
      process.exit(1);
    }
    console.log('Ítems bovinos a reenviar:');
    console.table(bovinoItems);

    // 2) Reservar el siguiente consecutivo como second_number (atómico).
    let consecutivo = order.second_number;
    if (!consecutivo) {
      const upd = await client.query(
        `UPDATE orders
            SET second_number = (
              SELECT (MAX(GREATEST(
                        COALESCE(order_number::int, 0),
                        COALESCE(second_number::int, 0)
                      )) + 1)::text
              FROM orders WHERE company_id = $1
            )
          WHERE id = $2 AND second_number IS NULL
          RETURNING second_number`,
        [COMPANY_ID, order.id],
      );
      consecutivo = upd.rows[0].second_number;
      console.log(`Reservado second_number = ${consecutivo} para #${ORDER_NUMBER}.`);
    } else {
      console.log(`El pedido ya tenía second_number = ${consecutivo}; se reutiliza.`);
    }

    // 3) Armar el payload bovino con ese consecutivo.
    const notesParts = [];
    if (order.logistics_note && order.logistics_note.trim())
      notesParts.push(`notas logistica: ${order.logistics_note.trim()}`);
    if (order.notes && order.notes.trim())
      notesParts.push(`notas producto: ${order.notes.trim()}`);
    const notas = notesParts.join(' / ');

    const fecha = erpToday();
    const fechaEntrega = order.fecha_entrega_erp || fecha;

    const registros = bovinoItems.map((it) => ({
      documento_venta: consecutivo,
      fecha,
      cliente: order.cliente_code,
      sucursal: order.sucursal,
      vendedor: order.vendedor,
      fecha_de_entrega: fechaEntrega,
      bodega: WAREHOUSE,
      referencia: it.sku,
      um: it.unit_of_measure ?? '',
      cantidad: String(Number(it.quantity)),
      precio: String(Number(it.unit_price)),
      cond_pago: order.cond_pago ?? '',
      notas,
    }));
    console.log('Payload bovino:', JSON.stringify(registros, null, 2));

    // 4) Enviar a Siesa reintentando hasta que acepte.
    let ok = false;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      console.log(`\nIntento ${attempt}/${MAX_ATTEMPTS} → ${BOVINO_ENDPOINT} (doc ${consecutivo})`);
      try {
        const resp = await axios.post(
          `${baseUrl}/${BOVINO_ENDPOINT}`,
          { registros },
          { params: { token }, timeout },
        );
        const rejection = erpRejection(resp.data);
        if (rejection) {
          console.warn(`Siesa rechazó: ${rejection}`);
        } else {
          console.log('Respuesta Siesa:', JSON.stringify(resp.data));
          ok = true;
          break;
        }
      } catch (err) {
        const msg = err.response
          ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data)}`
          : err.message;
        console.warn(`Error de red/ERP: ${msg}`);
      }
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }

    if (ok) {
      console.log(
        `\n✅ Parte bovina de #${ORDER_NUMBER} enviada a Siesa como documento ${consecutivo}. ` +
          `second_number guardado en la DB.`,
      );
    } else {
      console.error(
        `\n❌ No se pudo subir la parte bovina tras ${MAX_ATTEMPTS} intentos. ` +
          `second_number = ${consecutivo} quedó reservado; se puede reintentar el script.`,
      );
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
})();
