import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service';

/**
 * Tareas programadas de pedidos:
 * - Cada minuto: desaprueba los pedidos cuya ventana de aprobación en cartera
 *   (2 horas) ya venció y devuelve su inventario al stock.
 * - Cada 10 segundos: sincroniza el estado contra Siesa (cambios de estado,
 *   anulaciones y rebotes) para mantener la trazabilidad de los pedidos al día.
 */
@Injectable()
export class OrderApprovalScheduler {
  private readonly logger = new Logger(OrderApprovalScheduler.name);

  /** Evita que dos ciclos de sincronización con Siesa se solapen si el ERP
   * responde lento (el tick cada 10s no se acumula). */
  private siesaSyncRunning = false;

  constructor(private readonly ordersService: OrdersService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async expireOverdueApprovals(): Promise<void> {
    try {
      await this.ordersService.expireOverdueApprovals();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al vencer aprobaciones de cartera: ${message}`);
    }
  }

  /**
   * Cada 10 segundos sincroniza el estado de los pedidos contra Siesa: detecta
   * cambios de estado (avisa al vendedor), anulaciones (anula y devuelve el
   * stock) y rebotes (el consecutivo no aparece en el ERP). Los pedidos que ya
   * llegaron a su estado final (Despachado) se excluyen y no se vuelven a
   * consultar.
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async syncSiesaStatuses(): Promise<void> {
    // Si el ciclo anterior aún no termina (ERP lento), se omite este tick para
    // no encadenar consultas ni duplicar trabajo.
    if (this.siesaSyncRunning) return;
    this.siesaSyncRunning = true;
    try {
      await this.ordersService.syncSiesaStatuses();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al sincronizar estados de Siesa: ${message}`);
    } finally {
      this.siesaSyncRunning = false;
    }
  }
}
