import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Producto/articulo sincronizado desde Siesa.
 *
 * Aislado por compañía: el catálogo de cada compañía es independiente.
 */
@Entity('products')
@Unique('uq_product_company_siesa', ['companyId', 'siesaId'])
export class Product extends BaseEntity {
  /** Compañía propietaria del registro (aislamiento por tenant). */
  @Index()
  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ name: 'siesa_id' })
  siesaId: string;

  @Index()
  @Column()
  sku: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  category?: string;

  /**
   * Tipo de inventario: 'corte' (normal) o 'subproducto'. Permite manejar dos
   * inventarios independientes dentro de la misma compañía (p. ej. MONTERIA TAT
   * AGROPECUARIA tiene su inventario de cortes y otro de subproductos).
   */
  @Index()
  @Column({ default: 'corte' })
  type: string;

  @Column({ name: 'unit_of_measure', nullable: true })
  unitOfMeasure?: string;

  @Column({ name: 'base_price', type: 'numeric', precision: 14, scale: 2, default: 0 })
  basePrice: number;

  @Column({ name: 'tax_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  taxRate: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  stock: number;

  @Column({ default: true })
  active: boolean;
}
