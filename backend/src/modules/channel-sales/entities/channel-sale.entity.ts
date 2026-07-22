import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Venta por canal registrada históricamente (una fila por registro del ERP en
 * un día). Se usa para reportes de ventas diarias por canal y por vendedor.
 *
 * Los datos se reemplazan por día al sincronizar, así que reflejan el estado
 * más reciente del ERP para esa fecha.
 */
@Entity('channel_sales')
@Index(['companyId', 'saleDate'])
@Index(['sellerCode'])
export class ChannelSale extends BaseEntity {
  /** Compañía a la que pertenece la venta. */
  @Column({ name: 'company_id' })
  companyId: string;

  /** Fecha de la venta (YYYY-MM-DD, hora Colombia). */
  @Column({ name: 'sale_date', type: 'date' })
  saleDate: string;

  /** Código del vendedor (cédula, = codigo_vendedor del ERP). */
  @Column({ name: 'seller_code' })
  sellerCode: string;

  /** Nombre del vendedor (razon_social_vendedor). */
  @Column({ name: 'seller_name', nullable: true })
  sellerName?: string;

  /** Referencia/SKU del producto (referencia). */
  @Column({ nullable: true })
  reference?: string;

  /** Canal / descripción del producto (descripcion). */
  @Column()
  channel: string;

  /** Kilos vendidos (cantidad). */
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  kilos: number;

  /** Valor neto de la venta (valor_neto). */
  @Column({ type: 'numeric', precision: 16, scale: 2, default: 0 })
  revenue: number;
}
