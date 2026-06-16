import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity';
import { COMPANIES } from '../../common/companies';

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
}
