import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Presupuesto (meta) de un vendedor en una compañía para un mes concreto.
 *
 * Un mismo vendedor puede tener presupuestos distintos en cada compañía, por
 * eso la clave única combina compañía + vendedor + mes + año.
 */
@Entity('budgets')
@Unique('uq_budget_company_seller_period', [
  'companyId',
  'sellerId',
  'month',
  'year',
])
export class Budget extends BaseEntity {
  /** Compañía a la que aplica el presupuesto. */
  @Index()
  @Column({ name: 'company_id' })
  companyId: string;

  /** Vendedor (users.id) dueño del presupuesto. */
  @Index()
  @Column({ name: 'seller_id' })
  sellerId: string;

  /** Mes del presupuesto (1–12). */
  @Column({ type: 'int' })
  month: number;

  /** Año del presupuesto. */
  @Column({ type: 'int' })
  year: number;

  /** Kilos que debe vender en el mes. */
  @Column({
    name: 'target_kilos',
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
  })
  targetKilos: number;

  /** Valor esperado de venta en el mes (pesos). */
  @Column({
    name: 'expected_revenue',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  expectedRevenue: number;
}
