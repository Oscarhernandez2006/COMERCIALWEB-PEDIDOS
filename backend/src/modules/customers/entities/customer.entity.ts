import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Cliente. Se sincroniza desde Siesa pero se cachea localmente
 * para permitir trabajo offline y busquedas rapidas.
 *
 * Aislado por compañía: el mismo siesaId puede existir en compañías
 * distintas como registros independientes.
 */
@Entity('customers')
@Unique('uq_customer_company_siesa', ['companyId', 'siesaId'])
export class Customer extends BaseEntity {
  /** Compañía propietaria del registro (aislamiento por tenant). */
  @Index()
  @Column({ name: 'company_id' })
  companyId: string;

  /** Identificador del cliente en Siesa (tercero). */
  @Column({ name: 'siesa_id' })
  siesaId: string;

  @Column()
  nit: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  city?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  /** Lista de precios asignada en Siesa. */
  @Column({ name: 'price_list', nullable: true })
  priceList?: string;

  @Column({ name: 'credit_limit', type: 'numeric', precision: 14, scale: 2, default: 0 })
  creditLimit: number;

  @Column({ default: true })
  active: boolean;
}
