import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Estados del flujo de un pedido de canales:
 *  1. PENDING_CONTROL  → creado por el vendedor, espera revisión del controlador (Zulma).
 *  2. PENDING_CARTERA  → aprobado por el controlador, espera validación de cupo en cartera.
 *  3. REJECTED         → cartera rechazó el pedido por cupo (se notifica al vendedor).
 *  4. PENDING_DISPATCH → cartera aprobó, espera despacho (remisión + Frigo App).
 *  5. DISPATCHED       → despacho generó la remisión y relacionó el documento de Frigo App.
 *  6. SYNCING/SYNCED   → se envió el pedido + remisión a Siesa.
 *  7. FAILED           → falló el envío a Siesa (se puede reintentar).
 *  8. CANCELLED        → anulado.
 */
export enum CanalOrderStatus {
  PENDING_CONTROL = 'pending_control',
  PENDING_CARTERA = 'pending_cartera',
  REJECTED = 'rejected',
  PENDING_DISPATCH = 'pending_dispatch',
  DISPATCHED = 'dispatched',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/** Línea (ítem) de un pedido de canal. */
export interface CanalOrderItem {
  /** Referencia del ítem de canal (p. ej. 2003, 1980, 1981). */
  itemRef: string;
  /** Nombre del ítem (p. ej. CANAL DE CERDO). */
  itemName: string;
  /** Especie derivada del ítem (CERDO / RES). */
  especie: string;
  /** Cantidad de unidades (animales) pedidas. */
  quantity: number;
  /** Peso aproximado por unidad (kg) usado para sugerir unidades desde los kg. */
  approxWeightKg: number;
  /** Kilos estimados de la línea (quantity * approxWeightKg). Se factura por kg. */
  estimatedKg: number;
  /** Especificaciones / novedades que digita el vendedor. */
  specifications: string;
  /** Precio negociado POR KILO que digita el vendedor. */
  price: number;
  /** Flete (opcional). */
  freight: number;
}

/**
 * Pedido de canales. Se toma por unidades (animales) pero se factura por kilos.
 * Recorre un flujo: vendedor → controlador → cartera → despacho → Siesa.
 */
@Entity('canal_orders')
export class CanalOrder extends BaseEntity {
  /** Compañía a la que pertenece el pedido. */
  @Index()
  @Column({ name: 'company_id' })
  companyId: string;

  /** Número consecutivo del pedido dentro de la compañía. */
  @Column({ name: 'order_number', type: 'int', default: 0 })
  orderNumber: number;

  /** Estado dentro del flujo del pedido. */
  @Index()
  @Column({
    type: 'enum',
    enum: CanalOrderStatus,
    default: CanalOrderStatus.PENDING_CONTROL,
  })
  status: CanalOrderStatus;

  /** Vendedor que digita el pedido (users.id). */
  @Index()
  @Column({ name: 'seller_id' })
  sellerId: string;

  /** Nombre del vendedor (para el consolidado). */
  @Column({ name: 'seller_name' })
  sellerName: string;

  /** Fecha de despacho del pedido. */
  @Column({ name: 'dispatch_date', type: 'date' })
  dispatchDate: string;

  /** NIT / código del cliente. */
  @Column({ name: 'client_code' })
  clientCode: string;

  /** Nombre del cliente. */
  @Column({ name: 'client_name' })
  clientName: string;

  /** Dirección del cliente. */
  @Column({ name: 'client_address', nullable: true })
  clientAddress?: string;

  /** Ciudad del cliente. */
  @Column({ name: 'client_city', nullable: true })
  clientCity?: string;

  /** Sucursal del cliente (para el ERP). */
  @Column({ name: 'client_branch', nullable: true })
  clientBranch?: string;

  /** Condición de pago del cliente (para el ERP). */
  @Column({ name: 'client_payment_term', nullable: true })
  clientPaymentTerm?: string;

  /** Líneas del pedido (ítems de canal). */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  items: CanalOrderItem[];

