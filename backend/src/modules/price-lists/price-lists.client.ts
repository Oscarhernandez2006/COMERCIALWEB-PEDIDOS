import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InternalServerErrorException } from '@nestjs/common';

/** Fila cruda devuelta por el endpoint de listas de precios. */
export interface PriceListRaw {
  LISTA_PRECIO?: string;
  DESC_LISTA?: string;
  REFERENCIA?: string;
  PRODUCTO?: string;
  UM?: string;
  PRECIO?: number;
  /** Fecha desde la que aplica el precio (ISO, p. ej. "2025-12-24T00:00:00"). */
  FECHA_ACTIVACION?: string;
  /** Fecha hasta la que aplica el precio (ISO). */
  FECHA_INACTIVACION?: string;
}

interface PriceListResponse {
  cia: number;
  count: number;
  data: PriceListRaw[];
}

/** Fila cruda del endpoint de subproductos (categoría CERDO / RES). */
interface SubproductoRaw {
  referencia?: string;
  descripcion_producto?: string;
  categoria?: string;
}

interface SubproductoResponse {
  total: number;
  data: SubproductoRaw[];
}

/** Fila cruda del endpoint de ventas por vendedor y producto (mensual). */
export interface VendorProductSaleRaw {
  /** Fecha del movimiento (YYYY-MM-DD). El ERP la renombró de `fecha` a `dia`. */
  dia?: string;
  fecha?: string;
  /** Identificador del vendedor. Hoy el ERP solo envía la razón social (nombre). */
  nit_vendedor?: string;
  codigo_vendedor?: string;
  razon_social_vendedor?: string;
  referencia?: string;
  descripcion?: string;
  periodo?: number;
  cantidad_base?: number;
  costo_total?: number;
  valor_bruto?: number;
  valor_neto?: number;
  criterio?: string;
  descripcion_criterio?: string;
  /** Clasificación del producto: CORTE / SUBPRODUCTO / CANAL / SERVICIO / ... */
  criterio_producto?: string;
}

interface VendorProductSalesResponse {
  total: number;
  has_more?: boolean;
  data: VendorProductSaleRaw[];
}

/**
 * Cliente del endpoint de listas de precios del Grupo Santacruz.
 *
 * GET {baseUrl}/listas-precios?cia={companyId}&token={token}
 */
@Injectable()
export class PriceListsClient {
  private readonly logger = new Logger(PriceListsClient.name);

  /** Caché en memoria del mapa SKU→categoría de subproductos por compañía. */
  private readonly subproductoCache = new Map<
    string,
    { expiresAt: number; data: Map<string, string> }
  >();
  private static readonly SUBPRODUCTO_TTL_MS = 10 * 60 * 1000;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  /** Trae todas las filas de listas de precios de una compañía. */
  async fetchPriceLists(companyId: string): Promise<PriceListRaw[]> {
    const baseUrl = this.config.get<string>('priceLists.baseUrl');
    const token = this.config.get<string>('priceLists.token');
    const timeout = this.config.get<number>('priceLists.timeoutMs');

    try {
      const response = await firstValueFrom(
        this.http.get<PriceListResponse>(`${baseUrl}/listas-precios`, {
          params: { cia: companyId, token },
          timeout,
        }),
      );
      return response.data?.data ?? [];
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? (error as { message: string }).message
          : 'Error desconocido';
      this.logger.error(
        `Error consultando listas de precios (compañía ${companyId}): ${message}`,
      );
      throw new InternalServerErrorException(
        'Error consultando las listas de precios en Siesa.',
      );
    }
  }

