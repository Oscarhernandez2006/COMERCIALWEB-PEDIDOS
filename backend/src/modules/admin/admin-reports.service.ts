import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { PriceListItem } from '../price-lists/entities/price-list-item.entity';
import { COMPANIES, isValidCompany } from '../../common/companies';
import { bogotaParts, bogotaToday } from '../orders/order-cortes';
import {
  buildInventoryReportPdf,
  InventoryReportData,
  InventoryReportRow,
} from './inventory-report';
import {
  buildProductSalesReportPdf,
  ProductSalesCompany,
  ProductSalesReportData,
  ProductSalesRow,
} from './product-sales-report';
import {
  buildInventoryReportExcel,
  buildProductSalesReportExcel,
  buildSalesSummaryReportExcel,
  buildSellerRankingReportExcel,
  buildSellerProductReportExcel,
  buildProductSellerReportExcel,
} from './report-excel';
import {
  buildSalesSummaryReportPdf,
  SalesSummaryReportData,
  SalesSummaryRow,
} from './sales-summary-report';
import {
  buildSellerRankingReportPdf,
  SellerRankingReportData,
  SellerRankingRow,
} from './seller-ranking-report';
import {
  buildSellerProductReportPdf,
  SellerProductReportData,
  SellerProductRow,
  SellerOption,
  ProductOption,
} from './seller-product-report';
import {
  buildProductSellerReportPdf,
  ProductSellerReportData,
  ProductSellerRow,
} from './product-seller-report';

/** Estados que representan una venta real (descuentan inventario). */
const SALE_STATUSES = [
  OrderStatus.CONFIRMED,
  OrderStatus.SYNCING,
  OrderStatus.SYNCED,
  OrderStatus.FAILED,
];

