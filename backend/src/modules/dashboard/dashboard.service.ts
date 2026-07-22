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
import { ChannelSalesClient, ChannelSaleRaw } from '../channel-sales/channel-sales.client';

/** Estados que representan una venta real (excluye borradores y cancelados). */
const SALE_STATUSES = [
  OrderStatus.CONFIRMED,
  OrderStatus.SYNCING,
  OrderStatus.SYNCED,
  OrderStatus.FAILED,
];

/** Tablero de gestión comercial de un vendedor para un mes concreto. */
export interface SellerCommercialDashboard {
  period: { month: number; year: number; day: number | null; label: string };
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
    /** Kilos vendidos en el mes (pedidos KG + canales). */
    kilosSold: number;
    /** Total en pesos SOLO de pedidos de la app (sin ventas de canal). */
    orderRevenue: number;
    /** Total en kilos SOLO de pedidos de la app (sin ventas de canal). */
    orderKilos: number;
  };
  growth: {
    /** Crecimiento de ventas vs. el mes anterior (porcentaje) o null. */
    revenuePct: number | null;
    /** Crecimiento de kilos vendidos vs. el mes anterior (porcentaje) o null. */
    kilosPct: number | null;
  };
  salesTrend: { date: string; revenue: number; orders: number; label?: string }[];
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
  /** Ventas por canal (desde el ERP), agrupadas por descripción del canal. */
  salesByChannel: {
    name: string;
    kilos: number;
    revenue: number;
  }[];
  /** Presupuesto (meta) del vendedor para el mes, si está cargado. */
  budget: { expectedRevenue: number; targetKilos: number } | null;
  /** Proyección de ventas de la compañía para el mes (total), si existe. */
  projection: { revenue: number; kilos: number } | null;
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
    private readonly channelSalesClient: ChannelSalesClient,
  ) {}

  /** Pasa created_at a fecha local de Colombia y la limita a un rango. */
  private readonly bogotaDateFilter =
    "(o.created_at AT TIME ZONE 'America/Bogota')::date BETWEEN :from::date AND :to::date";

  /** Expresión SQL que pasa created_at a fecha local de Colombia (YYYY-MM-DD). */
  private readonly bogotaDateExpr =
    "TO_CHAR((o.created_at AT TIME ZONE 'America/Bogota'), 'YYYY-MM-DD')";

  /** Expresión SQL que extrae la hora (00–23) en hora local de Colombia. */
  private readonly bogotaHourExpr =
    "TO_CHAR((o.created_at AT TIME ZONE 'America/Bogota'), 'HH24')";

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
    day?: number,
  ): Promise<SellerCommercialDashboard> {
    // Si se indica un día, el tablero se limita a ese día (y compara contra el
    // día anterior); si no, es todo el mes (y compara contra el mes anterior).
    const singleDay = !!day && day >= 1 && day <= 31;
    let from: string;
    let to: string;
    let prevFrom: string;
    let prevTo: string;
    if (singleDay) {
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      from = `${year}-${mm}-${dd}`;
      to = from;
      prevFrom = this.shiftDate(from, -1);
      prevTo = prevFrom;
    } else {
      const r = this.monthRange(month, year);
      from = r.from;
      to = r.to;
      const pr = this.monthRange(
        month === 1 ? 12 : month - 1,
        month === 1 ? year - 1 : year,
      );
      prevFrom = pr.from;
      prevTo = pr.to;
    }

    const [seller, totalsRow, prevRevenue, activeCustomers, salesTrend, topCustomers, salesByCut, budget, kilosSold, prevKilos, channelRows, channelRowsPrev, sellerLink, projection] =
      await Promise.all([
        this.usersRepository.findOne({ where: { id: sellerId } }),
        this.getTotals(companyId, sellerId, from, to),
        this.getRevenue(companyId, sellerId, prevFrom, prevTo),
        this.getActiveCustomers(companyId, sellerId),
        this.getTrend(companyId, sellerId, from, to),
        this.getTopCustomers(companyId, sellerId, from, to),
        this.getSalesByCut(companyId, sellerId, from, to),
        this.budgetsService.getSellerBudget(companyId, sellerId, month, year),
        this.getKilosSold(companyId, sellerId, from, to),
        this.getKilosSold(companyId, sellerId, prevFrom, prevTo),
        this.channelSalesClient.fetch(companyId, from, to),
        this.channelSalesClient.fetch(companyId, prevFrom, prevTo),
        this.userCompaniesRepository.findOne({
          where: { userId: sellerId, companyId },
        }),
        this.budgetsService.getCompanyProjection(companyId, month, year),
      ]);

    // Ventas por canal del vendedor: el endpoint las identifica por el CÓDIGO
    // DE VENDEDOR EN SIESA (codigo_vendedor), no por la cédula. Se resuelve el
    // código del vendedor en esta compañía (user_companies), con respaldo al
    // global del usuario.
    const sellerCode = (
      sellerLink?.siesaSellerCode ||
      seller?.siesaSellerCode ||
      ''
    ).trim();
    const cur = this.summarizeChannels(channelRows, sellerCode);
    const prevCh = this.summarizeChannels(channelRowsPrev, sellerCode);

    // Las ventas por canal también afectan la gráfica de tendencia: en la vista
    // mensual se suman al día correspondiente; en la vista por horas (un solo
    // día) se reparten entre las horas mostradas (el ERP no da la hora).
    const trend = salesTrend.map((p) => ({ ...p }));
    const isHourly = trend.length > 0 && trend[0].label != null;
    if (isHourly) {
      const dayTotal = cur.byDay.get(from) ?? 0;
      if (dayTotal > 0 && trend.length > 0) {
        const per = dayTotal / trend.length;
        trend.forEach((p) => {
          p.revenue += per;
        });
      }
    } else {
      trend.forEach((p) => {
        p.revenue += cur.byDay.get(p.date) ?? 0;
      });
    }

    // Las ventas por canal SUMAN a las ventas y kilos del vendedor (y por tanto
    // cuentan para el presupuesto/cumplimiento).
    const orders = totalsRow.orders;
    const revenue = totalsRow.revenue + cur.revenue;
    const totalKilos = kilosSold + cur.kilos;
    const revenuePct =
      prevRevenue + prevCh.revenue > 0
        ? Number(
            (((revenue - (prevRevenue + prevCh.revenue)) /
              (prevRevenue + prevCh.revenue)) *
              100).toFixed(1),
          )
        : null;
    const kilosPct =
      prevKilos + prevCh.kilos > 0
        ? Number(
            (((totalKilos - (prevKilos + prevCh.kilos)) /
              (prevKilos + prevCh.kilos)) *
              100).toFixed(1),
          )
        : null;

    const label = singleDay
      ? new Date(year, month - 1, day).toLocaleDateString('es-CO', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : new Date(year, month - 1, 1).toLocaleDateString('es-CO', {
          month: 'long',
          year: 'numeric',
        });

    return {
      period: { month, year, day: singleDay ? (day as number) : null, label },
      generatedAt: new Date().toISOString(),
      seller: { id: sellerId, name: seller?.name ?? 'Vendedor' },
      totals: {
        revenue,
        orders,
        customersServed: totalsRow.customers,
        activeCustomers,
        // El ticket promedio se mantiene sobre las facturas de la app (pedidos).
        avgTicket:
          orders > 0 ? Number((totalsRow.revenue / orders).toFixed(2)) : 0,
        kilosSold: totalKilos,
        orderRevenue: totalsRow.revenue,
        orderKilos: kilosSold,
      },
      growth: { revenuePct, kilosPct },
      salesTrend: trend,
      topCustomers,
      salesByCut,
      salesByChannel: cur.byChannel,
      budget,
      projection,
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

  /**
   * Resume las ventas por canal de un vendedor: filtra las filas por su cédula
   * (codigo_vendedor), suma pesos (valor_neto) y kilos (cantidad), y agrupa por
   * la descripción del canal.
   */
  private summarizeChannels(
    rows: ChannelSaleRaw[],
    sellerCode: string,
  ): {
    revenue: number;
    kilos: number;
    byChannel: { name: string; kilos: number; revenue: number }[];
    byDay: Map<string, number>;
  } {
    let revenue = 0;
    let kilos = 0;
    const grouped = new Map<string, { kilos: number; revenue: number }>();
    const byDay = new Map<string, number>();

    if (sellerCode) {
      for (const r of rows) {
        if ((r.codigo_vendedor ?? '').trim() !== sellerCode) continue;
        const val = Number(r.valor_neto ?? r.valor_bruto ?? 0);
        const qty = Number(r.cantidad ?? 0);
        revenue += val;
        kilos += qty;
        const name = (r.descripcion ?? '').trim() || 'Sin canal';
        const g = grouped.get(name) ?? { kilos: 0, revenue: 0 };
        g.kilos += qty;
        g.revenue += val;
        grouped.set(name, g);
        // Total por día (para sumarlo a la gráfica de tendencia).
        const dayKey = (r.fecha ?? '').slice(0, 10);
        if (dayKey) byDay.set(dayKey, (byDay.get(dayKey) ?? 0) + val);
      }
    }

    const byChannel = [...grouped.entries()]
      .map(([name, v]) => ({ name, kilos: v.kilos, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    return { revenue, kilos, byChannel, byDay };
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
    // Un único día: la tendencia se muestra por horas (06:00–17:00).
    if (from === to) {
      return this.getHourlyTrend(companyId, sellerId, from);
    }

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

  /** Tendencia por horas (06:00–17:00) de un solo día para el vendedor. */
  private async getHourlyTrend(
    companyId: string,
    sellerId: string,
    day: string,
  ): Promise<SellerCommercialDashboard['salesTrend']> {
    const rows = await this.ordersRepository
      .createQueryBuilder('o')
      .select(this.bogotaHourExpr, 'hour')
      .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
      .addSelect('COUNT(*)', 'orders')
      .where('o.companyId = :companyId', { companyId })
      .andWhere('o.seller_id = :sellerId', { sellerId })
      .andWhere('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .andWhere(this.bogotaDateFilter, { from: day, to: day })
      .groupBy('hour')
      .orderBy('hour', 'ASC')
      .getRawMany<{ hour: string; revenue: string; orders: string }>();

    const map = new Map(
      rows.map((r) => [
        Number(r.hour),
        { revenue: Number(r.revenue), orders: Number(r.orders) },
      ]),
    );

    const trend: SellerCommercialDashboard['salesTrend'] = [];
    for (let h = 6; h <= 17; h++) {
      const found = map.get(h);
      const hh = String(h).padStart(2, '0');
      trend.push({
        date: `${day}T${hh}:00`,
        label: `${hh}:00`,
        revenue: found?.revenue ?? 0,
        orders: found?.orders ?? 0,
      });
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
