import * as XLSX from 'xlsx';
import { InventoryReportData } from './inventory-report';
import { ProductSalesReportData } from './product-sales-report';
import { SalesSummaryReportData } from './sales-summary-report';
import { SellerRankingReportData } from './seller-ranking-report';
import { SellerProductReportData } from './seller-product-report';
import { ProductSellerReportData } from './product-seller-report';

const COMPANY_NAMES: Record<string, string> = {
  '3': 'AGROPECUARIA SANTACRUZ',
  '8': 'CARNES FRIAS SANTACRUZ',
  '4': 'CARNES SANTACRUZ',
};

/** Aplica un ancho de columnas razonable a una hoja. */
function setColumnWidths(ws: XLSX.WorkSheet, widths: number[]): void {
  ws['!cols'] = widths.map((wch) => ({ wch }));
}

/** Genera el Excel del resumen de inventario por día. */
export function buildInventoryReportExcel(data: InventoryReportData): Buffer {
  const companyName = COMPANY_NAMES[data.companyId] ?? `Compañía ${data.companyId}`;

  const aoa: (string | number)[][] = [
    ['Resumen de inventario por día'],
    [companyName],
    [`Fecha: ${data.date}`],
    [],
    ['Referencia', 'Producto', 'UM', 'Vendido', 'Stock'],
  ];

  for (const r of data.rows) {
    aoa.push([r.sku, r.name, r.unitOfMeasure ?? '', r.sold, r.stock]);
  }

  aoa.push([]);
  aoa.push(['Total referencias', data.summary.totalRefs]);
  aoa.push(['Con existencias', data.summary.refsWithStock]);
  aoa.push(['Sin existencias', data.summary.refsWithoutStock]);
  aoa.push(['Total vendido', data.summary.totalSold]);
  aoa.push(['Total stock', data.summary.totalStock]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  setColumnWidths(ws, [18, 44, 8, 12, 12]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** Genera el Excel de productos vendidos (una hoja por compañía). */
export function buildProductSalesReportExcel(
  data: ProductSalesReportData,
): Buffer {
  const wb = XLSX.utils.book_new();

  for (const company of data.companies) {
    const aoa: (string | number)[][] = [
      ['Productos vendidos'],
      [company.companyName],
      [`Rango: ${data.from} a ${data.to}`],
      [],
      ['Referencia', 'Producto', 'UM', 'Cantidad', 'Ingresos'],
    ];

    for (const r of company.rows) {
      aoa.push([r.sku, r.name, r.unitOfMeasure ?? '', r.quantity, r.revenue]);
    }

    aoa.push([]);
    aoa.push(['Total productos', company.summary.totalProducts]);
    aoa.push(['Total cantidad', company.summary.totalQuantity]);
    aoa.push(['Total ingresos', company.summary.totalRevenue]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    setColumnWidths(ws, [18, 44, 8, 12, 16]);

    // El nombre de hoja en Excel admite máx. 31 caracteres y sin algunos símbolos.
    const sheetName = `${company.companyId} ${company.companyName}`
      .replace(/[\\/?*[\]:]/g, ' ')
      .slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  // Si por algún motivo no hubo compañías, agrega una hoja vacía válida.
  if (data.companies.length === 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([['Sin datos']]),
      'Vacío',
    );
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** Genera el Excel del resumen de ventas por cliente o por producto. */
export function buildSalesSummaryReportExcel(
  data: SalesSummaryReportData,
): Buffer {
  const byCustomer = data.groupBy === 'customer';
  const title = byCustomer
    ? 'Resumen de ventas por cliente'
    : 'Resumen de ventas por producto';

  const aoa: (string | number)[][] = [
    [title],
    [data.companyName],
    [`Rango: ${data.from} a ${data.to}`],
    [],
    byCustomer
      ? ['Código', 'Cliente', 'Pedidos', 'Unidades', 'Ingresos']
      : ['Referencia', 'Producto', 'UM', 'Cantidad', 'Ingresos'],
  ];

  for (const r of data.rows) {
    if (byCustomer) {
      aoa.push([r.reference, r.name, r.orders ?? 0, r.units, r.revenue]);
    } else {
      aoa.push([r.reference, r.name, r.unitOfMeasure ?? '', r.units, r.revenue]);
    }
  }

  aoa.push([]);
  if (byCustomer) {
    aoa.push(['Total clientes', data.summary.totalRows]);
    aoa.push(['Total pedidos', data.summary.totalOrders]);
  } else {
    aoa.push(['Total productos', data.summary.totalRows]);
    aoa.push(['Total cantidad', data.summary.totalUnits]);
  }
  aoa.push(['Total ingresos', data.summary.totalRevenue]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  setColumnWidths(ws, [18, 44, 12, 12, 16]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, byCustomer ? 'Por cliente' : 'Por producto');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** Genera el Excel del ranking de vendedores. */
export function buildSellerRankingReportExcel(
  data: SellerRankingReportData,
): Buffer {
  const aoa: (string | number)[][] = [
    ['Ranking de vendedores'],
    [data.companyName],
    [`Rango: ${data.from} a ${data.to}`],
    [],
    ['#', 'Vendedor', 'Cédula', 'Código', 'Pedidos', 'Unidades', 'Ingresos'],
  ];

  for (const r of data.rows) {
    aoa.push([
      r.position,
      r.name,
      r.documentId ?? '',
      r.sellerCode ?? '',
      r.orders,
      r.units,
      r.revenue,
    ]);
  }

  aoa.push([]);
  aoa.push(['Total vendedores', data.summary.totalSellers]);
  aoa.push(['Total pedidos', data.summary.totalOrders]);
  aoa.push(['Total unidades', data.summary.totalUnits]);
  aoa.push(['Total ingresos', data.summary.totalRevenue]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  setColumnWidths(ws, [6, 36, 16, 10, 12, 12, 16]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ranking');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** Genera el Excel del reporte vendedor–producto. */
export function buildSellerProductReportExcel(
  data: SellerProductReportData,
): Buffer {
  const aoa: (string | number)[][] = [
    ['Ventas por vendedor y producto'],
    [data.companyName],
    [`Rango: ${data.from} a ${data.to}`],
  ];
  if (data.sellerName) aoa.push([`Vendedor: ${data.sellerName}`]);
  if (data.search) aoa.push([`Producto: ${data.search}`]);
  aoa.push([]);
  aoa.push([
    'Vendedor',
    'Cédula',
    'Código',
    'Referencia',
    'Producto',
    'UM',
    'Cantidad',
    'Ingresos',
  ]);

  for (const r of data.rows) {
    aoa.push([
      r.sellerName,
      r.documentId ?? '',
      r.sellerCode ?? '',
      r.sku,
      r.productName,
      r.unitOfMeasure ?? '',
      r.quantity,
      r.revenue,
    ]);
  }

  aoa.push([]);
  aoa.push(['Total líneas', data.summary.totalRows]);
  aoa.push(['Total unidades', data.summary.totalQuantity]);
  aoa.push(['Total ingresos', data.summary.totalRevenue]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  setColumnWidths(ws, [32, 16, 10, 16, 40, 8, 12, 16]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Vendedor-Producto');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export function buildProductSellerReportExcel(
  data: ProductSellerReportData,
): Buffer {
  const aoa: (string | number)[][] = [
    ['Mejor vendedor por producto'],
    [data.companyName],
    [`Rango: ${data.from} a ${data.to}`],
  ];
  if (data.search) aoa.push([`Producto: ${data.search}`]);
  aoa.push([]);
  aoa.push([
    'Referencia',
    'Producto',
    'UM',
    'Posición',
    'Vendedor',
    'Cédula',
    'Código',
    'Cantidad',
    'Ingresos',
  ]);

  for (const r of data.rows) {
    aoa.push([
      r.sku,
      r.productName,
      r.unitOfMeasure ?? '',
      r.position,
      r.sellerName,
      r.documentId ?? '',
      r.sellerCode ?? '',
      r.quantity,
      r.revenue,
    ]);
  }

  aoa.push([]);
  aoa.push(['Total productos', data.summary.totalProducts]);
  aoa.push(['Total unidades', data.summary.totalQuantity]);
  aoa.push(['Total ingresos', data.summary.totalRevenue]);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  setColumnWidths(ws, [16, 40, 8, 10, 32, 16, 10, 12, 16]);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Producto-Vendedor');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

