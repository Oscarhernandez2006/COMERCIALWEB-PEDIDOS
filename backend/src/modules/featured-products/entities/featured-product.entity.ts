import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Producto marcado como "estrella / favorito del día" para una compañía. El
 * administrador marca uno o varios; a los vendedores se les prioriza y avisa
 * al crear un pedido si no lo incluyeron.
 */
@Entity('featured_product')
@Unique('uq_featured_company_sku', ['companyId', 'sku'])
export class FeaturedProduct extends BaseEntity {
  @Index()
  @Column({ name: 'company_id' })
  companyId: string;

  @Index()
  @Column()
  sku: string;

  @Column()
  name: string;
}
