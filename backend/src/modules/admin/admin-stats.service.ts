import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity';
import { COMPANIES } from '../../common/companies';
import { bogotaToday } from '../orders/order-cortes';

/** Estados que representan una venta real (excluye borradores y cancelados). */
const SALE_STATUSES = [
  OrderStatus.CONFIRMED,
  OrderStatus.SYNCING,
  OrderStatus.SYNCED,
  OrderStatus.FAILED,
];

export interface AdminDashboardStats {
  totals: {
    revenue: number;
    orders: number;
    customers: number;
    products: number;
    pendingOrders: number;
    avgTicket: number;
  };
  ordersByStatus: { status: string; count: number }[];
  byCompany: {
    companyId: string;
    name: string;
    revenue: number;
    orders: number;
    customers: number;
    products: number;
  }[];
  salesTrend: { date: string; revenue: number; orders: number }[];
  topProducts: { name: string; quantity: number; revenue: number }[];
  topCustomers: { name: string; orders: number; revenue: number }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    customerName: string;
    companyId: string;
    total: number;
    status: string;
    createdAt: Date;
  }[];
}

/** Métricas de una compañía dentro del dashboard gerencial (rango de fechas). */
export interface ManagerialCompanyStats {
  companyId: string;
  name: string;
  totals: {
    revenue: number;
    orders: number;
    units: number;
    avgTicket: number;
    customers: number;
  };
  salesTrend: { date: string; revenue: number; orders: number }[];
  ordersByStatus: { status: string; count: number }[];
  topProducts: {
    sku: string;
    name: string;
    quantity: number;
    revenue: number;
  }[];
  topCustomers: {
    name: string;
    code: string;
    orders: number;
    revenue: number;
  }[];
}

/** Dashboard gerencial: las mismas métricas divididas por compañía y por rango. */
export interface ManagerialDashboardStats {
  from: string;
  to: string;
  companies: ManagerialCompanyStats[];
}

