import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { ClientRecord } from '../clients/entities/client-record.entity';
import { UserCompany } from '../users/entities/user-company.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { bogotaToday } from '../orders/order-cortes';
import { BudgetsService } from '../budgets/budgets.service';
import { baseCompanyId } from '../../common/companies';
import { ChannelSalesClient, ChannelSaleRaw } from '../channel-sales/channel-sales.client';
import { PriceListsService } from '../price-lists/price-lists.service';
import { VendorProductSaleRaw } from '../price-lists/price-lists.client';

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
    private readonly priceListsService: PriceListsService,
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

  /** Número de días entre dos fechas YYYY-MM-DD (to - from). */
  private daysBetween(from: string, to: string): number {
    const a = new Date(`${from}T12:00:00`).getTime();
    const b = new Date(`${to}T12:00:00`).getTime();
    return Math.round((b - a) / 86400000);
  }

  private prettyDay(date: string): string {
    return new Date(`${date}T12:00:00`).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
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
   * Ventas del/los vendedor(es) desde el ERP (vendedor-productos-mes) para un
   * rango de fechas: filtra por NIT (documento del vendedor) y por la fecha del
   * movimiento, y agrega pesos (valor_bruto; las líneas negativas son
   * devoluciones y restan), kilos (cantidad_base), total por día, por producto
   * y por criterio (canal).
   */
  private async getErpSales(
    nits: Set<string>,
    from: string,
    to: string,
  ): Promise<{
    revenue: number;
    kilos: number;
    byDay: Map<string, number>;
    byProduct: { name: string; quantity: number; revenue: number }[];
    byCanal: { name: string; kilos: number; revenue: number }[];
  }> {
    const rows: VendorProductSaleRaw[] = [];
    for (const periodo of this.periodsBetween(from, to)) {
      const r = await this.priceListsService.getVendorProductSales(periodo);
      rows.push(...r);
    }

    let revenue = 0;
    let kilos = 0;
    const byDay = new Map<string, number>();
    // Cortes (todo lo que NO es un canal entero) y canales (CANAL DE ...) por
    // separado, cada uno agrupado por referencia de producto.
    const prodMap = new Map<
      string,
      { name: string; quantity: number; revenue: number }
    >();
    const canalMap = new Map<
      string,
      { name: string; kilos: number; revenue: number }
    >();

    const filterByNit = nits.size > 0;
    for (const row of rows) {
      const nit = (row.nit_vendedor ?? '').trim();
      if (filterByNit && !nits.has(nit)) continue;
      // El ERP renombró la fecha del movimiento de `fecha` a `dia`.
      const day = (row.dia ?? row.fecha ?? '').slice(0, 10);
      if (!day) continue;
      const ref = (row.referencia ?? '').trim() || '—';
      const name = (row.descripcion ?? '').trim() || ref;
      const crit = (row.criterio_producto ?? '').trim().toUpperCase();
      // Los SERVICIOS (desposte, sacrificio, transporte, alquiler, etc.) no son
      // productos: se identifican por `criterio_producto` = SERVICIO, con
      // respaldo por referencia 99xxx / descripción "SERVICIO ...".
      if (
        crit === 'SERVICIO' ||
        ref.startsWith('99') ||
        name.toUpperCase().startsWith('SERVICIO')
      ) {
        continue;
      }
      // Se consolida la venta con el VALOR BRUTO. Las líneas negativas son
      // devoluciones: se suman tal cual, de modo que restan del total.
      const bruto = Number(row.valor_bruto) || 0;
      // La tendencia diaria usa TODOS los días del período consultado (sin
      // filtrar por el rango), para poder graficar la evolución del mes.
      byDay.set(day, (byDay.get(day) ?? 0) + bruto);
      if (day < from || day > to) continue;
      const qty = Number(row.cantidad_base) || 0;
      revenue += bruto;
      kilos += qty;
      // Los canales enteros (CANAL DE CERDO/NOVILLA/NOVILLO/VACA) van a su
      // propia tarjeta; el resto (cortes, subproductos, etc.) a la de productos.
      if (crit === 'CANAL' || name.toUpperCase().startsWith('CANAL')) {
        const cg = canalMap.get(ref) ?? { name, kilos: 0, revenue: 0 };
        cg.kilos += qty;
        cg.revenue += bruto;
        canalMap.set(ref, cg);
      } else {
        const pg = prodMap.get(ref) ?? { name, quantity: 0, revenue: 0 };
        pg.quantity += qty;
        pg.revenue += bruto;
        prodMap.set(ref, pg);
      }
    }

    const byProduct = [...prodMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 12);
    const byCanal = [...canalMap.values()]
      .map((c) => ({ name: c.name, kilos: c.kilos, revenue: c.revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    return { revenue, kilos, byDay, byProduct, byCanal };
  }

  /** Último día (YYYY-MM-DD) del mes de una fecha. */
  private endOfMonth(date: string): string {
    const y = Number(date.slice(0, 4));
    const m = Number(date.slice(5, 7));
    const last = new Date(y, m, 0).getDate();
    return `${date.slice(0, 7)}-${String(last).padStart(2, '0')}`;
  }

  /** Construye la tendencia diaria (pesos por día) a partir de las ventas ERP. */
  private buildErpTrend(
    from: string,
    to: string,
    byDay: Map<string, number>,
  ): SellerCommercialDashboard['salesTrend'] {
    const today = bogotaToday();
    const end = to < today ? to : today;
    const trend: SellerCommercialDashboard['salesTrend'] = [];
    let cursor = from;
    let guard = 0;
    while (cursor <= end && guard < 400) {
      trend.push({ date: cursor, revenue: byDay.get(cursor) ?? 0, orders: 0 });
      cursor = this.shiftDate(cursor, 1);
      guard++;
    }
    return trend;
  }

  async getSellerDashboard(
    companyId: string,
    sellerId: string,
    month: number,
    year: number,
    day?: number,
    allSellers = false,
    rangeFrom?: string,
    rangeTo?: string,
  ): Promise<SellerCommercialDashboard> {
    // El rango puede venir explícito (desde/hasta) o derivarse de mes/día. El
    // período anterior (para el crecimiento) es el rango de igual longitud
    // inmediatamente anterior.
    let from: string;
    let to: string;
    let prevFrom: string;
    let prevTo: string;
    let singleDay: boolean;
    if (rangeFrom && rangeTo) {
      from = rangeFrom <= rangeTo ? rangeFrom : rangeTo;
      to = rangeFrom <= rangeTo ? rangeTo : rangeFrom;
      singleDay = from === to;
      const len = this.daysBetween(from, to) + 1;
      prevTo = this.shiftDate(from, -1);
      prevFrom = this.shiftDate(prevTo, -(len - 1));
    } else {
      singleDay = !!day && day >= 1 && day <= 31;
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
    }

    // Conjunto de vendedores a incluir y sus códigos de canal. En modo general
    // se toman TODOS los vendedores ASIGNADOS (rol vendedor con mapping activo);
    // para un vendedor concreto, solo él.
    let seller: User | null = null;
    let sellerIds: string[];
    let channelCodes: Set<string>;
    let activeCodes: string[];
    let nitSet: Set<string>;
    if (allSellers) {
      const base = baseCompanyId(companyId);
      const mappings = await this.userCompaniesRepository.find({
        where: { companyId: base, active: true },
        relations: { user: true },
      });
      // Vendedores asignados: rol vendedor, activos y con código de Siesa
      // (mismo criterio que el reporte de ventas por vendedor).
      const assigned = mappings
        .map((m) => ({
          m,
          code: (m.siesaSellerCode || m.user?.siesaSellerCode || '').trim(),
        }))
        .filter(
          ({ m, code }) =>
            m.user && m.user.active && m.user.role === UserRole.SELLER && code,
        );
      sellerIds = assigned.map(({ m }) => m.user.id);
      channelCodes = new Set(assigned.map(({ code }) => code));
      activeCodes = [...channelCodes];
      // En modo general las ventas del ERP incluyen a TODOS los vendedores (el
      // ERP no separa por compañía ni exige código Siesa), así que no se filtra
      // por NIT: se suma todo lo facturado del período/rango.
      nitSet = new Set();
    } else {
      seller = await this.usersRepository.findOne({ where: { id: sellerId } });
      const link = await this.userCompaniesRepository.findOne({
        where: { userId: sellerId, companyId },
      });
      const code = (
        link?.siesaSellerCode ||
        seller?.siesaSellerCode ||
        ''
      ).trim();
      sellerIds = [sellerId];
      channelCodes = new Set(code ? [code] : []);
      activeCodes = code ? [code] : [];
      const nit = (seller?.documentId ?? '').trim();
      nitSet = new Set(nit ? [nit] : []);
    }

    // Las ventas del ERP (vendedor-productos-mes) SOLO están disponibles para
    // AGROPECUARIA (compañía 3): ese es el único tenant que trae ese endpoint.
    // Para las demás compañías las ventas se calculan como pedidos de la app
    // más las ventas por canal (comportamiento anterior).
    const useErp = companyId === '3';

    const [totalsRow, activeCustomers, topCustomers, budget, appKilos, projectionConfig] =
      await Promise.all([
        this.getTotals(companyId, sellerIds, from, to),
        this.getActiveCustomers(companyId, activeCodes),
        this.getTopCustomers(companyId, sellerIds, from, to),
        allSellers
          ? this.budgetsService.getCompanyBudget(companyId, month, year)
          : this.budgetsService.getSellerBudget(companyId, sellerId, month, year),
        this.getKilosSold(companyId, sellerIds, from, to),
        this.budgetsService.getProjection(companyId, month, year),
      ]);

    const orders = totalsRow.orders;

    let revenue: number;
    let totalKilos: number;
    let salesTrend: SellerCommercialDashboard['salesTrend'];
    let salesByCut: SellerCommercialDashboard['salesByCut'];
    let salesByChannel: SellerCommercialDashboard['salesByChannel'];
    let revenuePct: number | null;
    let kilosPct: number | null;

    if (useErp) {
      // AGROPECUARIA: ventas facturadas en Siesa (valor_neto) y kilos.
      const [erp, erpPrev] = await Promise.all([
        this.getErpSales(nitSet, from, to),
        this.getErpSales(nitSet, prevFrom, prevTo),
      ]);
      revenue = erp.revenue;
      totalKilos = erp.kilos;
      // La tendencia siempre grafica la venta diaria del MES (aunque se filtre
      // un solo día o un rango dentro del mes).
      const trendFrom = singleDay ? `${from.slice(0, 7)}-01` : from;
      const trendTo = singleDay ? this.endOfMonth(from) : to;
      salesTrend = this.buildErpTrend(trendFrom, trendTo, erp.byDay);
      salesByCut = erp.byProduct;
      salesByChannel = erp.byCanal;
      revenuePct =
        erpPrev.revenue > 0
          ? Number(
              (((revenue - erpPrev.revenue) / erpPrev.revenue) * 100).toFixed(1),
            )
          : null;
      kilosPct =
        erpPrev.kilos > 0
          ? Number(
              (((totalKilos - erpPrev.kilos) / erpPrev.kilos) * 100).toFixed(1),
            )
          : null;
    } else {
      // Otras compañías: pedidos de la app + ventas por canal.
      const [prevRevenue, appTrend, appCut, prevKilos, channelRows, channelRowsPrev] =
        await Promise.all([
          this.getRevenue(companyId, sellerIds, prevFrom, prevTo),
          this.getTrend(companyId, sellerIds, from, to),
          this.getSalesByCut(companyId, sellerIds, from, to),
          this.getKilosSold(companyId, sellerIds, prevFrom, prevTo),
          this.channelSalesClient.fetch(companyId, from, to),
          this.channelSalesClient.fetch(companyId, prevFrom, prevTo),
        ]);
      const cur = this.summarizeChannels(channelRows, channelCodes);
      const prevCh = this.summarizeChannels(channelRowsPrev, channelCodes);
      const trend = appTrend.map((p) => ({ ...p }));
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
      revenue = totalsRow.revenue + cur.revenue;
      totalKilos = appKilos + cur.kilos;
      salesTrend = trend;
      salesByCut = appCut;
      salesByChannel = cur.byChannel;
      revenuePct =
        prevRevenue + prevCh.revenue > 0
          ? Number(
              (((revenue - (prevRevenue + prevCh.revenue)) /
                (prevRevenue + prevCh.revenue)) *
                100).toFixed(1),
            )
          : null;
      kilosPct =
        prevKilos + prevCh.kilos > 0
          ? Number(
              (((totalKilos - (prevKilos + prevCh.kilos)) /
                (prevKilos + prevCh.kilos)) *
                100).toFixed(1),
            )
          : null;
    }

    // Proyección AUTOMÁTICA del mes según el ritmo de ventas sobre los días
    // hábiles marcados. Solo aplica en la vista mensual (no por día/rango).
    const projection = this.computeProjection(
      projectionConfig.workingDays,
      revenue,
      totalKilos,
      singleDay,
    );

    const label = singleDay
      ? new Date(`${from}T12:00:00`).toLocaleDateString('es-CO', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : rangeFrom && rangeTo
        ? `${this.prettyDay(from)} — ${this.prettyDay(to)}`
        : new Date(year, month - 1, 1).toLocaleDateString('es-CO', {
            month: 'long',
            year: 'numeric',
          });

    return {
      period: {
        month,
        year,
        day: singleDay ? Number(from.slice(8, 10)) : null,
        label,
      },
      generatedAt: new Date().toISOString(),
      seller: {
        id: allSellers ? 'all' : sellerId,
        name: allSellers
          ? 'General · Todos los vendedores'
          : seller?.name ?? 'Vendedor',
      },
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
        orderKilos: appKilos,
      },
      growth: { revenuePct, kilosPct },
      salesTrend,
      topCustomers,
      salesByCut,
      salesByChannel,
      budget,
      projection,
    };
  }

  /**
   * Proyección automática del mes a partir del acumulado de ventas y los días
   * hábiles marcados. Estima el cierre del mes suponiendo que se mantiene el
   * ritmo diario (promedio por día hábil transcurrido) por el total de días
   * hábiles. Devuelve null en la vista por día o si no hay días hábiles/ventas.
   */
  private computeProjection(
    workingDays: string[] | null,
    revenue: number,
    kilos: number,
    singleDay: boolean,
  ): { revenue: number; kilos: number } | null {
    const days = Array.isArray(workingDays) ? workingDays : [];
    const total = days.length;
    if (singleDay || total === 0) return null;
    // Días hábiles transcurridos: los que ya llegaron a hoy (mes en curso). En
    // meses pasados, hoy es posterior a todos, así que cuentan todos.
    const today = bogotaToday();
    const elapsed = days.filter((d) => d <= today).length;
    if (elapsed === 0) return null;
    return {
      revenue: (revenue / elapsed) * total,
      kilos: (kilos / elapsed) * total,
    };
  }

  /**
   * Condición SQL para filtrar por un conjunto de vendedores.
   *  - null: sin filtro (todos).
   *  - lista vacía: no coincide con nadie (1=0).
   *  - lista con ids: o.seller_id IN (...).
   */
  private sellerFilterSql(
    sellerIds: string[] | null,
  ): [string, Record<string, unknown>] {
    if (!sellerIds) return ['1=1', {}];
    if (sellerIds.length === 0) return ['1=0', {}];
    return ['o.seller_id IN (:...sellerIds)', { sellerIds }];
  }

  private async getTotals(
    companyId: string,
    sellerIds: string[] | null,
    from: string,
    to: string,
  ): Promise<{ revenue: number; orders: number; customers: number }> {
    const [sellerCond, sellerParams] = this.sellerFilterSql(sellerIds);
    const row = await this.ordersRepository
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.total), 0)', 'revenue')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('COUNT(DISTINCT o.customer_id)', 'customers')
      .where('o.companyId = :companyId', { companyId })
      .andWhere(sellerCond, sellerParams)
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
    sellerIds: string[] | null,
    from: string,
    to: string,
  ): Promise<number> {
    const [sellerCond, sellerParams] = this.sellerFilterSql(sellerIds);
    const row = await this.ordersRepository
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.total), 0)', 'revenue')
      .where('o.companyId = :companyId', { companyId })
      .andWhere(sellerCond, sellerParams)
      .andWhere('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .andWhere(this.bogotaDateFilter, { from, to })
      .getRawOne<{ revenue: string }>();
    return Number(row?.revenue ?? 0);
  }

  /**
   * Resume las ventas por canal de un conjunto de vendedores: incluye solo las
   * filas cuyo código de vendedor (codigo_vendedor) está en `codes`, suma pesos
   * (valor_neto) y kilos (cantidad) y agrupa por la descripción del canal.
   */
  private summarizeChannels(
    rows: ChannelSaleRaw[],
    codes: Set<string>,
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

    if (codes.size > 0) {
      for (const r of rows) {
        const code = (r.codigo_vendedor ?? '').trim();
        if (!code || !codes.has(code)) continue;
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
    sellerIds: string[] | null,
    from: string,
    to: string,
  ): Promise<number> {
    const [sellerCond, sellerParams] = this.sellerFilterSql(sellerIds);
    const row = await this.orderItemsRepository
      .createQueryBuilder('it')
      .innerJoin('it.order', 'o')
      .select('COALESCE(SUM(it.quantity), 0)', 'kilos')
      .where('o.companyId = :companyId', { companyId })
      .andWhere(sellerCond, sellerParams)
      .andWhere('o.status IN (:...statuses)', { statuses: SALE_STATUSES })
      .andWhere(this.bogotaDateFilter, { from, to })
      .andWhere("UPPER(TRIM(it.unit_of_measure)) = 'KG'")
      .getRawOne<{ kilos: string }>();
    return Number(row?.kilos ?? 0);
  }

  /** Clientes de la cartera asignados a un conjunto de códigos de vendedor. */
  private async getActiveCustomers(
    companyId: string,
    codes: string[] | null,
  ): Promise<number> {
    // Sin restricción: todos los clientes de la compañía.
    if (!codes) {
      return this.clientsRepository.count({
        where: { companyId: baseCompanyId(companyId) },
      });
    }
    if (codes.length === 0) return 0;
    return this.clientsRepository.count({
      where: { companyId: baseCompanyId(companyId), sellerCode: In(codes) },
    });
  }

  private async getTrend(
    companyId: string,
    sellerIds: string[] | null,
    from: string,
    to: string,
  ): Promise<SellerCommercialDashboard['salesTrend']> {
    // Un único día: la tendencia se muestra por horas (06:00–17:00).
    if (from === to) {
      return this.getHourlyTrend(companyId, sellerIds, from);
    }

    const [sellerCond, sellerParams] = this.sellerFilterSql(sellerIds);
    const rows = await this.ordersRepository
      .createQueryBuilder('o')
      .select(this.bogotaDateExpr, 'date')
      .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
      .addSelect('COUNT(*)', 'orders')
      .where('o.companyId = :companyId', { companyId })
      .andWhere(sellerCond, sellerParams)
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
    sellerIds: string[] | null,
    day: string,
  ): Promise<SellerCommercialDashboard['salesTrend']> {
    const [sellerCond, sellerParams] = this.sellerFilterSql(sellerIds);
    const rows = await this.ordersRepository
      .createQueryBuilder('o')
      .select(this.bogotaHourExpr, 'hour')
      .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
      .addSelect('COUNT(*)', 'orders')
      .where('o.companyId = :companyId', { companyId })
      .andWhere(sellerCond, sellerParams)
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
    sellerIds: string[] | null,
    from: string,
    to: string,
  ): Promise<SellerCommercialDashboard['topCustomers']> {
    const [sellerCond, sellerParams] = this.sellerFilterSql(sellerIds);
    const rows = await this.ordersRepository
      .createQueryBuilder('o')
      .innerJoin('o.customer', 'c')
      .select('c.name', 'name')
      .addSelect('c.code', 'code')
      .addSelect('MIN(c.city)', 'city')
      .addSelect('COALESCE(SUM(o.total), 0)', 'revenue')
      .addSelect('MAX(o.created_at)', 'lastPurchase')
      .where('o.companyId = :companyId', { companyId })
      .andWhere(sellerCond, sellerParams)
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
    sellerIds: string[] | null,
    from: string,
    to: string,
  ): Promise<SellerCommercialDashboard['salesByCut']> {
    const [sellerCond, sellerParams] = this.sellerFilterSql(sellerIds);
    const rows = await this.orderItemsRepository
      .createQueryBuilder('it')
      .innerJoin('it.order', 'o')
      .select('it.product_name', 'name')
      .addSelect('COALESCE(SUM(it.quantity), 0)', 'quantity')
      .addSelect('COALESCE(SUM(it.line_total), 0)', 'revenue')
      .where('o.companyId = :companyId', { companyId })
      .andWhere(sellerCond, sellerParams)
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
