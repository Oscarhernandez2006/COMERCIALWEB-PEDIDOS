import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';

/**
 * Relacion usuario <-> compañía.
 *
 * Un vendedor puede existir en una compañía y no en otra, y tener un
 * codigo de vendedor (siesa) distinto en cada una. Esta tabla resuelve
 * ese mapeo y controla a que compañías puede entrar cada usuario.
 */
@Entity('user_companies')
@Unique('uq_user_company', ['userId', 'companyId'])
export class UserCompany extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** Compañía a la que el usuario tiene acceso. */
  @Column({ name: 'company_id' })
  companyId: string;

  /** Codigo de vendedor en Siesa para esta compañía (puede diferir entre compañías). */
  @Column({ name: 'siesa_seller_code', nullable: true })
  siesaSellerCode?: string;

  /**
   * Módulos que el usuario puede ver EN ESTA compañía (rutas del front, p. ej.
   * "/pedidos", "/admin/inventario"). Si está vacío, ve todos los módulos de su
   * rol en esta compañía (compatibilidad). Permite, por ejemplo, dar Inventario
   * solo en una compañía y no en otra.
   */
  @Column({ name: 'permissions', type: 'jsonb', default: () => "'[]'" })
  permissions: string[];

  @Column({ default: true })
  active: boolean;
}
