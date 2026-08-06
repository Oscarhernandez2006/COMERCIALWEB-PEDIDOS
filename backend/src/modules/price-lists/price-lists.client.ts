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
}
