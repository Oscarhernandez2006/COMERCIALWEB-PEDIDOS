import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { PriceListItem } from './entities/price-list-item.entity';
import { PriceListsClient, PriceListRaw } from './price-lists.client';

/** Resumen de una lista de precios (sin sus ítems). */
export interface PriceListSummary {
  listCode: string;
  listName: string;
  itemCount: number;
}

@Injectable()
export class PriceListsService {
  private readonly logger = new Logger(PriceListsService.name);

  constructor(
    @InjectRepository(PriceListItem)
    private readonly repository: Repository<PriceListItem>,
    private readonly client: PriceListsClient,
    private readonly dataSource: DataSource,
  ) {}

  /** Lista los nombres de las listas de precios de una compañía. */
  async findLists(companyId: string): Promise<PriceListSummary[]> {
    const rows = await this.repository
      .createQueryBuilder('i')
      .select('i.list_code', 'listCode')
      .addSelect('i.list_name', 'listName')
      .addSelect('COUNT(*)', 'itemCount')
      .where('i.company_id = :companyId', { companyId })
      .groupBy('i.list_code')
      .addGroupBy('i.list_name')
      .orderBy('i.list_code', 'ASC')
      .getRawMany<{ listCode: string; listName: string; itemCount: string }>();

    return rows.map((r) => ({
      listCode: r.listCode,
      listName: r.listName,
      itemCount: Number(r.itemCount),
    }));
  }

  /**
   * Devuelve un mapa `código de lista -> nombre de lista` de una compañía.
   * Se usa para mostrar la descripción de la lista en lugar del código.
   */
  async findListNameMap(companyId: string): Promise<Map<string, string>> {
    const rows = await this.repository
      .createQueryBuilder('i')
      .select('i.list_code', 'listCode')
      .addSelect('i.list_name', 'listName')
      .where('i.company_id = :companyId', { companyId })
      .groupBy('i.list_code')
      .addGroupBy('i.list_name')
      .getRawMany<{ listCode: string; listName: string }>();

    return new Map(rows.map((r) => [r.listCode.trim(), r.listName]));
  }

  /**
   * Devuelve un mapa `referencia -> ítem` de una lista de precios, con todos
   * los datos del producto (nombre, unidad de medida y precio). Se usa para
   * armar el pedido a partir de la lista del cliente.
   */
  async findListItemMap(
    companyId: string,
    listCode: string,
  ): Promise<Map<string, PriceListItem>> {
    const rows = await this.repository.find({
      where: { companyId, listCode },
    });
    return new Map(rows.map((r) => [r.reference.trim(), r]));
  }

  /** Devuelve los ítems de una lista, con búsqueda opcional. */
  findItems(
    companyId: string,
    listCode: string,
    search?: string,
  ): Promise<PriceListItem[]> {
    const where = search
      ? [
          { companyId, listCode, productName: ILike(`%${search}%`) },
          { companyId, listCode, reference: ILike(`%${search}%`) },
        ]
      : { companyId, listCode };

    return this.repository.find({
      where,
      take: 500,
      order: { reference: 'ASC' },
    });
  }

  /**
   * Devuelve TODOS los ítems de una lista (sin tope) para generar el PDF
   * completo de la lista de precios.
   */
  findAllItems(companyId: string, listCode: string): Promise<PriceListItem[]> {
    return this.repository.find({
      where: { companyId, listCode },
      order: { reference: 'ASC' },
    });
  }

