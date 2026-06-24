import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { buildOrdersPdf } from '../orders/order-pdf';
import { bogotaParts } from '../orders/order-cortes';
import { isValidCompany } from '../../common/companies';

/** Resumen de un pedido descargable (para la tabla del administrador). */
export interface DownloadableOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerCode: string;
  sellerName: string;
  total: number;
  siesaEstado?: string;
  createdAt: Date;
  downloadedAt?: Date | null;
}

/** Línea (ítem) de un pedido para el detalle administrativo. */
export interface AdminOrderItem {
  sku: string;
  productName: string;
  unitOfMeasure?: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  lineTotal: number;
}

/** Detalle completo de un pedido para el seguimiento administrativo. */
export interface AdminOrderDetail {
  id: string;
  orderNumber: string;
  companyId: string;
  status: OrderStatus;
  // Quién y cuándo lo generó.
  sellerName: string;
  sellerDocument?: string;
  sellerCode?: string;
  createdAt: Date;
  deliveryDate?: string;
  // Cliente.
  customerName: string;
  customerCode: string;
  customerCity?: string;
  // Totales.
  subtotal: number;
  taxes: number;
  total: number;
  // Notas / logística.
  notes?: string;
  logisticsNote?: string;
  deliveryType?: string;
  deliverySchedule?: string;
  // Cartera (aprobación).
  carteraBalance?: number | null;
  approvalDeadline?: Date | null;
  approvedAt?: Date | null;
  approvedBy?: string | null;
  disapprovalReason?: string | null;
  cancelReason?: string | null;
  // Siesa.
  siesaEstado?: string | null;
  siesaStatePrevious?: string | null;
  syncedAt?: Date | null;
  siesaDocumentId?: string | null;
  syncError?: string | null;
  // Descargas del documento.
  downloadCount: number;
  downloadedAt?: Date | null;
  downloadedBy?: string | null;
  items: AdminOrderItem[];
}

/** Filtros para el listado administrativo de pedidos. */
export interface AdminOrdersFilter {
  from?: string;
  to?: string;
  status?: string;
  search?: string;
}

@Injectable()
export class AdminOrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
  ) {}

  /**
   * Listado administrativo de todos los pedidos de una compañía con toda la
   * información de seguimiento (quién lo generó, cartera, Siesa y descargas).
   * Permite filtrar por rango de días (hora de Colombia), estado y búsqueda.
   */
  async listAll(
    companyId: string,
    filter: AdminOrdersFilter = {},
  ): Promise<AdminOrderDetail[]> {
    if (!isValidCompany(companyId)) {
      throw new BadRequestException('Compañía inválida.');
    }

    const orders = await this.ordersRepository.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
    });

    const from = filter.from?.trim() || undefined;
    const to = filter.to?.trim() || undefined;
    const status = filter.status?.trim() || undefined;
    const search = filter.search?.trim().toLowerCase() || undefined;

    const filtered = orders.filter((o) => {
      // Filtro por día (hora de Colombia).
      if (from || to) {
        const { date } = bogotaParts(o.createdAt);
        if (from && date < from) return false;
        if (to && date > to) return false;
      }
      if (status && o.status !== status) return false;
      if (search) {
        const haystack = [
          o.orderNumber,
          o.customer?.name,
          o.customer?.code,
          o.seller?.name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    return filtered.map((o) => this.toDetail(o));
  }

  /** Convierte un pedido en su detalle administrativo. */
  private toDetail(o: Order): AdminOrderDetail {
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      companyId: o.companyId,
      status: o.status,
      sellerName: o.seller?.name ?? '',
      sellerDocument: o.seller?.documentId,
      sellerCode: o.customer?.sellerCode,
      createdAt: o.createdAt,
      deliveryDate: o.deliveryDate,
      customerName: o.customer?.name ?? '',
      customerCode: o.customer?.code ?? '',
      customerCity: o.customer?.city,
      subtotal: Number(o.subtotal),
      taxes: Number(o.taxes),
      total: Number(o.total),
      notes: o.notes,
      logisticsNote: o.logisticsNote,
      deliveryType: o.deliveryType,
      deliverySchedule: o.deliverySchedule,
      carteraBalance: o.carteraBalance != null ? Number(o.carteraBalance) : null,
      approvalDeadline: o.approvalDeadline ?? null,
      approvedAt: o.approvedAt ?? null,
      approvedBy: o.approvedBy ?? null,
      disapprovalReason: o.disapprovalReason ?? null,
      cancelReason: o.cancelReason ?? null,
      siesaEstado: o.siesaEstado ?? null,
      siesaStatePrevious: o.siesaStatePrevious ?? null,
      syncedAt: o.syncedAt ?? null,
      siesaDocumentId: o.siesaDocumentId ?? null,
      syncError: o.syncError ?? null,
      downloadCount: o.downloadCount ?? 0,
      downloadedAt: o.downloadedAt ?? null,
      downloadedBy: o.downloadedBy ?? null,
      items: (o.items ?? []).map((it) => ({
        sku: it.sku,
        productName: it.productName,
        unitOfMeasure: it.unitOfMeasure,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        discountPct: Number(it.discountPct),
        lineTotal: Number(it.lineTotal),
      })),
    };
  }

  /**
   * Lista los pedidos que ya se subieron a Siesa (SYNCED) y que no están
   * rebotados ni anulados, para que el administrador los pueda descargar.
   */
  async listDownloadable(companyId: string): Promise<DownloadableOrder[]> {
    if (!isValidCompany(companyId)) {
      throw new BadRequestException('Compañía inválida.');
    }
    const orders = await this.ordersRepository.find({
      where: { companyId, status: OrderStatus.SYNCED },
      order: { orderNumber: 'ASC' },
    });

    return orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customer?.name ?? '',
      customerCode: o.customer?.code ?? '',
      sellerName: o.seller?.name ?? '',
      total: Number(o.total),
      siesaEstado: o.siesaEstado,
      createdAt: o.createdAt,
      downloadedAt: o.downloadedAt ?? null,
    }));
  }

  /**
   * Genera un único PDF con los pedidos seleccionados y los marca como
   * descargados (estado propio del módulo). Se puede volver a descargar.
   */
  async downloadPdf(
    companyId: string,
    orderIds: string[],
    downloadedBy?: string,
  ): Promise<Buffer> {
    if (!isValidCompany(companyId)) {
      throw new BadRequestException('Compañía inválida.');
    }
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      throw new BadRequestException('Debes seleccionar al menos un pedido.');
    }

    const orders = await this.ordersRepository.find({
      where: {
        id: In(orderIds),
        companyId,
        status: OrderStatus.SYNCED,
      },
      order: { orderNumber: 'ASC' },
    });

    if (orders.length === 0) {
      throw new BadRequestException(
        'No se encontraron pedidos válidos para descargar.',
      );
    }

    const pdf = await buildOrdersPdf(orders);

    // Marca los pedidos como descargados (se puede repetir la descarga).
    const ids = orders.map((o) => o.id);
    const now = new Date();
    await this.ordersRepository.update(
      { id: In(ids) },
      { downloadedAt: now, downloadedBy: downloadedBy ?? undefined },
    );
    await this.ordersRepository.increment({ id: In(ids) }, 'downloadCount', 1);

    return pdf;
  }
}
