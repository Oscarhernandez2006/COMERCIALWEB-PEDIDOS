import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { ClientRecord } from '../clients/entities/client-record.entity';
import { UserCompany } from '../users/entities/user-company.entity';
import { User } from '../users/entities/user.entity';
import { bogotaToday } from '../orders/order-cortes';
import { BudgetsService } from '../budgets/budgets.service';

/** Estados que representan una venta real (excluye borradores y cancelados). */
const SALE_STATUSES = [
  OrderStatus.CONFIRMED,
  OrderStatus.SYNCING,
  OrderStatus.SYNCED,
  OrderStatus.FAILED,
];

/** Tablero de gestión comercial de un vendedor para un mes concreto. */
export interface SellerCommercialDashboard {
  period: { month: number; year: number; label: string };
  generatedAt: string;
  seller: { id: string; name: string };
  totals: {
    /** Ventas acumuladas del mes (pesos, con IVA). */
    revenue: number;
    /** Tickets facturados (número de pedidos). */
    orders: number;
    /** Clientes atendidos (distintos con pedido en el mes). */
    customersServed: number;
    /** Clientes activos asignados al vendedor (cartera). */
    activeCustomers: number;
    /** Ticket promedio (pesos). */
    avgTicket: number;
    /** Kilos vendidos en el mes (suma de cantidades de ítems en KG). */
    kilosSold: number;
  };
  growth: {
    /** Crecimiento de ventas vs. el mes anterior (porcentaje) o null. */
    revenuePct: number | null;
    /** Crecimiento de kilos vendidos vs. el mes anterior (porcentaje) o null. */
    kilosPct: number | null;
  };
  salesTrend: { date: string; revenue: number; orders: number }[];
  topCustomers: {
    name: string;
    code: string;
    city: string | null;
    revenue: number;
    lastPurchase: string | null;
  }[];
  /** Ventas por corte (producto) del mes. */
  salesByCut: {
    name: string;
    quantity: number;
    revenue: number;
  }[];
  /** Presupuesto (meta) del vendedor para el mes, si está cargado. */
  budget: { expectedRevenue: number; targetKilos: number } | null;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(ClientRecord)
    private readonly clientsRepository: Repository<ClientRecord>,
    @InjectRepository(UserCompany)
    private readonly userCompaniesRepository: Repository<UserCompany>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly budgetsService: BudgetsService,
  ) {}

  /** Pasa created_at a fecha local de Colombia y la limita a un rango. */
  private readonly bogotaDateFilter =
    "(o.created_at AT TIME ZONE 'America/Bogota')::date BETWEEN :from::date AND :to::date";

  /** Expresión SQL que pasa created_at a fecha local de Colombia (YYYY-MM-DD). */
  private readonly bogotaDateExpr =
    "TO_CHAR((o.created_at AT TIME ZONE 'America/Bogota'), 'YYYY-MM-DD')";

  /** Devuelve el primer y último día (YYYY-MM-DD) de un mes. */
  private monthRange(month: number, year: number): { from: string; to: string } {
    const mm = String(month).padStart(2, '0');
    const from = `${year}-${mm}-01`;
    const last = new Date(year, month, 0).getDate();
    const to = `${year}-${mm}-${String(last).padStart(2, '0')}`;
    return { from, to };
  }

  private shiftDate(date: string, days: number): string {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  async getSellerDashboard(
    companyId: string,
    sellerId: string,
    month: number,
    year: number,
  ): Promise<SellerCommercialDashboard> {
    const { from, to } = this.monthRange(month, year);
    const prev = this.monthRange(
      month === 1 ? 12 : month - 1,
      month === 1 ? year - 1 : year,
    );

    const [seller, totalsRow, prevRevenue, activeCustomers, salesTrend, topCustomers, salesByCut, budget, kilosSold, prevKilos] =
      await Promise.all([
        this.usersRepository.findOne({ where: { id: sellerId } }),
        this.getTotals(companyId, sellerId, from, to),
        this.getRevenue(companyId, sellerId, prev.from, prev.to),
        this.getActiveCustomers(companyId, sellerId),
        this.getTrend(companyId, sellerId, from, to),
        this.getTopCustomers(companyId, sellerId, from, to),
        this.getSalesByCut(companyId, sellerId, from, to),
        this.budgetsService.getSellerBudget(companyId, sellerId, month, year),
        this.getKilosSold(companyId, sellerId, from, to),
        this.getKilosSold(companyId, sellerId, prev.from, prev.to),
      ]);

    const revenue = totalsRow.revenue;
    const orders = totalsRow.orders;
    const revenuePct =
      prevRevenue > 0
        ? Number((((revenue - prevRevenue) / prevRevenue) * 100).toFixed(1))
        : null;
    const kilosPct =
      prevKilos > 0
        ? Number((((kilosSold - prevKilos) / prevKilos) * 100).toFixed(1))
        : null;

    const label = new Date(year, month - 1, 1).toLocaleDateString('es-CO', {
      month: 'long',
      year: 'numeric',
    });

    return {
      period: { month, year, label },
      generatedAt: new Date().toISOString(),
      seller: { id: sellerId, name: seller?.name ?? 'Vendedor' },
      totals: {
        revenue,
        orders,
        customersServed: totalsRow.customers,
        activeCustomers,
        avgTicket: orders > 0 ? Number((revenue / orders).toFixed(2)) : 0,
        kilosSold,
      },
      growth: { revenuePct, kilosPct },
      salesTrend,
      topCustomers,
      salesByCut,
      budget,
    };
  }

  private async getTotals(
    companyId: string,
    sellerId: string,
    from: string,
    to: string,
  ): Promise<{ revenue: number; orders: number; customers: number }> {
    const row = await this.ordersRepository
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.total), 0)', 'revenue')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('COUNT(DISTINCT o.customer_id)', 'customers')
      .where('o.companyId = :companyId', { companyId })
      .andWhere('o.seller_id = :sellerId', { sellerId })
      .andWhere('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .andWhere(this.bogotaDateFilter, { from, to })
      .getRawOne<{ revenue: string; orders: string; customers: string }>();

    return {
      revenue: Number(row?.revenue ?? 0),
      orders: Number(row?.orders ?? 0),
      customers: Number(row?.customers ?? 0),
    };
  }

  private async getRevenue(
    companyId: string,
    sellerId: string,
    from: string,
    to: string,
  ): Promise<number> {
    const row = await this.ordersRepository
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.total), 0)', 'revenue')
      .where('o.companyId = :companyId', { companyId })
      .andWhere('o.seller_id = :sellerId', { sellerId })
      .andWhere('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .andWhere(this.bogotaDateFilter, { from, to })
      .getRawOne<{ revenue: string }>();
    return Number(row?.revenue ?? 0);
  }

  /** Kilos vendidos en el mes: suma de cantidades de ítems medidos en KG. */
  private async getKilosSold(
    companyId: string,
    sellerId: string,
    from: string,
    to: string,
  ): Promise<number> {
    const row = await this.orderItemsRepository
      .createQueryBuilder('it')
      .innerJoin('it.order', 'o')
      .select('COALESCE(SUM(it.quantity), 0)', 'kilos')
      .where('o.companyId = :companyId', { companyId })
      .andWhere('o.seller_id = :sellerId', { sellerId })
      .andWhere('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .andWhere(this.bogotaDateFilter, { from, to })
      .andWhere("UPPER(TRIM(it.unit_of_measure)) = 'KG'")
      .getRawOne<{ kilos: string }>();
    return Number(row?.kilos ?? 0);
  }

  /** Clientes de la cartera asignados al vendedor (por código de vendedor). */
  private async getActiveCustomers(
    companyId: string,
    sellerId: string,
  ): Promise<number> {
    const link = await this.userCompaniesRepository.findOne({
      where: { userId: sellerId, companyId },
    });
    const user = await this.usersRepository.findOne({ where: { id: sellerId } });
    const sellerCode = link?.siesaSellerCode || user?.siesaSellerCode;
    if (!sellerCode) return 0;

    return this.clientsRepository.count({
      where: { companyId, sellerCode },
    });
  }

  private async getTrend(
    companyId: string,
    sellerId: string,
    from: string,
    to: string,
  ): Promise<SellerCommercialDashboard['salesTrend']> {
    const rows = await this.ordersRepository
      .createQueryBuilder('o')
      .select(this.bogotaDateExpr, 'date')
      .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
      .addSelect('COUNT(*)', 'orders')
      .where('o.companyId = :companyId', { companyId })
      .andWhere('o.seller_id = :sellerId', { sellerId })
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

    // Rellena cada día del mes hasta hoy (los días futuros del mes en curso se
    // ocultan; para meses pasados se muestran todos los días).
    const today = bogotaToday();
    const end = to < today ? to : today;
    const trend: SellerCommercialDashboard['salesTrend'] = [];
    let cursor = from;
    let guard = 0;
    while (cursor <= end && guard < 40) {
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

  private async getTopCustomers(
    companyId: string,
    sellerId: string,
    from: string,
    to: string,
  ): Promise<SellerCommercialDashboard['topCustomers']> {
    const rows = await this.ordersRepository
      .createQueryBuilder('o')
      .innerJoin('o.customer', 'c')
      .select('c.name', 'name')
      .addSelect('c.code', 'code')
      .addSelect('MIN(c.city)', 'city')
      .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
      .addSelect('MAX(o.created_at)', 'lastPurchase')
      .where('o.companyId = :companyId', { companyId })
      .andWhere('o.seller_id = :sellerId', { sellerId })
      .andWhere('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .andWhere(this.bogotaDateFilter, { from, to })
      .groupBy('c.code')
      .addGroupBy('c.name')
      .orderBy('revenue', 'DESC')
      .getRawMany<{
        name: string;
        code: string;
        city: string | null;
        revenue: string;
        lastPurchase: string | null;
      }>();

    return rows.map((r) => ({
      name: r.name,
      code: r.code,
      city: r.city ?? null,
      revenue: Number(r.revenue),
      lastPurchase: r.lastPurchase
        ? new Date(r.lastPurchase).toISOString()
        : null,
    }));
  }

  /** Ventas por corte (producto) del mes: cantidad y venta por referencia. */
  private async getSalesByCut(
    companyId: string,
    sellerId: string,
    from: string,
    to: string,
  ): Promise<SellerCommercialDashboard['salesByCut']> {
    const rows = await this.orderItemsRepository
      .createQueryBuilder('it')
      .innerJoin('it.order', 'o')
      .select('it.product_name', 'name')
      .addSelect('COALESCE(SUM(it.quantity), 0)', 'quantity')
      .addSelect('COALESCE(SUM(it.line_total), 0)', 'revenue')
      .where('o.companyId = :companyId', { companyId })
      .andWhere('o.seller_id = :sellerId', { sellerId })
      .andWhere('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .andWhere(this.bogotaDateFilter, { from, to })
      .groupBy('it.sku')
      .addGroupBy('it.product_name')
      .orderBy('revenue', 'DESC')
      .getRawMany<{ name: string; quantity: string; revenue: string }>();

    return rows.map((r) => ({
      name: r.name,
      quantity: Number(r.quantity),
      revenue: Number(r.revenue),
    }));
  }
}
