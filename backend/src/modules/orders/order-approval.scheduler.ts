import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service';

/**
 * Tarea programada que, cada minuto, desaprueba automáticamente los pedidos
 * cuya ventana de aprobación en cartera (2 horas) ya venció y devuelve su
 * inventario al stock disponible.
 */
@Injectable()
export class OrderApprovalScheduler {
  private readonly logger = new Logger(OrderApprovalScheduler.name);

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
}
