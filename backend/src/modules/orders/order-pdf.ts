import PDFDocument from 'pdfkit';
import { Order } from './entities/order.entity';

const COMPANY_NAMES: Record<string, string> = {
  '3': 'AGROPECUARIA SANTACRUZ',
  '8': 'CARNES FRIAS SANTACRUZ',
  '4': 'CARNES SANTACRUZ',
};

/** Formatea un valor numérico como moneda colombiana. */
function money(value: number | string): string {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

/**
 * Genera el PDF de un pedido (sin mostrar el estado: solo la información del
 * cliente, el detalle de productos y los totales).
 *
 * Devuelve una promesa con el contenido binario del PDF.
 */
export function buildOrderPdf(order: Order): Promise<Buffer> {
  return renderOrdersToPdf([order]);
}

/**
 * Genera un único PDF con varios pedidos: cada pedido ocupa su(s) propia(s)
 * página(s). Sirve para la descarga masiva desde el panel de administración.
 */
export function buildOrdersPdf(orders: Order[]): Promise<Buffer> {
  return renderOrdersToPdf(orders);
}

/** Crea el documento PDF y dibuja cada pedido (uno por página). */
function renderOrdersToPdf(orders: Order[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];

    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    orders.forEach((order, idx) => {
      if (idx > 0) doc.addPage();
      drawOrder(doc, order);
    });

    doc.end();
  });
}

/** Dibuja un pedido en el documento, empezando en la posición actual. */
function drawOrder(doc: PDFKit.PDFDocument, order: Order): void {
    const companyName = COMPANY_NAMES[order.companyId] ?? 'Compañía';
    const created = order.createdAt ? new Date(order.createdAt) : new Date();

    // Encabezado.
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .text(companyName, { align: 'left' });
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#555')
      .text('Pedido de venta', { align: 'left' });
    doc.moveDown(0.5);

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#000')
      .text(`Pedido N° ${order.orderNumber}`, { align: 'right' });
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#555')
      .text(`Fecha: ${created.toLocaleString('es-CO')}`, { align: 'right' });

    doc.moveDown(1);
    doc
      .strokeColor('#ddd')
      .moveTo(48, doc.y)
      .lineTo(547, doc.y)
      .stroke();
    doc.moveDown(1);

    // Datos del cliente.
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#000')
      .text('Cliente');
    doc.moveDown(0.3);
    doc.fontSize(10).font('Helvetica').fillColor('#222');

    const c = order.customer;
    const line = (label: string, value?: string | null) => {
      if (!value) return;
      doc
        .font('Helvetica-Bold')
        .text(`${label}: `, { continued: true })
        .font('Helvetica')
        .text(value);
    };
    line('Nombre', c.name);
    line('NIT', c.code);
    line(
      'Sucursal',
      c.branchName ? `${c.branchName} (${c.branch})` : c.branch,
    );
    line(
      'Lista de precios',
      c.priceListName
        ? `${c.priceListName} (${c.priceList})`
        : c.priceList,
    );
    line('Condición de pago', c.paymentTerm);
    line(
      'Vendedor',
      c.sellerName ? `${c.sellerName} (${c.sellerCode})` : c.sellerCode,
    );
    line('Dirección', c.address);
    line('Barrio', c.neighborhood);
    line('Ciudad', c.city);
    line('Departamento', c.department);
    line('Teléfono', c.phone);
    line('Email', c.email);

    doc.moveDown(1);

    // Tabla de productos.
    const tableTop = doc.y;
    const cols = {
      sku: 48,
      name: 110,
      um: 300,
      qty: 350,
      price: 405,
      total: 480,
    };

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#000');
    doc.text('Ref.', cols.sku, tableTop);
    doc.text('Producto', cols.name, tableTop);
    doc.text('UM', cols.um, tableTop);
    doc.text('Cant.', cols.qty, tableTop);
    doc.text('Precio', cols.price, tableTop);
    doc.text('Total', cols.total, tableTop);

    doc
      .strokeColor('#ddd')
      .moveTo(48, tableTop + 14)
      .lineTo(547, tableTop + 14)
      .stroke();

    let y = tableTop + 20;
    doc.font('Helvetica').fillColor('#222');

    for (const item of order.items) {
      // Salto de página si se acaba el espacio.
      if (y > 760) {
        doc.addPage();
        y = 48;
      }
      doc.fontSize(9);
      doc.text(item.sku, cols.sku, y, { width: 56 });
      doc.text(item.productName, cols.name, y, { width: 185 });
      doc.text(item.unitOfMeasure ?? '', cols.um, y, { width: 45 });
      doc.text(String(Number(item.quantity)), cols.qty, y, { width: 45 });
      doc.text(money(item.unitPrice), cols.price, y, { width: 70 });
      doc.text(money(item.lineTotal), cols.total, y, { width: 67 });
      y += 18;
    }

    doc
      .strokeColor('#ddd')
      .moveTo(48, y)
      .lineTo(547, y)
      .stroke();
    y += 12;

    // Totales.
    doc.fontSize(10).font('Helvetica');
    doc.text('Subtotal:', cols.price, y, { width: 70 });
    doc.text(money(order.subtotal), cols.total, y, { width: 67 });
    y += 16;
    doc.text('Impuestos:', cols.price, y, { width: 70 });
    doc.text(money(order.taxes), cols.total, y, { width: 67 });
    y += 16;
    doc.font('Helvetica-Bold').fillColor('#000');
    doc.text('Total:', cols.price, y, { width: 70 });
    doc.text(money(order.total), cols.total, y, { width: 67 });

    // Nota producto.
    if (order.notes) {
      y += 30;
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Nota producto', 48, y);
      doc
        .font('Helvetica')
        .fillColor('#222')
        .text(order.notes, 48, y + 14, { width: 499 });
    }

    // Nota logística.
    if (order.logisticsNote) {
      y += order.notes ? 44 : 30;
      doc
        .font('Helvetica-Bold')
        .fillColor('#000')
        .fontSize(10)
        .text('Nota logística', 48, y);
      doc
        .font('Helvetica')
        .fillColor('#222')
        .text(order.logisticsNote, 48, y + 14, { width: 499 });
    }

    // Tipo de entrega.
    if (order.deliveryType) {
      y += order.notes || order.logisticsNote ? 44 : 30;
      doc
        .font('Helvetica-Bold')
        .fillColor('#000')
        .fontSize(10)
        .text('Tipo de entrega', 48, y);
      doc
        .font('Helvetica')
        .fillColor('#222')
        .text(
          order.deliveryType === 'recoge_en_planta'
            ? 'Recoge en planta'
            : 'Despacho',
          48,
          y + 14,
          { width: 499 },
        );
    }

    // Horario de recibido de pedidos.
    if (order.deliverySchedule) {
      y += order.notes || order.logisticsNote || order.deliveryType ? 44 : 30;
      doc
        .font('Helvetica-Bold')
        .fillColor('#000')
        .fontSize(10)
        .text('Horario de recibido de pedidos', 48, y);
      doc
        .font('Helvetica')
        .fillColor('#222')
        .text(order.deliverySchedule, 48, y + 14, { width: 499 });
    }
}
