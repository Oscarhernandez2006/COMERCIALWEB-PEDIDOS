import { Column, Entity, Index, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Ítem de una lista de precios sincronizado desde el ERP Siesa.
 *
 * Aislado por compañía: cada compañía tiene sus propias listas.
 * Una lista (listCode) agrupa muchas referencias con su precio.
 */
@Entity('price_list_items')
@Unique('uq_price_list_company_list_ref', ['companyId', 'listCode', 'reference'])
export class PriceListItem extends BaseEntity {
  /** Compañía propietaria del registro (aislamiento por tenant). */
  @Index()
  @Column({ name: 'company_id' })
  companyId: string;

  /** Código de la lista de precios (LISTA_PRECIO, p. ej. "001"). */
  @Index()
  @Column({ name: 'list_code' })
  listCode: string;

  /** Nombre de la lista (DESC_LISTA, p. ej. "LISTA GENERAL"). */
  @Column({ name: 'list_name' })
  listName: string;

  /** Referencia del producto (REFERENCIA). */
  @Index()
  @Column()
  reference: string;

  /** Nombre del producto (PRODUCTO). */
  @Column({ name: 'product_name' })
  productName: string;

  /** Unidad de medida (UM, p. ej. "KG"). */
  @Column({ name: 'unit_of_measure', nullable: true })
  unitOfMeasure?: string;

  /** Precio del producto en la lista (PRECIO). */
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  price: number;
}
