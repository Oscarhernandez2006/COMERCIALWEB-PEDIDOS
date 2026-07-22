import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/** Modo de asignación de la proyección de ventas. */
export type ProjectionMode = 'month' | 'day';

/**
 * Proyección de ventas (kilos y pesos) de una COMPAÑÍA para un mes concreto.
 *
 * A diferencia del presupuesto (que es por vendedor), la proyección es única
 * por compañía y mes: una misma para todos los vendedores de esa compañía.
 *
 * Puede asignarse de dos formas excluyentes:
 *  - `month`: se ingresa el total proyectado del mes directamente.
 *  - `day`: se ingresa el valor de un día hábil y el total del mes se obtiene
 *    multiplicándolo por la cantidad de días hábiles seleccionados.
 */
@Entity('projections')
@Unique('uq_projection_company_period', ['companyId', 'month', 'year'])
export class Projection extends BaseEntity {
  /** Compañía a la que aplica la proyección. */
  @Index()
  @Column({ name: 'company_id' })
  companyId: string;

  /** Mes de la proyección (1–12). */
  @Column({ type: 'int' })
  month: number;

  /** Año de la proyección. */
  @Column({ type: 'int' })
  year: number;

  /** Modo de asignación: 'month' (total del mes) o 'day' (por día hábil). */
  @Column({ type: 'varchar', length: 10, default: 'month' })
  mode: ProjectionMode;

  /** Valor en pesos: total del mes (modo month) o de un día hábil (modo day). */
  @Column({
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  revenue: number;

  /** Valor en kilos: total del mes (modo month) o de un día hábil (modo day). */
  @Column({
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
  })
  kilos: number;

  /** Días hábiles seleccionados en el calendario (fechas 'YYYY-MM-DD'). */
  @Column({ name: 'working_days', type: 'jsonb', nullable: true })
  workingDays: string[] | null;
}
