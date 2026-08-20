import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Costo estándar de un producto (por kilo) que carga el administrador, para
 * calcular la rentabilidad (venta − costo) en el tablero comercial.
 *
 * Aislado por compañía. La referencia (`referencia` del ERP) es la clave.
 */
@Entity('product_costs')
@Unique('uq_product_cost_company_ref', ['companyId', 'productRef'])
export class ProductCost extends BaseEntity {
  /** Compañía propietaria del costo (aislamiento por tenant). */
  @Index()
  @Column({ name: 'company_id' })
  companyId: string;

  /** Referencia del producto (referencia del ERP). */
  @Index()
  @Column({ name: 'product_ref' })
  productRef: string;

  /** Nombre/descripción del producto (opcional). */
  @Column({ nullable: true })
  name?: string;

  /** Costo estándar por kilo (pesos). */
  @Column({
    name: 'unit_cost',
    type: 'numeric',
    precision: 16,
    scale: 2,
    default: 0,
  })
  unitCost: number;
}
