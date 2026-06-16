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
}
