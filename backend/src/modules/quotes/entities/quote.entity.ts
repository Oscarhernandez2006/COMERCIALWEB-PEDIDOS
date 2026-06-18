import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ClientRecord } from '../../clients/entities/client-record.entity';
import { User } from '../../users/entities/user.entity';
import { QuoteItem } from './quote-item.entity';

@Entity('quotes')
@Unique('uq_quote_company_number', ['companyId', 'quoteNumber'])
export class Quote extends BaseEntity {
  /** Compañía a la que pertenece la cotización (aislamiento por tenant). */
  @Index()
  @Column({ name: 'company_id' })
  companyId: string;

  /** Consecutivo interno legible (por compañía, empieza en 000001). */
  @Column({ name: 'quote_number' })
  quoteNumber: string;

  @ManyToOne(() => ClientRecord, { eager: true, nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: ClientRecord;

  @ManyToOne(() => User, { eager: true, nullable: false })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @OneToMany(() => QuoteItem, (item) => item.quote, {
    cascade: true,
    eager: true,
  })
  items: QuoteItem[];

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  taxes: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  total: number;

  @Column({ nullable: true })
  notes?: string;

  /** Días de vigencia de la cotización (por defecto 15). */
  @Column({ name: 'validity_days', type: 'int', default: 15 })
  validityDays: number;

  /** Fecha hasta la cual la cotización es válida. */
  @Column({ name: 'valid_until', type: 'timestamptz', nullable: true })
  validUntil?: Date;
}
