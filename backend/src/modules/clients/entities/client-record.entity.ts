import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Horario de recibido de mercancía configurado para un cliente.
 * Los días se representan como índices 0=Lunes … 6=Domingo y las horas en
 * formato de 24 horas "HH:mm".
 */
export interface DeliverySchedule {
  /** Días seleccionados (0=Lunes … 6=Domingo). */
  days: number[];
  /** Hora inicial en formato "HH:mm". */
  hourFrom: string;
  /** Hora final en formato "HH:mm". */
  hourTo: string;
}

/**
 * Cliente sincronizado desde el endpoint `clientes-por-cia` del Grupo Santacruz.
 *
 * Aislado por compañía: cada compañía tiene sus propios clientes.
 * El mismo código puede existir en varias sucursales (SUCURSAL), por eso la
 * clave única incluye la sucursal.
 */
@Entity('client_records')
@Unique('uq_client_company_code_branch', ['companyId', 'code', 'branch'])
export class ClientRecord extends BaseEntity {
  /** Compañía propietaria del registro (aislamiento por tenant). */
  @Index()
  @Column({ name: 'company_id' })
  companyId: string;

  /** Código / NIT del cliente (CODIGO). */
  @Index()
  @Column()
  code: string;

  /** Nombre del cliente (TERCERO). */
  @Index()
  @Column()
  name: string;

  /** Sucursal del cliente (SUCURSAL, p. ej. "001"). */
  @Column({ default: '001' })
  branch: string;

  /** Nombre/descripción de la sucursal (NOMBRE_SUCURSAL). */
  @Column({ name: 'branch_name', nullable: true })
  branchName?: string;

  /** Lista de precios asignada (LISTA_PRECIO). */
  @Column({ name: 'price_list', nullable: true })
  priceList?: string;

  /** Condición de pago (COND_PAGO, p. ej. "30D", "CON"). */
  @Column({ name: 'payment_term', nullable: true })
  paymentTerm?: string;

  /** Código del vendedor asignado (CODIGO_VENDEDOR). */
  @Index()
  @Column({ name: 'seller_code', nullable: true })
  sellerCode?: string;

  /** Dirección (DIRECCION). */
  @Column({ nullable: true })
  address?: string;

  /** Barrio (BARRIO). */
  @Column({ nullable: true })
  neighborhood?: string;

  /** Ciudad o municipio (CIUDAD_MUNICIPIO). */
  @Column({ nullable: true })
  city?: string;

  /** Departamento (DEPARTAMENTO). */
  @Column({ nullable: true })
  department?: string;

  /** Celular (CELULAR). */
  @Column({ nullable: true })
  phone?: string;

  /** Correo electrónico (EMAIL). */
  @Column({ nullable: true })
  email?: string;

  /**
   * Horario de recibido de mercancía del cliente. Lo configura el vendedor al
   * crear un pedido y queda predeterminado (editable) para los siguientes.
   * Se conserva entre sincronizaciones (el upsert no lo sobreescribe).
   */
  @Column({ name: 'delivery_schedule', type: 'jsonb', nullable: true })
  deliverySchedule?: DeliverySchedule;

  /**
   * Nombre de la lista de precios (DESC_LISTA), resuelto desde
   * price_list_items. No se persiste; se llena al consultar los clientes.
   */
  priceListName?: string;

  /**
   * Nombre del vendedor, resuelto desde los usuarios por código de vendedor.
   * No se persiste; se llena al consultar los clientes.
   */
  sellerName?: string;
}
