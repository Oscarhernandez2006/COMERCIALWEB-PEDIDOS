import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/** Detalle de un producto (tipo comercial) dentro de una factura TAT. */
export interface TatInvoiceProduct {
  tipo: string;
  quantity: number;
  subtotal: number;
}

/**
 * Factura TAT (Siesa) descargada para despacho en Drivin. Una fila por
 * CONSECUTIVO (nro_documento), agregando sus líneas (corte/canal/subproducto).
 * `selected` indica si está marcada para despachar. Aislada por compañía.
 */
@Entity('dispatch_tat_invoice')
@Unique('uq_dispatch_tat_company_invoice', ['companyId', 'invoiceNumber'])
export class DispatchTatInvoice extends BaseEntity {
  @Index()
  @Column({ name: 'company_id' })
  companyId: string;

  /** Consecutivo de la factura (nro_documento). Clave del negocio. */
  @Index()
  @Column({ name: 'invoice_number' })
  invoiceNumber: string;

  /** Fecha del documento (YYYY-MM-DD). */
  @Index()
  @Column({ name: 'document_date', type: 'date' })
  documentDate: string;

  /** Código/NIT del cliente (cliente_factura). */
  @Column({ name: 'client_code' })
  clientCode: string;

  /** Razón social del cliente. */
  @Column({ name: 'client_name' })
  clientName: string;

  /** Código de la sucursal del cliente (codigo_sucursal). */
  @Column({ name: 'branch_code', type: 'varchar', nullable: true })
  branchCode: string | null;

  /** Descripción/nombre de la sucursal (descripcion_sucursal). */
  @Column({ name: 'branch_name', type: 'varchar', nullable: true })
  branchName: string | null;

  /** Dirección de la sucursal (direccion_sucursal). */
  @Column({ name: 'branch_address', type: 'varchar', nullable: true })
  branchAddress: string | null;

  /** Tipos comerciales presentes en la factura (p. ej. "CORTE, SUBPRODUCTO"). */
  @Column({ name: 'tipo_comercial', type: 'varchar', nullable: true })
  tipoComercial: string | null;

  /** Cantidad inventario total (kilos) de la factura. */
  @Column({ name: 'quantity', type: 'numeric', precision: 16, scale: 2, default: 0 })
  quantity: number;

  /** Valor subtotal total de la factura (pesos). */
  @Column({ name: 'subtotal', type: 'numeric', precision: 16, scale: 2, default: 0 })
  subtotal: number;

  /** Detalle por producto (tipo comercial) con su kg y valor. */
  @Column({ name: 'products', type: 'jsonb', nullable: true })
  products: TatInvoiceProduct[] | null;

  /** Si la factura está marcada para despacho (borrador, autoguardado). */
  @Column({ name: 'selected', type: 'boolean', default: false })
  selected: boolean;

  /**
   * Si la factura está PUBLICADA: solo las publicadas viajan por la API pública.
   * Se fija con el botón "Guardar" (confirma el borrador `selected`).
   */
  @Column({ name: 'published', type: 'boolean', default: false })
  published: boolean;
}
