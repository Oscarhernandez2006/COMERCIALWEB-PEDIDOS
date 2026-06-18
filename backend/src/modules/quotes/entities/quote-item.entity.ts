import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Quote } from './quote.entity';

@Entity('quote_items')
export class QuoteItem extends BaseEntity {
  @ManyToOne(() => Quote, (quote) => quote.items, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'quote_id' })
  quote: Quote;

  @Column()
  sku: string;

  @Column({ name: 'product_name' })
  productName: string;

  @Column({ name: 'unit_of_measure', nullable: true })
  unitOfMeasure?: string;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 14, scale: 2 })
  unitPrice: number;

  @Column({
    name: 'discount_pct',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
  })
  discountPct: number;

  @Column({
    name: 'tax_rate',
    type: 'numeric',
    precision: 5,
    scale: 2,
    default: 0,
  })
  taxRate: number;

  @Column({ name: 'line_total', type: 'numeric', precision: 14, scale: 2 })
  lineTotal: number;
}