  /**
   * Sincroniza las listas de precios desde Siesa.
   *
   * Busca los cambios contra lo guardado en la base de datos:
   * - Inserta las referencias nuevas.
   * - Actualiza el precio/nombre cuando cambió.
   * - Elimina las que ya no vienen en la consulta.
   * El endpoint trae filas repetidas por referencia; se conserva la última.
   *
   * Las operaciones se hacen por lotes (no una por una) para que sea rápido
   * contra la base de datos remota.
   */
  async syncFromSiesa(companyId: string): Promise<{
    lists: number;
    created: number;
    updated: number;
    removed: number;
    total: number;
  }> {
    const raws = await this.client.fetchPriceLists(companyId);
    const normalized = this.normalize(raws);
    this.logger.log(
      `Listas de precios (compañía ${companyId}): ${raws.length} filas recibidas, ${normalized.size} únicas.`,
    );

    const keyOf = (listCode: string, reference: string) =>
      `${listCode}::${reference}`;

    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(PriceListItem);
      const existing = await repo.find({ where: { companyId } });
      const existingMap = new Map(
        existing.map((e) => [keyOf(e.listCode, e.reference), e]),
      );
      const incomingKeys = new Set<string>();

      const toInsert: Partial<PriceListItem>[] = [];
      const idsToReplace: string[] = []; // filas que cambiaron (se borran y reinsertan)
      let updated = 0;

      for (const row of normalized.values()) {
        const key = keyOf(row.listCode, row.reference);
        incomingKeys.add(key);
        const prev = existingMap.get(key);

        if (!prev) {
          toInsert.push({ companyId, ...row });
        } else if (
          Number(prev.price) !== row.price ||
          prev.productName !== row.productName ||
          prev.listName !== row.listName ||
          prev.unitOfMeasure !== row.unitOfMeasure
        ) {
          idsToReplace.push(prev.id);
          toInsert.push({ companyId, ...row });
          updated++;
        }
      }
      const created = toInsert.length - updated;

      // Filas obsoletas (ya no vienen en la consulta) + las que cambiaron.
      const obsoleteIds = existing
        .filter((e) => !incomingKeys.has(keyOf(e.listCode, e.reference)))
        .map((e) => e.id);
      const removed = obsoleteIds.length;

      const idsToDelete = [...obsoleteIds, ...idsToReplace];
      if (idsToDelete.length > 0) {
        for (const chunk of this.chunk(idsToDelete, 500)) {
          await repo.delete(chunk);
        }
      }

      if (toInsert.length > 0) {
        for (const chunk of this.chunk(toInsert, 500)) {
          await repo.insert(chunk);
        }
      }

      const lists = new Set(
        [...normalized.values()].map((r) => r.listCode),
      ).size;

      this.logger.log(
        `Listas de precios sincronizadas (compañía ${companyId}): ` +
          `${lists} listas, ${created} nuevas, ${updated} actualizadas, ${removed} eliminadas.`,
      );

      return {
        lists,
        created,
        updated,
        removed,
        total: normalized.size,
      };
    });
  }

  /** Parte un arreglo en lotes de tamaño fijo. */
  private chunk<T>(items: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      result.push(items.slice(i, i + size));
    }
    return result;
  }

  /**
   * Limpia y deduplica las filas crudas.
   * El endpoint trae espacios de relleno y referencias repetidas por lista;
   * se conserva la última aparición (precio más reciente del ERP).
   */
  private normalize(raws: PriceListRaw[]): Map<
    string,
    {
      listCode: string;
      listName: string;
      reference: string;
      productName: string;
      unitOfMeasure: string;
      price: number;
    }
  > {
    const map = new Map<
      string,
      {
        listCode: string;
        listName: string;
        reference: string;
        productName: string;
        unitOfMeasure: string;
        price: number;
      }
    >();

    for (const raw of raws) {
      const listCode = (raw.LISTA_PRECIO ?? '').trim();
      const reference = (raw.REFERENCIA ?? '').trim();
      if (!listCode || !reference) continue;

      map.set(`${listCode}::${reference}`, {
        listCode,
        listName: (raw.DESC_LISTA ?? '').trim() || listCode,
        reference,
        productName: (raw.PRODUCTO ?? '').trim() || reference,
        unitOfMeasure: (raw.UM ?? '').trim(),
        price: Number(raw.PRECIO ?? 0),
      });
    }

    return map;
  }
}
