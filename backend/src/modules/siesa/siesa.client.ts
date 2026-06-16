import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosInstance } from 'axios';
import { firstValueFrom } from 'rxjs';
import { InternalServerErrorException } from '@nestjs/common';

/**
 * Cliente HTTP de bajo nivel para la API de Siesa.
 *
 * Encapsula la autenticación (ConniKey/ConniToken) y la configuración base.
 * Los métodos públicos exponen un acceso tipado y resiliente a los endpoints.
 *
 * Nota: Siesa expone varios estilos de API segun la version (Siesa Enterprise,
 * Siesa Cloud, conector REST). Ajusta los headers/paths a tu instancia concreta
 * usando las variables de entorno SIESA_*.
 */
@Injectable()
export class SiesaClient {
  private readonly logger = new Logger(SiesaClient.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.configureAxios();
  }

  private get axios(): AxiosInstance {
    return this.http.axiosRef;
  }

  private configureAxios(): void {
    const baseURL = this.config.get<string>('siesa.baseUrl');
    const timeout = this.config.get<number>('siesa.timeoutMs');

    this.axios.defaults.baseURL = baseURL;
    this.axios.defaults.timeout = timeout;
    this.axios.defaults.headers.common['Content-Type'] = 'application/json';

    const conniKey = this.config.get<string>('siesa.conniKey');
    const conniToken = this.config.get<string>('siesa.conniToken');
    if (conniKey) this.axios.defaults.headers.common['ConniKey'] = conniKey;
    if (conniToken)
      this.axios.defaults.headers.common['ConniToken'] = conniToken;
  }

  async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.http.get<T>(path, { params }),
      );
      return response.data;
    } catch (error) {
      this.handleError('GET', path, error);
    }
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    try {
      const response = await firstValueFrom(this.http.post<T>(path, body));
      return response.data;
    } catch (error) {
      this.handleError('POST', path, error);
    }
  }

  private handleError(method: string, path: string, error: unknown): never {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : 'Unknown error';
    this.logger.error(`Siesa ${method} ${path} failed: ${message}`);
    throw new InternalServerErrorException(
      `Error consultando Siesa (${method} ${path})`,
    );
  }
}
