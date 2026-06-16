import { Injectable, Logger } from '@nestjs/common';
import { SiesaClient } from './siesa.client';
import {
  SiesaCustomerRaw,
  SiesaOrderPayload,
  SiesaOrderResponse,
  SiesaProductRaw,
} from './siesa.types';

/**
 * Capa de servicio para Siesa: traduce entre el modelo de Siesa y el dominio.
 * Centraliza los paths de la API para que un cambio de version se haga aqui.
 */
@Injectable()
export class SiesaService {
  private readonly logger = new Logger(SiesaService.name);

  constructor(private readonly client: SiesaClient) {}

  /** Trae clientes (terceros) de una compañía desde Siesa. */
  async fetchCustomers(companyId: string): Promise<SiesaCustomerRaw[]> {
    return this.client.get<SiesaCustomerRaw[]>('/api/v1/customers', {
      companyId,
    });
  }

  /** Trae productos/articulos de una compañía desde Siesa. */
  async fetchProducts(companyId: string): Promise<SiesaProductRaw[]> {
    return this.client.get<SiesaProductRaw[]>('/api/v1/products', {
      companyId,
    });
  }

  /** Envia un pedido confirmado a Siesa para generar el documento. */
  async createOrder(payload: SiesaOrderPayload): Promise<SiesaOrderResponse> {
    this.logger.log(
      `Enviando pedido a Siesa (compañía ${payload.companyId}) para cliente ${payload.customerSiesaId}`,
    );
    return this.client.post<SiesaOrderResponse>('/api/v1/orders', payload);
  }
}
