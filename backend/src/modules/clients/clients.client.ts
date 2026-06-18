import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

/** Fila cruda devuelta por el endpoint de clientes. */
export interface ClientRaw {
  CODIGO?: string;
  TERCERO?: string;
  SUCURSAL?: string;
  NOMBRE_SUCURSAL?: string | null;
  LISTA_PRECIO?: string | null;
  COND_PAGO?: string | null;
  CODIGO_VENDEDOR?: string | null;
  DIRECCION?: string | null;
  BARRIO?: string | null;
  CIUDAD_MUNICIPIO?: string | null;
  DEPARTAMENTO?: string | null;
  CELULAR?: string | null;
  EMAIL?: string | null;
}

interface ClientsResponse {
  cia: number;
  count: number;
  data: ClientRaw[];
}

/** Fila cruda devuelta por el endpoint de cartera (un documento por cobrar). */
export interface PortfolioRaw {
  CIA?: number;
  CODIGO?: string;
  RAZON_SOCIAL?: string;
  SUCURSAL?: string;
  CO?: string;
  TIPO_DOC_CRUCE?: string;
  DESCRIPCION?: string;
  CONS_DOC_CRUCE?: number;
  DEBITO?: number;
  CREDITO?: number;
  SALDO?: number;
}

interface PortfolioResponse {
  cia: number;
  nit: string;
  count: number;
  data: PortfolioRaw[];
}

/**
 * Cliente del endpoint de clientes del Grupo Santacruz.
 *
 * GET {baseUrl}/clientes-por-cia?cia={companyId}&token={token}
 *
 * Reutiliza la misma base/token configurados para listas de precios
 * (mismo host y token).
 */
@Injectable()
export class ClientsClient {
  private readonly logger = new Logger(ClientsClient.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  /** Trae todos los clientes de una compañía. */
  async fetchClients(companyId: string): Promise<ClientRaw[]> {
    const baseUrl = this.config.get<string>('priceLists.baseUrl');
    const token = this.config.get<string>('priceLists.token');
    const timeout = this.config.get<number>('priceLists.timeoutMs');

    try {
      const response = await firstValueFrom(
        this.http.get<ClientsResponse>(`${baseUrl}/clientes-por-cia`, {
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
        `Error consultando clientes (compañía ${companyId}): ${message}`,
      );
      throw new InternalServerErrorException(
        'Error consultando los clientes en Siesa.',
      );
    }
  }

  /**
   * Trae la cartera (documentos por cobrar) de un cliente.
   *
   * GET {baseUrl}/cartera?cia={companyId}&nit={nit}&token={token}
   */
  async fetchPortfolio(
    companyId: string,
    nit: string,
  ): Promise<PortfolioRaw[]> {
    const baseUrl = this.config.get<string>('priceLists.baseUrl');
    const token = this.config.get<string>('priceLists.token');
    const timeout = this.config.get<number>('priceLists.timeoutMs');

    try {
      const response = await firstValueFrom(
        this.http.get<PortfolioResponse>(`${baseUrl}/cartera`, {
          params: { cia: companyId, nit, token },
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
        `Error consultando cartera (compañía ${companyId}, nit ${nit}): ${message}`,
      );
      throw new InternalServerErrorException(
        'Error consultando la cartera del cliente en Siesa.',
      );
    }
  }
}