@Injectable()
export class AdminStatsService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Customer)
    private readonly customersRepository: Repository<Customer>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  /** KPIs y series del panel de administración (agregando ambas compañías). */
  async getDashboard(): Promise<AdminDashboardStats> {
    const [
      totals,
      ordersByStatus,
      byCompany,
      salesTrend,
      topProducts,
      topCustomers,
      recentOrders,
    ] = await Promise.all([
      this.getTotals(),
      this.getOrdersByStatus(),
      this.getByCompany(),
      this.getSalesTrend(),
      this.getTopProducts(),
      this.getTopCustomers(),
      this.getRecentOrders(),
    ]);

    return {
      totals,
      ordersByStatus,
      byCompany,
      salesTrend,
      topProducts,
      topCustomers,
      recentOrders,
    };
  }

  private async getTotals(): Promise<AdminDashboardStats['totals']> {
    const sale = await this.ordersRepository
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.total), 0)', 'revenue')
      .addSelect('COUNT(*)', 'orders')
      .where('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .getRawOne<{ revenue: string; orders: string }>();

    const pending = await this.ordersRepository.count({
      where: [
        { status: OrderStatus.DRAFT },
        { status: OrderStatus.CONFIRMED },
      ],
    });

    const customers = await this.customersRepository.count();
    const products = await this.productsRepository.count();

    const revenue = Number(sale?.revenue ?? 0);
    const orders = Number(sale?.orders ?? 0);

    return {
      revenue,
      orders,
      customers,
      products,
      pendingOrders: pending,
      avgTicket: orders > 0 ? Number((revenue / orders).toFixed(2)) : 0,
    };
  }

  private async getOrdersByStatus(): Promise<
    AdminDashboardStats['ordersByStatus']
  > {
    const rows = await this.ordersRepository
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('o.status')
      .getRawMany<{ status: string; count: string }>();

    return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
  }

  private async getByCompany(): Promise<AdminDashboardStats['byCompany']> {
    const result: AdminDashboardStats['byCompany'] = [];

    for (const company of COMPANIES) {
      const sale = await this.ordersRepository
        .createQueryBuilder('o')
        .select('COALESCE(SUM(o.total), 0)', 'revenue')
        .addSelect('COUNT(*)', 'orders')
        .where('o.companyId = :companyId', { companyId: company.id })
        .andWhere('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
        .getRawOne<{ revenue: string; orders: string }>();

      const customers = await this.customersRepository.count({
        where: { companyId: company.id },
      });
      const products = await this.productsRepository.count({
        where: { companyId: company.id },
      });

      result.push({
        companyId: company.id,
        name: company.name,
        revenue: Number(sale?.revenue ?? 0),
        orders: Number(sale?.orders ?? 0),
        customers,
        products,
      });
    }

    return result;
  }

  private async getSalesTrend(): Promise<AdminDashboardStats['salesTrend']> {
    const rows = await this.ordersRepository
      .createQueryBuilder('o')
      .select("TO_CHAR(o.created_at, 'YYYY-MM-DD')", 'date')
      .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
      .addSelect('COUNT(*)', 'orders')
      .where('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .andWhere("o.created_at >= NOW() - INTERVAL '13 days'")
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; revenue: string; orders: string }>();

    const map = new Map(
      rows.map((r) => [
        r.date,
        { revenue: Number(r.revenue), orders: Number(r.orders) },
      ]),
    );

    // Rellenamos los 14 días para una serie continua, aunque haya días sin ventas.
    const trend: AdminDashboardStats['salesTrend'] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const found = map.get(key);
      trend.push({
        date: key,
        revenue: found?.revenue ?? 0,
        orders: found?.orders ?? 0,
      });
    }
    return trend;
  }

  private async getTopProducts(): Promise<AdminDashboardStats['topProducts']> {
    const rows = await this.orderItemsRepository
      .createQueryBuilder('it')
      .innerJoin('it.order', 'o')
      .select('it.product_name', 'name')
      .addSelect('COALESCE(SUM(it.quantity), 0)', 'quantity')
      .addSelect('COALESCE(SUM(it.line_total), 0)', 'revenue')
      .where('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .groupBy('it.product_name')
      .orderBy('revenue', 'DESC')
      .limit(5)
      .getRawMany<{ name: string; quantity: string; revenue: string }>();

    return rows.map((r) => ({
      name: r.name,
      quantity: Number(r.quantity),
      revenue: Number(r.revenue),
    }));
  }

  private async getTopCustomers(): Promise<
    AdminDashboardStats['topCustomers']
  > {
    const rows = await this.ordersRepository
      .createQueryBuilder('o')
      .innerJoin('o.customer', 'c')
      .select('c.name', 'name')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
      .where('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .groupBy('c.name')
      .orderBy('revenue', 'DESC')
      .limit(5)
      .getRawMany<{ name: string; orders: string; revenue: string }>();

    return rows.map((r) => ({
      name: r.name,
      orders: Number(r.orders),
      revenue: Number(r.revenue),
    }));
  }

  private async getRecentOrders(): Promise<
    AdminDashboardStats['recentOrders']
  > {
    const orders = await this.ordersRepository.find({
      order: { createdAt: 'DESC' },
      take: 8,
    });

    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customer?.name ?? 'Sin cliente',
      companyId: o.companyId,
      total: Number(o.total),
      status: o.status,
      createdAt: o.createdAt,
    }));
  }

  /* ------------------------------------------------------------------ */
  /* Dashboard gerencial: mismas métricas divididas por compañía con un  */
  /* rango de fechas (un día o varios) para comparar.                    */
  /* ------------------------------------------------------------------ */

  /** Expresión SQL que pasa created_at a fecha local de Colombia (YYYY-MM-DD). */
  private readonly bogotaDateExpr =
    "TO_CHAR((o.created_at AT TIME ZONE 'America/Bogota'), 'YYYY-MM-DD')";

  /** Predicado SQL que limita los pedidos al rango de fechas (hora de Colombia). */
  private readonly bogotaDateFilter =
    "(o.created_at AT TIME ZONE 'America/Bogota')::date BETWEEN :from::date AND :to::date";

  /**
   * KPIs y series por compañía para el panel gerencial. Acepta un rango de
   * fechas (un día único si `from === to`). Por defecto, los últimos 14 días.
   */
  async getManagerialDashboard(
    from?: string,
    to?: string,
  ): Promise<ManagerialDashboardStats> {
    const today = bogotaToday();
    let toDate = to?.trim() || today;
    let fromDate = from?.trim() || this.shiftDate(toDate, -13);
    if (fromDate > toDate) {
      [fromDate, toDate] = [toDate, fromDate];
    }

    const companies = await Promise.all(
      COMPANIES.map((c) => this.getCompanyStats(c.id, c.name, fromDate, toDate)),
    );

    return { from: fromDate, to: toDate, companies };
  }

  /** Suma/resta días a una fecha YYYY-MM-DD (sin desfase de zona horaria). */
  private shiftDate(date: string, days: number): string {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  private async getCompanyStats(
    companyId: string,
    name: string,
    from: string,
    to: string,
  ): Promise<ManagerialCompanyStats> {
    // Totales de venta (ingresos y pedidos) en el rango.
    const sale = await this.ordersRepository
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.total), 0)', 'revenue')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('COUNT(DISTINCT o.customer_id)', 'customers')
      .where('o.companyId = :companyId', { companyId })
      .andWhere('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .andWhere(this.bogotaDateFilter, { from, to })
      .getRawOne<{ revenue: string; orders: string; customers: string }>();

    // Unidades vendidas (suma de cantidades de los ítems) en el rango.
    const unitsRow = await this.orderItemsRepository
      .createQueryBuilder('it')
      .innerJoin('it.order', 'o')
      .select('COALESCE(SUM(it.quantity), 0)', 'units')
      .where('o.companyId = :companyId', { companyId })
      .andWhere('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .andWhere(this.bogotaDateFilter, { from, to })
      .getRawOne<{ units: string }>();

    const revenue = Number(sale?.revenue ?? 0);
    const orders = Number(sale?.orders ?? 0);

    const [salesTrend, ordersByStatus, topProducts, topCustomers] =
      await Promise.all([
        this.getCompanyTrend(companyId, from, to),
        this.getCompanyStatuses(companyId, from, to),
        this.getCompanyTopProducts(companyId, from, to),
        this.getCompanyTopCustomers(companyId, from, to),
      ]);

    return {
      companyId,
      name,
      totals: {
        revenue,
        orders,
        units: Number(unitsRow?.units ?? 0),
        avgTicket: orders > 0 ? Number((revenue / orders).toFixed(2)) : 0,
        customers: Number(sale?.customers ?? 0),
      },
      salesTrend,
      ordersByStatus,
      topProducts,
      topCustomers,
    };
  }

  private async getCompanyTrend(
    companyId: string,
    from: string,
    to: string,
  ): Promise<ManagerialCompanyStats['salesTrend']> {
    const rows = await this.ordersRepository
      .createQueryBuilder('o')
      .select(this.bogotaDateExpr, 'date')
      .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
      .addSelect('COUNT(*)', 'orders')
      .where('o.companyId = :companyId', { companyId })
      .andWhere('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .andWhere(this.bogotaDateFilter, { from, to })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; revenue: string; orders: string }>();

    const map = new Map(
      rows.map((r) => [
        r.date,
        { revenue: Number(r.revenue), orders: Number(r.orders) },
      ]),
    );

    // Rellena cada día del rango para una serie continua (máx. 92 puntos).
    const trend: ManagerialCompanyStats['salesTrend'] = [];
    let cursor = from;
    let guard = 0;
    while (cursor <= to && guard < 366) {
      const found = map.get(cursor);
      trend.push({
        date: cursor,
        revenue: found?.revenue ?? 0,
        orders: found?.orders ?? 0,
      });
      cursor = this.shiftDate(cursor, 1);
      guard++;
    }
    return trend;
  }

  private async getCompanyStatuses(
    companyId: string,
    from: string,
    to: string,
  ): Promise<ManagerialCompanyStats['ordersByStatus']> {
    const rows = await this.ordersRepository
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('o.companyId = :companyId', { companyId })
      .andWhere(this.bogotaDateFilter, { from, to })
      .groupBy('o.status')
      .getRawMany<{ status: string; count: string }>();

    return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
  }

  private async getCompanyTopProducts(
    companyId: string,
    from: string,
    to: string,
  ): Promise<ManagerialCompanyStats['topProducts']> {
    const rows = await this.orderItemsRepository
      .createQueryBuilder('it')
      .innerJoin('it.order', 'o')
      .select('it.sku', 'sku')
      .addSelect('it.product_name', 'name')
      .addSelect('COALESCE(SUM(it.quantity), 0)', 'quantity')
      .addSelect('COALESCE(SUM(it.line_total), 0)', 'revenue')
      .where('o.companyId = :companyId', { companyId })
      .andWhere('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .andWhere(this.bogotaDateFilter, { from, to })
      .groupBy('it.sku')
      .addGroupBy('it.product_name')
      .orderBy('quantity', 'DESC')
      .limit(10)
      .getRawMany<{
        sku: string;
        name: string;
        quantity: string;
        revenue: string;
      }>();

    return rows.map((r) => ({
      sku: r.sku,
      name: r.name,
      quantity: Number(r.quantity),
      revenue: Number(r.revenue),
    }));
  }

  private async getCompanyTopCustomers(
    companyId: string,
    from: string,
    to: string,
  ): Promise<ManagerialCompanyStats['topCustomers']> {
    const rows = await this.ordersRepository
      .createQueryBuilder('o')
      .innerJoin('o.customer', 'c')
      .select('c.name', 'name')
      .addSelect('c.code', 'code')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
      .where('o.companyId = :companyId', { companyId })
      .andWhere('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .andWhere(this.bogotaDateFilter, { from, to })
      .groupBy('c.name')
      .addGroupBy('c.code')
      .orderBy('revenue', 'DESC')
      .limit(10)
      .getRawMany<{
        name: string;
        code: string;
        orders: string;
        revenue: string;
      }>();

    return rows.map((r) => ({
      name: r.name,
      code: r.code,
      orders: Number(r.orders),
      revenue: Number(r.revenue),
    }));
  }
}