  /** Kilos totales estimados del pedido. */
  @Column({
    name: 'total_kg',
    type: 'numeric',
    precision: 14,
    scale: 3,
    default: 0,
  })
  totalKg: number;

  /** Valor total del pedido (kg × precio/kg + fletes). */
  @Column({
    name: 'total_value',
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
  })
  totalValue: number;

  /* -------------------- Control (Zulma) -------------------- */

  /** Nota/observación del controlador. */
  @Column({ name: 'control_note', nullable: true })
  controlNote?: string;

  /** Usuario que aprobó en control. */
  @Column({ name: 'controlled_by', nullable: true })
  controlledBy?: string;

  /** Momento de la aprobación de control. */
  @Column({ name: 'controlled_at', type: 'timestamptz', nullable: true })
  controlledAt?: Date;

  /* -------------------- Cartera (cupo) -------------------- */

  /** Nota de cartera. */
  @Column({ name: 'cartera_note', nullable: true })
  carteraNote?: string;

  /** Usuario de cartera que resolvió el pedido. */
  @Column({ name: 'cartera_by', nullable: true })
  carteraBy?: string;

  /** Momento de la decisión de cartera. */
  @Column({ name: 'cartera_at', type: 'timestamptz', nullable: true })
  carteraAt?: Date;

  /** Cupo autorizado del cliente al momento de validar. */
  @Column({
    name: 'credit_limit',
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
  })
  creditLimit: number;

  /** Saldo ya facturado (cartera) del cliente al momento de validar. */
  @Column({
    name: 'invoiced_balance',
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
  })
  invoicedBalance: number;

  /** Total de pedidos sin facturar del cliente al momento de validar. */
  @Column({
    name: 'pending_orders_total',
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: 0,
  })
  pendingOrdersTotal: number;

  /** Motivo del rechazo de cartera (se muestra al vendedor). */
  @Column({ name: 'rejection_reason', nullable: true })
  rejectionReason?: string;

  /* -------------------- Despacho / Frigo App -------------------- */

  /** Número de remisión generado en despacho. */
  @Column({ name: 'remision_number', nullable: true })
  remisionNumber?: string;

  /** ID del documento de Frigo App (orden de compra), clave para relacionar. */
  @Index()
  @Column({ name: 'frigo_app_id', nullable: true })
  frigoAppId?: string;

  /** Kilos reales que trae el documento de Frigo App. */
  @Column({
    name: 'frigo_kg',
    type: 'numeric',
    precision: 14,
    scale: 3,
    nullable: true,
  })
  frigoKg?: number;

  /** Ganchos que trae el documento de Frigo App. */
  @Column({ name: 'frigo_ganchos', type: 'int', nullable: true })
  frigoGanchos?: number;

  /** PDF de Frigo App relacionado (base64). */
  @Column({ name: 'frigo_pdf_base64', type: 'text', nullable: true })
  frigoPdfBase64?: string;

  /** Nombre original del PDF de Frigo App. */
  @Column({ name: 'frigo_pdf_name', nullable: true })
  frigoPdfName?: string;

  /** Usuario de despacho. */
  @Column({ name: 'dispatched_by', nullable: true })
  dispatchedBy?: string;

  /** Momento del despacho. */
  @Column({ name: 'dispatched_at', type: 'timestamptz', nullable: true })
  dispatchedAt?: Date;

  /* -------------------- Siesa -------------------- */

  /** Consecutivo real que asignó Siesa. */
  @Column({ name: 'siesa_document_id', nullable: true })
  siesaDocumentId?: string;

  /** Momento del envío a Siesa. */
  @Column({ name: 'synced_at', type: 'timestamptz', nullable: true })
  syncedAt?: Date;

  /** Error del último envío a Siesa. */
  @Column({ name: 'sync_error', nullable: true })
  syncError?: string;

  /** Hay un aviso pendiente para el vendedor (decisión de cartera). */
  @Column({ name: 'seller_notification_pending', default: false })
  sellerNotificationPending: boolean;
}