  /**
   * Trae el mapa `SKU -> categoría` (CERDO / RES) de los subproductos desde el
   * ERP. Una sola consulta devuelve ambas categorías. Se cachea en memoria.
   *
   * GET {baseUrl}/ventas/subproductos?cia={companyId}&plan1=003&plan_categoria=002&token={token}
   */
  async fetchSubproductoCategories(
    companyId: string,
  ): Promise<Map<string, string>> {
    const cached = this.subproductoCache.get(companyId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const baseUrl = this.config.get<string>('priceLists.baseUrl');
    const token = this.config.get<string>('priceLists.token');
    const timeout = this.config.get<number>('priceLists.timeoutMs');

    try {
      const response = await firstValueFrom(
        this.http.get<SubproductoResponse>(`${baseUrl}/ventas/subproductos`, {
          params: { cia: companyId, plan1: '003', plan_categoria: '002', token },
          timeout,
        }),
      );
      const map = new Map<string, string>();
      for (const row of response.data?.data ?? []) {
        const sku = (row.referencia ?? '').trim();
        const cat = (row.categoria ?? '').trim().toUpperCase();
        if (sku && cat) map.set(sku, cat);
      }
      this.subproductoCache.set(companyId, {
        expiresAt: Date.now() + PriceListsClient.SUBPRODUCTO_TTL_MS,
        data: map,
      });
      return map;
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? (error as { message: string }).message
          : 'Error desconocido';
      this.logger.error(
        `Error consultando subproductos (compañía ${companyId}): ${message}`,
      );
      // Si falla, se devuelve un mapa vacío para no romper el listado.
      return new Map();
    }
  }

  /**
   * Ventas por vendedor y producto de un mes (cortes, subproductos y canales).
   * GET {baseUrl}/ventas/vendedor-productos-mes?periodo={YYYYMM}&token={token}
   */
  async fetchVendorProductSales(
    periodo: string,
  ): Promise<VendorProductSaleRaw[]> {
    const baseUrl = this.config.get<string>('priceLists.baseUrl');
    const token = this.config.get<string>('priceLists.token');
    const timeout = this.config.get<number>('priceLists.timeoutMs');
    // El ERP tope el `limit` en 5000 y su paginación por `offset` es inestable
    // (duplica/salta filas). Para no perder ventas cuando el mes supera 5000
    // filas se pagina con solape y se deduplica por la identidad de la fila,
    // avanzando hasta reunir el `total` que informa el ERP.
    const PAGE = 5000;
    const STEP = 4000; // solape de 1000 filas para recuperar filas saltadas
    const MAX_PAGES = 60;
    try {
      const unique = new Map<string, VendorProductSaleRaw>();
      let expectedTotal = Number.POSITIVE_INFINITY;
      let offset = 0;
      let page = 0;
      let staleStreak = 0;
      while (page < MAX_PAGES) {
        const response = await firstValueFrom(
          this.http.get<VendorProductSalesResponse>(
            `${baseUrl}/ventas/vendedor-productos-mes`,
            { params: { periodo, limit: PAGE, offset, token }, timeout },
          ),
        );
        const rows = response.data?.data ?? [];
        if (
          typeof response.data?.total === 'number' &&
          response.data.total >= 0
        ) {
          expectedTotal = response.data.total;
        }
        const before = unique.size;
        for (const row of rows) {
          // El ERP renombró `fecha`->`dia` y ya no envía `nit_vendedor`
          // (solo `razon_social_vendedor`). La clave usa los campos actuales
          // para no colapsar filas distintas como duplicadas.
          const key = [
            (row.razon_social_vendedor ?? row.nit_vendedor ?? '').trim(),
            (row.referencia ?? '').trim(),
            (row.dia ?? row.fecha ?? '').trim(),
            (row.criterio ?? '').trim(),
            String(row.valor_neto ?? ''),
            String(row.valor_bruto ?? ''),
            String(row.cantidad_base ?? ''),
          ].join('|');
          if (!unique.has(key)) unique.set(key, row);
        }
        page++;
        const added = unique.size - before;
        // Fin: página vacía, o el offset dejó de traer filas nuevas (agotado o
        // ignorado por el ERP) durante dos páginas seguidas, o ya se reunió el
        // total informado, o la última página vino incompleta sin `has_more`.
        if (rows.length === 0) break;
        if (added === 0) {
          staleStreak++;
          if (staleStreak >= 2) break;
        } else {
          staleStreak = 0;
        }
        if (rows.length < PAGE && !response.data?.has_more) break;
        if (unique.size >= expectedTotal) break;
        offset += STEP;
      }
      if (page >= MAX_PAGES && unique.size < expectedTotal) {
        this.logger.warn(
          `Ventas por vendedor (periodo ${periodo}): se alcanzó el máximo de páginas; el total puede quedar incompleto.`,
        );
      }
      return [...unique.values()];
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? (error as { message: string }).message
          : 'Error desconocido';
      this.logger.error(
        `Error consultando ventas por vendedor (periodo ${periodo}): ${message}`,
      );
      throw new InternalServerErrorException(
        'Error consultando las ventas por vendedor en Siesa.',
      );
    }
  }
}
