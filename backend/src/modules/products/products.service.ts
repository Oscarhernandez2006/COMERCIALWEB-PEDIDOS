import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { SiesaService } from '../siesa/siesa.service';
import { InventoryRow } from './inventory.parser';
import { PriceListsService } from '../price-lists/price-lists.service';

/**
 * Producto vendible para un cliente: proviene de su lista de precios (siempre
 * con precio y unidad de medida) y se enriquece con el stock del inventario.
 */
export interface SellableProduct {
  /** Referencia/SKU del producto. */
  sku: string;
  /** Nombre del producto. */
  name: string;
  /** Precio según la lista de precios del cliente. */
  price: number;
  /** Unidad de medida (KG, U, ...). */
  unitOfMeasure?: string;
  /** Existencia en inventario (0 si no está cargado). */
  stock: number;
  /** Tasa de IVA (%) del producto. El IVA se agrega solo para mostrarlo. */
  taxRate: number;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly siesaService: SiesaService,
    private readonly dataSource: DataSource,
    private readonly priceListsService: PriceListsService,
  ) {}

  findAll(companyId: string, search?: string): Promise<Product[]> {
    if (search) {
      return this.productsRepository.find({
        where: [
          { companyId, name: ILike(`%${search}%`), active: true },
          { companyId, sku: ILike(`%${search}%`), active: true },
        ],
        take: 100,
        order: { name: 'ASC' },
      });
    }
    return this.productsRepository.find({
      where: { companyId, active: true },
      take: 100,
      order: { name: 'ASC' },
    });
  }

  /**
   * Productos con existencias (stock > 0) de la compañía, sin importar lista de
   * precios. Es la disponibilidad real para la venta del día. Permite buscar
   * por nombre o SKU. Sin límite de cantidad (se usa para el listado y el PDF).
   */
  async findInStock(companyId: string, search?: string): Promise<Product[]> {
    const where = search
      ? [
          { companyId, name: ILike(`%${search}%`), active: true },
          { companyId, sku: ILike(`%${search}%`), active: true },
        ]
      : { companyId, active: true };
    const products = await this.productsRepository.find({
      where,
      order: { name: 'ASC' },
    });
    return products.filter((p) => Number(p.stock) > 0);
  }

  /**
   * Catálogo de venta para un cliente: parte de su lista de precios (cada
   * referencia trae nombre, precio y unidad de medida) y se cruza con el
   * inventario para mostrar el stock. Los que tienen stock se muestran
   * primero (prioridad), pero todos son vendibles.
   */
  async findSellableForList(
    companyId: string,
    listCode: string,
    search?: string,
  ): Promise<SellableProduct[]> {
    const items = await this.priceListsService.findItems(
      companyId,
      listCode,
      search,
    );

    const inventory = await this.productsRepository.find({
      where: { companyId, active: true },
      select: { sku: true, stock: true, taxRate: true },
    });
    const stockBySku = new Map(
      inventory.map((p) => [p.sku.trim(), Number(p.stock)]),
    );
    const taxBySku = new Map(
      inventory.map((p) => [p.sku.trim(), Number(p.taxRate)]),
    );

    const sellable: SellableProduct[] = items.map((item) => ({
      sku: item.reference.trim(),
      name: item.productName,
      price: Number(item.price),
      unitOfMeasure: item.unitOfMeasure,
      stock: stockBySku.get(item.reference.trim()) ?? 0,
      taxRate: taxBySku.get(item.reference.trim()) ?? 0,
    }));

    // Prioridad: primero los que tienen stock (mayor stock arriba), luego el
    // resto alfabéticamente.
    sellable.sort((a, b) => {
      const aHas = a.stock > 0 ? 1 : 0;
      const bHas = b.stock > 0 ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
      if (aHas === 1 && a.stock !== b.stock) return b.stock - a.stock;
      return a.name.localeCompare(b.name);
    });

    return sellable;
  }

  findBySiesaId(companyId: string, siesaId: string): Promise<Product | null> {
    return this.productsRepository.findOne({ where: { companyId, siesaId } });
  }

  /** Sincroniza el catalogo de una compañía desde Siesa (upsert por siesaId). */
  async syncFromSiesa(companyId: string): Promise<{ synced: number }> {
    const raws = await this.siesaService.fetchProducts(companyId);
    let synced = 0;

    for (const raw of raws) {
      if (!raw.f120_id) continue;
      const existing = await this.findBySiesaId(companyId, raw.f120_id);
      const product = this.productsRepository.merge(existing ?? new Product(), {
        companyId,
        siesaId: raw.f120_id,
        sku: raw.f120_referencia ?? raw.f120_id,
        name: raw.f120_descripcion ?? 'Sin nombre',
        category: raw.categoria,
        unitOfMeasure: raw.unidad_medida,
        basePrice: Number(raw.precio ?? 0),
        taxRate: Number(raw.iva ?? 0),
        stock: Number(raw.existencia ?? 0),
        active: raw.f120_ind_estado !== '0',
      });
      await this.productsRepository.save(product);
      synced++;
    }

    this.logger.log(
      `Productos sincronizados desde Siesa (compañía ${companyId}): ${synced}`,
    );
    return { synced };
  }

  /**
   * Reemplaza el inventario de una compañía con el de la plantilla Excel.
   *
   * - Los productos del Excel se insertan/actualizan (por referencia).
   * - Los que ya no están en el Excel se eliminan; si tienen pedidos
   *   asociados (FK), se desactivan en lugar de borrarse.
   * - El precio configurado se conserva por referencia (el Excel solo
   *   trae referencia, descripción y stock).
   */
  async replaceInventory(
    companyId: string,
    rows: InventoryRow[],
  ): Promise<{ total: number; created: number; updated: number; removed: number }> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Product);
      const existing = await repo.find({ where: { companyId } });
      const existingBySku = new Map(existing.map((p) => [p.sku, p]));
      const incomingSkus = new Set(rows.map((r) => r.reference));

      let created = 0;
      let updated = 0;

      for (const row of rows) {
        const prev = existingBySku.get(row.reference);
        if (prev) {
          prev.name = row.description;
          prev.stock = row.stock;
          prev.active = true;
          await repo.save(prev);
          updated++;
        } else {
          const product = repo.create({
            companyId,
            siesaId: row.reference,
            sku: row.reference,
            name: row.description,
            stock: row.stock,
            basePrice: 0,
            taxRate: 0,
            active: true,
          });
          await repo.save(product);
          created++;
        }
      }

      // Productos que ya no vienen en la plantilla.
      const obsolete = existing.filter((p) => !incomingSkus.has(p.sku));
      let removed = 0;
      for (const product of obsolete) {
        const refRows: Array<{ count: string }> = await manager.query(
          'SELECT COUNT(*)::int AS count FROM order_items WHERE product_id = $1',
          [product.id],
        );
        const referenced = Number(refRows[0]?.count ?? 0);

        if (referenced > 0) {
          // Tiene pedidos: no se puede borrar, se desactiva.
          product.active = false;
          await repo.save(product);
        } else {
          await repo.delete(product.id);
        }
        removed++;
      }

      this.logger.log(
        `Inventario reemplazado (compañía ${companyId}): ` +
          `${created} nuevos, ${updated} actualizados, ${removed} retirados.`,
      );

      return { total: rows.length, created, updated, removed };
    });
  }

  /** Edita únicamente el stock de un producto (única edición permitida en web). */
  async updateStock(
    companyId: string,
    id: string,
    stock: number,
  ): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id, companyId },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    product.stock = stock;
    return this.productsRepository.save(product);
  }
}
