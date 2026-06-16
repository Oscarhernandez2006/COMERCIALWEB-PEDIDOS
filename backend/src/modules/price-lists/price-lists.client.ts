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
}

interface PriceListResponse {
  cia: number;
  count: number;
  data: PriceListRaw[];
}

/**
 * Cliente del endpoint de listas de precios del Grupo Santacruz.
 *
 * GET {baseUrl}/listas-precios?cia={companyId}&token={token}
 */
@Injectable()
export class PriceListsClient {
  private readonly logger = new Logger(PriceListsClient.name);

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
}
