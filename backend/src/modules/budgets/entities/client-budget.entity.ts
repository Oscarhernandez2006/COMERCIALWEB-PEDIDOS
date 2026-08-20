import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Presupuesto (meta) de un CLIENTE/tienda asignado a un vendedor, para un mes.
 *
 * Aplica a los vendedores que van "por tienda/cliente" (ver
 * BUDGET_APART_SELLER_DOCS, p. ej. Juan Sierra): su meta se reparte por cada
 * cliente asignado (CODIGO_VENDEDOR) en lugar de una única cifra. El total del
 * vendedor es la suma de estas filas y queda APARTE del presupuesto general.
 */
@Entity('client_budgets')
@Unique('uq_client_budget_company_seller_client_period', [
  'companyId',
  'sellerId',
  'clientCode',
  'month',
  'year',
])
export class ClientBudget extends BaseEntity {
  /** Compañía a la que aplica el presupuesto. */
  @Index()
  @Column({ name: 'company_id' })
  companyId: string;

  /** Vendedor (users.id) dueño de la cartera de clientes. */
  @Index()
  @Column({ name: 'seller_id' })
  sellerId: string;

  /** Código/NIT del cliente (client_records.code). */
  @Index()
  @Column({ name: 'client_code' })
  clientCode: string;

  /** Mes del presupuesto (1–12). */
  @Column({ type: 'int' })
  month: number;

  /** Año del presupuesto. */
  @Column({ type: 'int' })
  year: number;

  /** Kilos que debe vender el cliente en el mes. */
  @Column({
    name: 'target_kilos',
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
  })
  targetKilos: number;

  /** Valor esperado de venta del cliente en el mes (pesos). */
  @Column({
    name: 'expected_revenue',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  expectedRevenue: number;
}
