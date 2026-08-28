import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Product } from '../products/entities/product.entity';
import {
  COMPANIES,
  DASHBOARD_EXCLUDED_SELLER_DOCS,
  isDashboardExcludedSellerDoc,
} from '../../common/companies';
import { bogotaToday } from '../orders/order-cortes';
import { PriceListsService } from '../price-lists/price-lists.service';

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
  salesTrend: { date: string; revenue: number; orders: number; label?: string }[];
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
  topSellers: {
    name: string;
    documentId: string;
    orders: number;
    revenue: number;
  }[];
  /**
   * Facturación real y margen desde el ERP Siesa (solo AGROPECUARIA, cía 3).
   * `revenue` = venta bruta, `cost` = costo total, `profit` = margen.
   */
  margin?: {
    revenue: number;
    cost: number;
    profit: number;
    marginPct: number;
    kilos: number;
    bySeller: {
      name: string;
      nit: string;
      revenue: number;
      cost: number;
      profit: number;
      marginPct: number;
      kilos: number;
    }[];
    byProduct: {
      ref: string;
      name: string;
      quantity: number;
      revenue: number;
      cost: number;
      profit: number;
      marginPct: number;
    }[];
  };
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
    private readonly priceListsService: PriceListsService,
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

  /** Expresión SQL que extrae la hora (00–23) en hora local de Colombia. */
  private readonly bogotaHourExpr =
    "TO_CHAR((o.created_at AT TIME ZONE 'America/Bogota'), 'HH24')";

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

  /**
   * Excluye del tablero gerencial a los vendedores marcados como no
   * contabilizables (p. ej. Juan Sierra). Une la relación `seller` y descarta
   * sus pedidos. El `orderAlias` debe apuntar a la entidad Order en el query.
   */
  private excludeDashboardSellers(
    qb: SelectQueryBuilder<Order | OrderItem>,
    orderAlias = 'o',
  ): void {
    const docs = DASHBOARD_EXCLUDED_SELLER_DOCS.map((d) => d.trim()).filter(
      Boolean,
    );
    if (docs.length === 0) return;
    qb.leftJoin(`${orderAlias}.seller`, 'excl_seller').andWhere(
      '(excl_seller.document_id IS NULL OR TRIM(excl_seller.document_id) NOT IN (:...exclDocs))',
      { exclDocs: docs },
    );
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
      .andWhere(this.bogotaDateFilter, { from, to });
    this.excludeDashboardSellers(sale);
    const saleRow = await sale.getRawOne<{
      revenue: string;
      orders: string;
      customers: string;
    }>();

    // Unidades vendidas (suma de cantidades de los ítems) en el rango.
    const unitsQb = this.orderItemsRepository
      .createQueryBuilder('it')
      .innerJoin('it.order', 'o')
      .select('COALESCE(SUM(it.quantity), 0)', 'units')
      .where('o.companyId = :companyId', { companyId })
      .andWhere('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .andWhere(this.bogotaDateFilter, { from, to });
    this.excludeDashboardSellers(unitsQb);
    const unitsRow = await unitsQb.getRawOne<{ units: string }>();

    const revenue = Number(saleRow?.revenue ?? 0);
    const orders = Number(saleRow?.orders ?? 0);

    const [salesTrend, ordersByStatus, topProducts, topCustomers, topSellers] =
      await Promise.all([
        this.getCompanyTrend(companyId, from, to),
        this.getCompanyStatuses(companyId, from, to),
        this.getCompanyTopProducts(companyId, from, to),
        this.getCompanyTopCustomers(companyId, from, to),
        this.getCompanyTopSellers(companyId, from, to),
      ]);

    // Solo AGROPECUARIA (cía 3) tiene facturación con costo en el ERP; para las
    // demás compañías no hay fuente de costo, así que no se calcula margen.
    const margin =
      companyId === '3' ? await this.getErpMargin(from, to) : undefined;

    return {
      companyId,
      name,
      totals: {
        revenue,
        orders,
        units: Number(unitsRow?.units ?? 0),
        avgTicket: orders > 0 ? Number((revenue / orders).toFixed(2)) : 0,
        customers: Number(saleRow?.customers ?? 0),
      },
      salesTrend,
      ordersByStatus,
      topProducts,
      topCustomers,
      topSellers,
      margin,
    };
  }

  /** Lista de períodos (YYYYMM) que cubre un rango de fechas. */
  private periodsBetween(from: string, to: string): string[] {
    const res: string[] = [];
    let y = Number(from.slice(0, 4));
    let m = Number(from.slice(5, 7));
    const ey = Number(to.slice(0, 4));
    const em = Number(to.slice(5, 7));
    let guard = 0;
    while ((y < ey || (y === ey && m <= em)) && guard < 36) {
      res.push(`${y}${String(m).padStart(2, '0')}`);
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
      guard++;
    }
    return res;
  }

  /**
   * Facturación real y margen de AGROPECUARIA. Los totales y el desglose POR
   * VENDEDOR se toman de `vendedor-productos-mes` (venta neta `valor_neto`),
   * el MISMO origen que el reporte de "ventas acumuladas por vendedor", para
   * que ambos totales cuadren. El desglose POR PRODUCTO usa también esa fuente,
   * excluyendo servicios y categorías ajenas. Si el ERP falla, retorna
   * `undefined` para no romper el resto del tablero.
   */
  private async getErpMargin(
    from: string,
    to: string,
  ): Promise<ManagerialCompanyStats['margin']> {
    try {
      const marginPct = (rev: number, prof: number) =>
        rev !== 0 ? Number(((prof / rev) * 100).toFixed(1)) : 0;

      // --- Totales y por vendedor: se toman del MISMO origen que las ventas
      // acumuladas (endpoint `vendedor-productos-mes`, venta neta) para que el
      // total del tablero cuadre exactamente con esa vista. Solo se excluye al
      // vendedor apartado (Juan Sierra); los demás vendedores del ERP se
      // cuentan tal cual (p. ej. León Gutiérrez). ---
      const sellerMap = new Map<
        string,
        { name: string; nit: string; revenue: number; cost: number; kilos: number }
      >();
      let totRevenue = 0;
      let totCost = 0;
      let totKilos = 0;

      for (const periodo of this.periodsBetween(from, to)) {
        const grows = await this.priceListsService.getVendorProductSales(
          '3',
          periodo,
        );
        for (const g of grows) {
          const day = (g.dia ?? g.fecha ?? '').slice(0, 10);
          if (!day || day < from || day > to) continue;
          const nit = (g.nit_vendedor ?? '').trim();
          if (isDashboardExcludedSellerDoc(nit)) continue;
          const name = (g.razon_social_vendedor ?? '').trim() || nit || '—';
          const key = nit || name;
          const rev = Number(g.valor_neto) || 0;
          const cost = Number(g.costo_total) || 0;
          const kg = Number(g.cantidad_base) || 0;
          totRevenue += rev;
          totCost += cost;
          totKilos += kg;
          const sg =
            sellerMap.get(key) ??
            { name, nit: nit || '—', revenue: 0, cost: 0, kilos: 0 };
          sg.revenue += rev;
          sg.cost += cost;
          sg.kilos += kg;
          sellerMap.set(key, sg);
        }
      }

      const bySeller = [...sellerMap.values()]
        .map((s) => ({
          name: s.name,
          nit: s.nit,
          revenue: s.revenue,
          cost: s.cost,
          profit: s.revenue - s.cost,
          marginPct: marginPct(s.revenue, s.revenue - s.cost),
          kilos: s.kilos,
        }))
        .sort((a, b) => b.revenue - a.revenue);

      // --- Por producto: detalle producto a producto (única fuente) ---
      const productMap = new Map<
        string,
        { ref: string; name: string; quantity: number; revenue: number; cost: number }
      >();
      for (const periodo of this.periodsBetween(from, to)) {
        const rows = await this.priceListsService.getVendorProductSales(
          '3',
          periodo,
        );
        for (const row of rows) {
          const day = (row.dia ?? row.fecha ?? '').slice(0, 10);
          if (!day || day < from || day > to) continue;
          // Excluye del desglose por producto al vendedor no contabilizable.
          if (isDashboardExcludedSellerDoc((row.nit_vendedor ?? '').trim()))
            continue;
          const ref = (row.referencia ?? '').trim() || '—';
          const name = (row.descripcion ?? '').trim() || ref;
          const crit = (row.criterio_producto ?? '').trim().toUpperCase();
          if (
            crit === 'SERVICIO' ||
            ref.startsWith('99') ||
            name.toUpperCase().startsWith('SERVICIO')
          ) {
            continue;
          }
          const esCanal =
            crit === 'CANAL' || name.toUpperCase().startsWith('CANAL');
          const esAgro = esCanal || crit === 'CORTE' || crit === 'SUBPRODUCTO';
          if (!esAgro) continue;
          const bruto = Number(row.valor_bruto) || 0;
          const costo = Number(row.costo_total) || 0;
          const qty = Number(row.cantidad_base) || 0;
          const pg =
            productMap.get(ref) ??
            { ref, name, quantity: 0, revenue: 0, cost: 0 };
          pg.quantity += qty;
          pg.revenue += bruto;
          pg.cost += costo;
          productMap.set(ref, pg);
        }
      }

      const byProduct = [...productMap.values()]
        .map((p) => ({
          ref: p.ref,
          name: p.name,
          quantity: p.quantity,
          revenue: p.revenue,
          cost: p.cost,
          profit: p.revenue - p.cost,
          marginPct: marginPct(p.revenue, p.revenue - p.cost),
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 15);

      return {
        revenue: totRevenue,
        cost: totCost,
        profit: totRevenue - totCost,
        marginPct: marginPct(totRevenue, totRevenue - totCost),
        kilos: totKilos,
        bySeller,
        byProduct,
      };
    } catch {
      return undefined;
    }
  }

  private async getCompanyTrend(
    companyId: string,
    from: string,
    to: string,
  ): Promise<ManagerialCompanyStats['salesTrend']> {
    // Un único día seleccionado: la tendencia se muestra por horas para que la
    // gráfica refleje el comportamiento intradía en lugar de un solo punto.
    if (from === to) {
      return this.getCompanyHourlyTrend(companyId, from);
    }

    const trendQb = this.ordersRepository
      .createQueryBuilder('o')
      .select(this.bogotaDateExpr, 'date')
      .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
      .addSelect('COUNT(*)', 'orders')
      .where('o.companyId = :companyId', { companyId })
      .andWhere('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .andWhere(this.bogotaDateFilter, { from, to });
    this.excludeDashboardSellers(trendQb);
    const rows = await trendQb
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

  /** Tendencia intradía (24 horas) de un solo día para una compañía. */
  private async getCompanyHourlyTrend(
    companyId: string,
    day: string,
  ): Promise<ManagerialCompanyStats['salesTrend']> {
    const hourQb = this.ordersRepository
      .createQueryBuilder('o')
      .select(this.bogotaHourExpr, 'hour')
      .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
      .addSelect('COUNT(*)', 'orders')
      .where('o.companyId = :companyId', { companyId })
      .andWhere('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .andWhere(this.bogotaDateFilter, { from: day, to: day });
    this.excludeDashboardSellers(hourQb);
    const rows = await hourQb
      .groupBy('hour')
      .orderBy('hour', 'ASC')
      .getRawMany<{ hour: string; revenue: string; orders: string }>();

    const map = new Map(
      rows.map((r) => [
        Number(r.hour),
        { revenue: Number(r.revenue), orders: Number(r.orders) },
      ]),
    );

    // Serie continua de la jornada laboral (06:00–17:00), una hora por punto.
    const trend: ManagerialCompanyStats['salesTrend'] = [];
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

  private async getCompanyStatuses(
    companyId: string,
    from: string,
    to: string,
  ): Promise<ManagerialCompanyStats['ordersByStatus']> {
    const statusQb = this.ordersRepository
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('o.companyId = :companyId', { companyId })
      .andWhere(this.bogotaDateFilter, { from, to });
    this.excludeDashboardSellers(statusQb);
    const rows = await statusQb
      .groupBy('o.status')
      .getRawMany<{ status: string; count: string }>();

    return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
  }

  private async getCompanyTopProducts(
    companyId: string,
    from: string,
    to: string,
  ): Promise<ManagerialCompanyStats['topProducts']> {
    const prodQb = this.orderItemsRepository
      .createQueryBuilder('it')
      .innerJoin('it.order', 'o')
      .select('it.sku', 'sku')
      .addSelect('it.product_name', 'name')
      .addSelect('COALESCE(SUM(it.quantity), 0)', 'quantity')
      .addSelect('COALESCE(SUM(it.line_total), 0)', 'revenue')
      .where('o.companyId = :companyId', { companyId })
      .andWhere('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .andWhere(this.bogotaDateFilter, { from, to });
    this.excludeDashboardSellers(prodQb);
    const rows = await prodQb
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
    const custQb = this.ordersRepository
      .createQueryBuilder('o')
      .innerJoin('o.customer', 'c')
      .select('c.name', 'name')
      .addSelect('c.code', 'code')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
      .where('o.companyId = :companyId', { companyId })
      .andWhere('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .andWhere(this.bogotaDateFilter, { from, to });
    this.excludeDashboardSellers(custQb);
    const rows = await custQb
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

  private async getCompanyTopSellers(
    companyId: string,
    from: string,
    to: string,
  ): Promise<ManagerialCompanyStats['topSellers']> {
    const excludedDocs = DASHBOARD_EXCLUDED_SELLER_DOCS.map((d) =>
      d.trim(),
    ).filter(Boolean);
    const qb = this.ordersRepository
      .createQueryBuilder('o')
      .innerJoin('o.seller', 's')
      .select('s.name', 'name')
      .addSelect('s.document_id', 'documentId')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
      .where('o.companyId = :companyId', { companyId })
      .andWhere('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .andWhere(this.bogotaDateFilter, { from, to });
    if (excludedDocs.length > 0) {
      qb.andWhere('TRIM(s.document_id) NOT IN (:...excludedDocs)', {
        excludedDocs,
      });
    }
    const rows = await qb
      .groupBy('s.name')
      .addGroupBy('s.document_id')
      .orderBy('revenue', 'DESC')
      .getRawMany<{
        name: string;
        documentId: string;
        orders: string;
        revenue: string;
      }>();

    return rows.map((r) => ({
      name: r.name,
      documentId: r.documentId,
      orders: Number(r.orders),
      revenue: Number(r.revenue),
    }));
  }
}