import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/** Línea (ítem) de un pedido de canal. */
export interface CanalOrderItem {
  /** Referencia del ítem de canal (p. ej. 2003, 1980, 1981). */
  itemRef: string;
  /** Nombre del ítem (p. ej. CANAL DE CERDO). */
  itemName: string;
  /** Especie derivada del ítem (CERDO / RES). */
  especie: string;
  /** Cantidad pedida. */
  quantity: number;
  /** Especificaciones / novedades que digita el vendedor. */
  specifications: string;
  /** Precio negociado (por unidad) que digita el vendedor. */
  price: number;
  /** Flete (opcional). */
  freight: number;
}

/**
 * Pedido de canales (recepción manual). No se sube al ERP ni maneja inventario:
 * es un registro interno de lo pedido, del que se genera un consolidado en PDF.
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

  /** Líneas del pedido (ítems de canal). */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  items: CanalOrderItem[];
}
