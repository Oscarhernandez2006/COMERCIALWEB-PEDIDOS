import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';

@Entity('order_items')
export class OrderItem extends BaseEntity {
  @ManyToOne(() => Order, (order) => order.items, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  /**
   * Producto del inventario (si existe). Es opcional porque el catálogo de
   * venta proviene de la lista de precios del cliente, que puede tener
   * referencias aún no cargadas en el inventario.
   */
  @ManyToOne(() => Product, { eager: true, nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: Product | null;

  /** Referencia/SKU del producto (snapshot al momento de la venta). */
  @Column()
  sku: string;

  /** Nombre del producto (snapshot al momento de la venta). */
  @Column({ name: 'product_name' })
  productName: string;

  /** Unidad de medida del producto (KG, U, ...). */
  @Column({ name: 'unit_of_measure', nullable: true })
  unitOfMeasure?: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 14, scale: 2 })
  unitPrice: number;

  @Column({ name: 'discount_pct', type: 'numeric', precision: 5, scale: 2, default: 0 })
  discountPct: number;

  @Column({ name: 'tax_rate', type: 'numeric', precision: 5, scale: 2, default: 0 })
  taxRate: number;

  @Column({ name: 'line_total', type: 'numeric', precision: 14, scale: 2 })
  lineTotal: number;
}
