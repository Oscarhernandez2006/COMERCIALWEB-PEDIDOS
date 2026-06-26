import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Product } from '../products/entities/product.entity';
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
  ) {}

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
      unitOfMeasure: p.unitOfMeasure,
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

  /**
   * Construye el reporte de productos vendidos dividido por compañía: por cada
   * compañía lista los productos vendidos en el rango de fechas (hora de
   * Colombia) con la cantidad vendida y los ingresos (precio x cantidad).
   */
  async getProductSalesReport(
    from?: string,
    to?: string,
  ): Promise<ProductSalesReportData> {
    const today = bogotaToday();
    const fromDate = from?.trim() || today;
    const toDate = to?.trim() || today;
    if (fromDate > toDate) {
      throw new BadRequestException(
        'La fecha inicial no puede ser mayor que la final.',
      );
    }

    const orders = await this.ordersRepository.find({
      where: { status: In(SALE_STATUSES) },
    });

    const companies: ProductSalesCompany[] = COMPANIES.map((company) => {
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

      const rows = [...bySku.values()].sort((a, b) =>
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
  ): Promise<{ buffer: Buffer; from: string; to: string }> {
    const data = await this.getProductSalesReport(from, to);
    const buffer = await buildProductSalesReportPdf(data);
    return { buffer, from: data.from, to: data.to };
  }
}
