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
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('orders')
@Unique('uq_order_company_number', ['companyId', 'orderNumber'])
export class Order extends BaseEntity {
  /** Compañía a la que pertenece el pedido (aislamiento por tenant). */
  @Index()
  @Column({ name: 'company_id' })
  companyId: string;

  /** Consecutivo interno legible (por compañía, empieza en 000001). */
  @Column({ name: 'order_number' })
  orderNumber: string;

  @ManyToOne(() => ClientRecord, { eager: true, nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer: ClientRecord;

  @ManyToOne(() => User, { eager: true, nullable: false })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
    eager: true,
  })
  items: OrderItem[];

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.DRAFT })
  status: OrderStatus;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  taxes: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  total: number;

  @Column({ nullable: true })
  notes?: string;

  /** Motivo de la anulación (obligatorio al anular el pedido). */
  @Column({ name: 'cancel_reason', nullable: true })
  cancelReason?: string;

  /** Numero del documento generado en Siesa tras la sincronizacion. */
  @Column({ name: 'siesa_document_id', nullable: true })
  siesaDocumentId?: string;

  @Column({ name: 'sync_error', nullable: true })
  syncError?: string;
}