@Injectable()
export class AdminReportsService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(PriceListItem)
    private readonly priceListItemsRepository: Repository<PriceListItem>,
  ) {}

  /**
   * Construye un mapa `referencia -> unidad de medida` a partir de las listas
   * de precios de la compañía. Sirve para mostrar la UM en los reportes cuando
   * el inventario se cargó por Excel (que no trae la unidad de medida).
   */
  private async getUnitOfMeasureBySku(
    companyId: string,
  ): Promise<Map<string, string>> {
    const items = await this.priceListItemsRepository.find({
      where: { companyId },
      select: { reference: true, unitOfMeasure: true },
    });
    const map = new Map<string, string>();
    for (const item of items) {
      const um = item.unitOfMeasure?.trim();
      if (!um) continue;
      const key = item.reference.trim();
      if (!map.has(key)) map.set(key, um);
    }
    return map;
  }

  /**
   * Construye el resumen de inventario de un día para una compañía: por cada
   * producto, lo vendido en el día (cantidades de pedidos de venta de esa
   * fecha) y el stock que queda. Indica además cuántas referencias tienen y no
   * tienen existencias.
   */
  async getInventoryReport(
    companyId: string,
    date?: string,
  ): Promise<InventoryReportData> {
    if (!isValidCompany(companyId)) {
      throw new BadRequestException('Compañía inválida.');
    }
    const targetDate = date?.trim() || bogotaToday();

    const [products, orders] = await Promise.all([
      this.productsRepository.find({
        where: { companyId },
        order: { name: 'ASC' },
      }),
      this.ordersRepository.find({
        where: { companyId, status: In(SALE_STATUSES) },
      }),
    ]);

    // Unidad de medida por referencia (desde las listas de precios), para los
    // productos cuyo inventario se cargó sin la UM.
    const umBySku = await this.getUnitOfMeasureBySku(companyId);

    // Unidades vendidas por SKU en el día objetivo (hora de Colombia).
    const soldBySku = new Map<string, number>();
    for (const order of orders) {
      const { date: orderDate } = bogotaParts(order.createdAt);
      if (orderDate !== targetDate) continue;
      for (const item of order.items ?? []) {
        const sku = item.sku;
        soldBySku.set(
          sku,
          (soldBySku.get(sku) ?? 0) + Number(item.quantity),
        );
      }
    }

    const rows: InventoryReportRow[] = products.map((p) => ({
      sku: p.sku,
      name: p.name,
      unitOfMeasure: p.unitOfMeasure ?? umBySku.get(p.sku.trim()),
      sold: soldBySku.get(p.sku) ?? 0,
      stock: Number(p.stock),
    }));

    const summary = {
      totalRefs: rows.length,
      refsWithStock: rows.filter((r) => r.stock > 0).length,
      refsWithoutStock: rows.filter((r) => r.stock <= 0).length,
      totalSold: rows.reduce((acc, r) => acc + r.sold, 0),
      totalStock: rows.reduce((acc, r) => acc + r.stock, 0),
    };

    return { companyId, date: targetDate, rows, summary };
  }

  /** Genera el PDF del resumen de inventario por día. */
  async getInventoryReportPdf(
    companyId: string,
    date?: string,
  ): Promise<{ buffer: Buffer; date: string }> {
    const data = await this.getInventoryReport(companyId, date);
    const buffer = await buildInventoryReportPdf(data);
    return { buffer, date: data.date };
  }

  /** Genera el Excel del resumen de inventario por día. */
  async getInventoryReportExcel(
    companyId: string,
    date?: string,
  ): Promise<{ buffer: Buffer; date: string }> {
    const data = await this.getInventoryReport(companyId, date);
    const buffer = buildInventoryReportExcel(data);
    return { buffer, date: data.date };
  }

  /**
   * Construye el reporte de productos vendidos dividido por compañía: por cada
   * compañía lista los productos vendidos en el rango de fechas (hora de
   * Colombia) con la cantidad vendida y los ingresos (precio x cantidad).
   * Si se indica `companyId`, el reporte incluye únicamente esa compañía.
   */
  async getProductSalesReport(
    from?: string,
    to?: string,
    companyId?: string,
  ): Promise<ProductSalesReportData> {
    const today = bogotaToday();
    const fromDate = from?.trim() || today;
    const toDate = to?.trim() || today;
    if (fromDate > toDate) {
      throw new BadRequestException(
        'La fecha inicial no puede ser mayor que la final.',
      );
    }

    const targetCompanyId = companyId?.trim();
    if (targetCompanyId && !isValidCompany(targetCompanyId)) {
      throw new BadRequestException('Compañía inválida.');
    }
    const selectedCompanies = targetCompanyId
      ? COMPANIES.filter((c) => c.id === targetCompanyId)
      : COMPANIES;

    const orders = await this.ordersRepository.find({
      where: { status: In(SALE_STATUSES) },
    });

    const companies: ProductSalesCompany[] = selectedCompanies.map((company) => {
      // Acumula cantidad e ingresos por SKU dentro del rango de fechas.
      const bySku = new Map<string, ProductSalesRow>();
      for (const order of orders) {
        if (order.companyId !== company.id) continue;
        const { date: orderDate } = bogotaParts(order.createdAt);
        if (orderDate < fromDate || orderDate > toDate) continue;
        for (const item of order.items ?? []) {
          const row = bySku.get(item.sku) ?? {
            sku: item.sku,
            name: item.productName,
            unitOfMeasure: item.unitOfMeasure,
            quantity: 0,
            revenue: 0,
          };
          row.quantity += Number(item.quantity);
          row.revenue += Number(item.lineTotal);
          bySku.set(item.sku, row);
        }
      }

      // Ordena del producto más vendido (mayor cantidad) al menos vendido.
      // Ante empate en cantidad, prioriza los de mayores ingresos y luego el nombre.
      const rows = [...bySku.values()].sort(
        (a, b) =>
          b.quantity - a.quantity ||
          b.revenue - a.revenue ||
          a.name.localeCompare(b.name, 'es'),
      );

      return {
        companyId: company.id,
        companyName: company.name,
        rows,
        summary: {
          totalProducts: rows.length,
          totalQuantity: rows.reduce((acc, r) => acc + r.quantity, 0),
          totalRevenue: rows.reduce((acc, r) => acc + r.revenue, 0),
        },
      };
    });

    return { from: fromDate, to: toDate, companies };
  }

  /** Genera el PDF de productos vendidos dividido por compañía. */
  async getProductSalesReportPdf(
    from?: string,
    to?: string,
    companyId?: string,
  ): Promise<{ buffer: Buffer; from: string; to: string }> {
    const data = await this.getProductSalesReport(from, to, companyId);
    const buffer = await buildProductSalesReportPdf(data);
    return { buffer, from: data.from, to: data.to };
  }

  /** Genera el Excel de productos vendidos dividido por compañía. */
  async getProductSalesReportExcel(
    from?: string,
    to?: string,
    companyId?: string,
  ): Promise<{ buffer: Buffer; from: string; to: string }> {
    const data = await this.getProductSalesReport(from, to, companyId);
    const buffer = buildProductSalesReportExcel(data);
    return { buffer, from: data.from, to: data.to };
  }

  /**
   * Construye el resumen de ventas de una compañía agrupado por cliente o por
   * producto en un rango de fechas (hora de Colombia). Por cliente muestra el
   * número de pedidos, las unidades y los ingresos; por producto, la cantidad y
   * los ingresos. Las filas se ordenan de mayor a menor por ingresos.
   */
  async getSalesSummaryReport(
    companyId: string,
    groupBy: 'customer' | 'product',
    from?: string,
    to?: string,
  ): Promise<SalesSummaryReportData> {
    if (!isValidCompany(companyId)) {
      throw new BadRequestException('Compañía inválida.');
    }
    const group = groupBy === 'customer' ? 'customer' : 'product';
    const today = bogotaToday();
    const fromDate = from?.trim() || today;
    const toDate = to?.trim() || today;
    if (fromDate > toDate) {
      throw new BadRequestException(
        'La fecha inicial no puede ser mayor que la final.',
      );
    }

    const company = COMPANIES.find((c) => c.id === companyId)!;

    const orders = await this.ordersRepository.find({
      where: { companyId, status: In(SALE_STATUSES) },
    });

    // Agrupa las ventas del rango por cliente o por producto.
    const map = new Map<string, SalesSummaryRow>();
    let totalOrders = 0;
    let totalUnits = 0;
    let totalRevenue = 0;

    for (const order of orders) {
      const { date: orderDate } = bogotaParts(order.createdAt);
      if (orderDate < fromDate || orderDate > toDate) continue;

      const units = (order.items ?? []).reduce(
        (acc, it) => acc + Number(it.quantity),
        0,
      );
      totalOrders += 1;
      totalUnits += units;

      if (group === 'customer') {
        const code = order.customer?.code ?? 'SIN-CODIGO';
        const name = order.customer?.name ?? 'Sin cliente';
        const row =
          map.get(code) ??
          ({
            reference: code,
            name,
            orders: 0,
            units: 0,
            revenue: 0,
          } as SalesSummaryRow);
        row.orders = (row.orders ?? 0) + 1;
        row.units += units;
        row.revenue += Number(order.total);
        map.set(code, row);
        totalRevenue += Number(order.total);
      } else {
        for (const item of order.items ?? []) {
          const row =
            map.get(item.sku) ??
            ({
              reference: item.sku,
              name: item.productName,
              unitOfMeasure: item.unitOfMeasure,
              units: 0,
              revenue: 0,
            } as SalesSummaryRow);
          row.units += Number(item.quantity);
          row.revenue += Number(item.lineTotal);
          map.set(item.sku, row);
          totalRevenue += Number(item.lineTotal);
        }
      }
    }

    const rows: SalesSummaryRow[] = [...map.values()].sort(
      (a, b) =>
        b.revenue - a.revenue ||
        b.units - a.units ||
        a.name.localeCompare(b.name, 'es'),
    );

    return {
      from: fromDate,
      to: toDate,
      companyId,
      companyName: company.name,
      groupBy: group,
      rows,
      summary: {
        totalRows: rows.length,
        totalOrders,
        totalUnits,
        totalRevenue,
      },
    };
  }

  /** Genera el PDF del resumen de ventas por cliente o por producto. */
  async getSalesSummaryReportPdf(
    companyId: string,
    groupBy: 'customer' | 'product',
    from?: string,
    to?: string,
  ): Promise<{ buffer: Buffer; from: string; to: string }> {
    const data = await this.getSalesSummaryReport(companyId, groupBy, from, to);
    const buffer = await buildSalesSummaryReportPdf(data);
    return { buffer, from: data.from, to: data.to };
  }

  /** Genera el Excel del resumen de ventas por cliente o por producto. */
  async getSalesSummaryReportExcel(
    companyId: string,
    groupBy: 'customer' | 'product',
    from?: string,
    to?: string,
  ): Promise<{ buffer: Buffer; from: string; to: string }> {
    const data = await this.getSalesSummaryReport(companyId, groupBy, from, to);
    const buffer = buildSalesSummaryReportExcel(data);
    return { buffer, from: data.from, to: data.to };
  }

  /**
   * Construye el ranking de vendedores de una compañía en un rango de fechas
   * (hora de Colombia): por cada vendedor que registró pedidos de venta, el
   * número de pedidos, las unidades y los ingresos. Se ordena del que más
   * vende al que menos (por ingresos).
   */
  async getSellerRankingReport(
    companyId: string,
    from?: string,
    to?: string,
  ): Promise<SellerRankingReportData> {
    if (!isValidCompany(companyId)) {
      throw new BadRequestException('Compañía inválida.');
    }
    const today = bogotaToday();
    const fromDate = from?.trim() || today;
    const toDate = to?.trim() || today;
    if (fromDate > toDate) {
      throw new BadRequestException(
        'La fecha inicial no puede ser mayor que la final.',
      );
    }

    const company = COMPANIES.find((c) => c.id === companyId)!;

    const orders = await this.ordersRepository.find({
      where: { companyId, status: In(SALE_STATUSES) },
    });

    // Agrupa las ventas del rango por vendedor.
    type Acc = Omit<SellerRankingRow, 'position'>;
    const map = new Map<string, Acc>();
    let totalOrders = 0;
    let totalUnits = 0;
    let totalRevenue = 0;

    for (const order of orders) {
      const { date: orderDate } = bogotaParts(order.createdAt);
      if (orderDate < fromDate || orderDate > toDate) continue;

      const seller = order.seller;
      const key = seller?.id ?? 'sin-vendedor';
      const units = (order.items ?? []).reduce(
        (acc, it) => acc + Number(it.quantity),
        0,
      );
      const revenue = Number(order.total);

      const row =
        map.get(key) ??
        ({
          name: seller?.name ?? 'Sin vendedor',
          documentId: seller?.documentId,
          sellerCode: seller?.siesaSellerCode,
          orders: 0,
          units: 0,
          revenue: 0,
        } as Acc);
      row.orders += 1;
      row.units += units;
      row.revenue += revenue;
      map.set(key, row);

      totalOrders += 1;
      totalUnits += units;
      totalRevenue += revenue;
    }

    const rows: SellerRankingRow[] = [...map.values()]
      .sort(
        (a, b) =>
          b.revenue - a.revenue ||
          b.units - a.units ||
          a.name.localeCompare(b.name, 'es'),
      )
      .map((r, i) => ({ position: i + 1, ...r }));

    return {
      from: fromDate,
      to: toDate,
      companyId,
      companyName: company.name,
      rows,
      summary: {
        totalSellers: rows.length,
        totalOrders,
        totalUnits,
        totalRevenue,
      },
    };
  }

  /** Genera el PDF del ranking de vendedores. */
  async getSellerRankingReportPdf(
    companyId: string,
    from?: string,
    to?: string,
  ): Promise<{ buffer: Buffer; from: string; to: string }> {
    const data = await this.getSellerRankingReport(companyId, from, to);
    const buffer = await buildSellerRankingReportPdf(data);
    return { buffer, from: data.from, to: data.to };
  }

  /** Genera el Excel del ranking de vendedores. */
  async getSellerRankingReportExcel(
    companyId: string,
    from?: string,
    to?: string,
  ): Promise<{ buffer: Buffer; from: string; to: string }> {
    const data = await this.getSellerRankingReport(companyId, from, to);
    const buffer = buildSellerRankingReportExcel(data);
    return { buffer, from: data.from, to: data.to };
  }

  /**
   * Construye el reporte vendedor–producto de una compañía en un rango de
   * fechas (hora de Colombia): por cada combinación de vendedor y producto, las
   * unidades vendidas y los ingresos. Permite filtrar por un vendedor concreto
   * (`sellerId`) y/o por una búsqueda de producto (`search`, por referencia o
   * nombre). Las filas se ordenan por vendedor y, dentro de cada uno, de mayor
   * a menor por ingresos.
   */
  async getSellerProductReport(
    companyId: string,
    from?: string,
    to?: string,
    sellerId?: string,
    sku?: string,
  ): Promise<SellerProductReportData> {
    if (!isValidCompany(companyId)) {
      throw new BadRequestException('Compañía inválida.');
    }
    const today = bogotaToday();
    const fromDate = from?.trim() || today;
    const toDate = to?.trim() || today;
    if (fromDate > toDate) {
      throw new BadRequestException(
        'La fecha inicial no puede ser mayor que la final.',
      );
    }
    const sellerFilter = sellerId?.trim() || '';
    const skuFilter = sku?.trim() || '';

    const company = COMPANIES.find((c) => c.id === companyId)!;

    const orders = await this.ordersRepository.find({
      where: { companyId, status: In(SALE_STATUSES) },
    });

    // Vendedores y productos con ventas en el rango (para los selectores).
    const sellersMap = new Map<string, string>();
    const productsMap = new Map<string, string>();
    // Acumula por (vendedor + referencia).
    const map = new Map<string, SellerProductRow>();
    let totalQuantity = 0;
    let totalRevenue = 0;
    let sellerName = '';
    let productName = '';

    for (const order of orders) {
      const { date: orderDate } = bogotaParts(order.createdAt);
      if (orderDate < fromDate || orderDate > toDate) continue;

      const seller = order.seller;
      const sid = seller?.id ?? 'sin-vendedor';
      const sname = seller?.name ?? 'Sin vendedor';
      sellersMap.set(sid, sname);

      // Filtro por vendedor concreto.
      if (sellerFilter && sid !== sellerFilter) continue;
      if (sellerFilter) sellerName = sname;

      for (const item of order.items ?? []) {
        // Opciones de producto del selector: todos los del vendedor/rango,
        // sin aplicar todavía el filtro de producto seleccionado.
        productsMap.set(item.sku, item.productName);

        // Filtro por producto (referencia exacta del selector).
        if (skuFilter && item.sku !== skuFilter) continue;
        if (skuFilter) productName = item.productName;

        const key = `${sid}__${item.sku}`;
        const row =
          map.get(key) ??
          ({
            sellerId: sid,
            sellerName: sname,
            documentId: seller?.documentId,
            sellerCode: seller?.siesaSellerCode,
            sku: item.sku,
            productName: item.productName,
            unitOfMeasure: item.unitOfMeasure,
            quantity: 0,
            revenue: 0,
          } as SellerProductRow);
        row.quantity += Number(item.quantity);
        row.revenue += Number(item.lineTotal);
        map.set(key, row);

        totalQuantity += Number(item.quantity);
        totalRevenue += Number(item.lineTotal);
      }
    }

    const rows: SellerProductRow[] = [...map.values()].sort(
      (a, b) =>
        a.sellerName.localeCompare(b.sellerName, 'es') ||
        b.revenue - a.revenue ||
        b.quantity - a.quantity ||
        a.productName.localeCompare(b.productName, 'es'),
    );

    const sellers: SellerOption[] = [...sellersMap.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    const products: ProductOption[] = [...productsMap.entries()]
      .map(([s, name]) => ({ sku: s, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    return {
      from: fromDate,
      to: toDate,
      companyId,
      companyName: company.name,
      sellerName: sellerFilter ? sellerName : undefined,
      search: skuFilter || undefined,
      productName: skuFilter ? productName : undefined,
      sellers,
      products,
      rows,
      summary: {
        totalRows: rows.length,
        totalQuantity,
        totalRevenue,
      },
    };
  }

  /** Genera el PDF del reporte vendedor–producto. */
  async getSellerProductReportPdf(
    companyId: string,
    from?: string,
    to?: string,
    sellerId?: string,
    sku?: string,
  ): Promise<{ buffer: Buffer; from: string; to: string }> {
    const data = await this.getSellerProductReport(
      companyId,
      from,
      to,
      sellerId,
      sku,
    );
    const buffer = await buildSellerProductReportPdf(data);
    return { buffer, from: data.from, to: data.to };
  }

  /** Genera el Excel del reporte vendedor–producto. */
  async getSellerProductReportExcel(
    companyId: string,
    from?: string,
    to?: string,
    sellerId?: string,
    sku?: string,
  ): Promise<{ buffer: Buffer; from: string; to: string }> {
    const data = await this.getSellerProductReport(
      companyId,
      from,
      to,
      sellerId,
      sku,
    );
    const buffer = buildSellerProductReportExcel(data);
    return { buffer, from: data.from, to: data.to };
  }

  /**
   * Reporte "mejor vendedor por producto": por cada producto, el ranking de
   * vendedores ordenado por unidades vendidas (el #1 es quien más vendió).
   */
  async getProductSellerReport(
    companyId: string,
    from?: string,
    to?: string,
    sku?: string,
  ): Promise<ProductSellerReportData> {
    if (!isValidCompany(companyId)) {
      throw new BadRequestException('Compañía inválida.');
    }
    const today = bogotaToday();
    const fromDate = from?.trim() || today;
    const toDate = to?.trim() || today;
    if (fromDate > toDate) {
      throw new BadRequestException(
        'La fecha inicial no puede ser mayor que la final.',
      );
    }
    const skuFilter = sku?.trim() || '';

    const company = COMPANIES.find((c) => c.id === companyId)!;

    const orders = await this.ordersRepository.find({
      where: { companyId, status: In(SALE_STATUSES) },
    });

    // Productos con ventas en el rango (para el selector del front).
    const productsMap = new Map<string, string>();
    // Acumula por (referencia + vendedor).
    const map = new Map<
      string,
      Omit<ProductSellerRow, 'position' | 'isTop'>
    >();
    let totalQuantity = 0;
    let totalRevenue = 0;
    let productName = '';

    for (const order of orders) {
      const { date: orderDate } = bogotaParts(order.createdAt);
      if (orderDate < fromDate || orderDate > toDate) continue;

      const seller = order.seller;
      const sid = seller?.id ?? 'sin-vendedor';
      const sname = seller?.name ?? 'Sin vendedor';

      for (const item of order.items ?? []) {
        productsMap.set(item.sku, item.productName);

        // Filtro por producto (referencia exacta del selector).
        if (skuFilter && item.sku !== skuFilter) continue;
        if (skuFilter) productName = item.productName;

        const key = `${item.sku}__${sid}`;
        const row =
          map.get(key) ??
          ({
            sku: item.sku,
            productName: item.productName,
            unitOfMeasure: item.unitOfMeasure,
            sellerId: sid,
            sellerName: sname,
            documentId: seller?.documentId,
            sellerCode: seller?.siesaSellerCode,
            quantity: 0,
            revenue: 0,
          } as Omit<ProductSellerRow, 'position' | 'isTop'>);
        row.quantity += Number(item.quantity);
        row.revenue += Number(item.lineTotal);
        map.set(key, row);

        totalQuantity += Number(item.quantity);
        totalRevenue += Number(item.lineTotal);
      }
    }

    // Agrupa por producto para calcular posiciones dentro de cada uno.
    const byProduct = new Map<
      string,
      { name: string; items: Omit<ProductSellerRow, 'position' | 'isTop'>[] }
    >();
    for (const row of map.values()) {
      const group = byProduct.get(row.sku) ?? {
        name: row.productName,
        items: [],
      };
      group.items.push(row);
      byProduct.set(row.sku, group);
    }

    // Ordena los productos por nombre y, dentro, los vendedores por unidades.
    const sortedProducts = [...byProduct.entries()].sort((a, b) =>
      a[1].name.localeCompare(b[1].name, 'es'),
    );

    const rows: ProductSellerRow[] = [];
    for (const [, group] of sortedProducts) {
      const ranked = group.items.sort(
        (a, b) =>
          b.quantity - a.quantity ||
          b.revenue - a.revenue ||
          a.sellerName.localeCompare(b.sellerName, 'es'),
      );
      ranked.forEach((r, idx) => {
        rows.push({ ...r, position: idx + 1, isTop: idx === 0 });
      });
    }

    const products: ProductOption[] = [...productsMap.entries()]
      .map(([s, name]) => ({ sku: s, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));

    return {
      from: fromDate,
      to: toDate,
      companyId,
      companyName: company.name,
      search: skuFilter || undefined,
      productName: skuFilter ? productName : undefined,
      products,
      rows,
      summary: {
        totalProducts: byProduct.size,
        totalQuantity,
        totalRevenue,
      },
    };
  }

  /** Genera el PDF del reporte mejor-vendedor-por-producto. */
  async getProductSellerReportPdf(
    companyId: string,
    from?: string,
    to?: string,
    sku?: string,
  ): Promise<{ buffer: Buffer; from: string; to: string }> {
    const data = await this.getProductSellerReport(companyId, from, to, sku);
    const buffer = await buildProductSellerReportPdf(data);
    return { buffer, from: data.from, to: data.to };
  }

  /** Genera el Excel del reporte mejor-vendedor-por-producto. */
  async getProductSellerReportExcel(
    companyId: string,
    from?: string,
    to?: string,
    sku?: string,
  ): Promise<{ buffer: Buffer; from: string; to: string }> {
    const data = await this.getProductSellerReport(companyId, from, to, sku);
    const buffer = buildProductSellerReportExcel(data);
    return { buffer, from: data.from, to: data.to };
  }
}
