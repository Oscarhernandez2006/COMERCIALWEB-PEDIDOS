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
  PENDING_APPROVAL = 'pending_approval',
  CONFIRMED = 'confirmed',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  DISAPPROVED = 'disapproved',
  EXPIRED = 'expired',
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

  /**
   * Horario y días en que el cliente puede recibir la mercancía
   * (p. ej. "Lunes a viernes de 7 am a 5 pm").
   */
  @Column({ name: 'delivery_schedule', nullable: true })
  deliverySchedule?: string;

  /** Motivo de la anulación (obligatorio al anular el pedido). */
  @Column({ name: 'cancel_reason', nullable: true })
  cancelReason?: string;

  /**
   * Saldo de cartera del cliente al momento de crear el pedido. Si es mayor a
   * 0, el pedido queda PENDING_APPROVAL (retenido para aprobación en cartera).
   */
  @Column({
    name: 'cartera_balance',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
  })
  carteraBalance?: number;

  /**
   * Fecha límite para aprobar/desaprobar el pedido retenido por cartera.
   * Si se vence sin decisión, el pedido pasa a DISAPPROVED y se libera el stock.
   */
  @Column({ name: 'approval_deadline', type: 'timestamptz', nullable: true })
  approvalDeadline?: Date;

  /** Fecha en que cartera aprobó el pedido. */
  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date;

  /** Nombre de quien aprobó/desaprobó desde cartera. */
  @Column({ name: 'approved_by', nullable: true })
  approvedBy?: string;

  /** Motivo de la desaprobación (manual o por vencimiento del tiempo). */
  @Column({ name: 'disapproval_reason', nullable: true })
  disapprovalReason?: string;

  /**
   * Indica que cartera tomó una decisión (aprobó/desaprobó) sobre el pedido y
   * que el vendedor aún no ha sido notificado. El front lo consulta para
   * mostrar el aviso y luego lo marca como notificado.
   */
  @Column({ name: 'seller_notification_pending', default: false })
  sellerNotificationPending: boolean;

  /** Numero del documento generado en Siesa tras la sincronizacion. */
  @Column({ name: 'siesa_document_id', nullable: true })
  siesaDocumentId?: string;

  @Column({ name: 'sync_error', nullable: true })
  syncError?: string;
}
