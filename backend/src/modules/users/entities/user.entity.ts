import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum UserRole {
  ADMIN = 'admin',
  SELLER = 'seller',
}

@Entity('users')
export class User extends BaseEntity {
  /** Cedula / documento de identidad. Se usa para iniciar sesion. */
  @Index({ unique: true })
  @Column({ name: 'document_id' })
  documentId: string;

  @Index({ unique: true })
  @Column({ nullable: true })
  email?: string;

  @Column()
  name: string;

  /** Hash bcrypt. Nunca se expone en respuestas (ver class-transformer). */
  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.SELLER })
  role: UserRole;

  /** Codigo del vendedor en Siesa, para asociar pedidos. */
  @Column({ name: 'siesa_seller_code', nullable: true })
  siesaSellerCode?: string;

  @Column({ default: true })
  active: boolean;
}
