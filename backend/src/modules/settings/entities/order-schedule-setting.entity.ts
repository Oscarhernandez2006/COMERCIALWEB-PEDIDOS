import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Configuración (única, global) de la ventana horaria para crear pedidos.
 * Administrable desde el panel admin. Las horas/minutos están en horario de
 * Colombia (America/Bogota).
 */
@Entity('order_schedule_setting')
export class OrderScheduleSetting extends BaseEntity {
  /** Si está desactivado, no se aplica ninguna restricción de horario. */
  @Column({ name: 'enabled', type: 'boolean', default: true })
  enabled: boolean;

  /** Hora de apertura (0-23). */
  @Column({ name: 'open_hour', type: 'int', default: 7 })
  openHour: number;

  /** Minuto de apertura (0-59). */
  @Column({ name: 'open_minute', type: 'int', default: 0 })
  openMinute: number;

  /** Hora de cierre (0-23). */
  @Column({ name: 'close_hour', type: 'int', default: 16 })
  closeHour: number;

  /** Minuto de cierre (0-59). */
  @Column({ name: 'close_minute', type: 'int', default: 30 })
  closeMinute: number;
}
