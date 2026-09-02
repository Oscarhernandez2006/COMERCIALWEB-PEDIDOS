import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/** Línea cruda de una factura TAT devuelta por el endpoint de Siesa. */
export interface TatInvoiceRaw {
  fecha_documento?: string;
  nro_documento?: string;
  tipo_comercial?: string;
  cliente_factura?: string;
  razon_social_cliente?: string;
  codigo_sucursal?: string;
  descripcion_sucursal?: string;
  direccion_sucursal?: string;
  cantidad_inv?: number;
  valor_subtotal?: number;
}

interface TatInvoicesResponse {
  total?: number;
  limit?: number;
  offset?: number;
  count?: number;
  has_more?: boolean;
  next_offset?: number | null;
  data?: TatInvoiceRaw[];
}

/** Línea normalizada de factura TAT (una por línea del documento). */
export interface TatInvoiceLine {
  invoiceNumber: string;
  documentDate: string;
  clientCode: string;
  clientName: string;
  /** Sucursal del cliente. */
  branchCode: string;
  branchName: string;
  branchAddress: string;
  /** Tipo comercial normalizado (CORTE / CANAL / SUBPRODUCTO / …). */
  tipo: string;
  quantity: number;
  subtotal: number;
}

/**
 * Cliente del endpoint de Siesa con las facturas TAT (Agropecuaria) para subir
 * a Drivin.
 *
 * GET {url}?cia={cia}&fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD&token=...
 */
@Injectable()
export class DispatchClient {
  private readonly logger = new Logger(DispatchClient.name);
  private static readonly PAGE_SIZE = 1000;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  /** Trae todas las líneas de facturas TAT en un rango de fechas (con paginación). */
  async fetchTatInvoices(
    cia: string,
    fechaInicio: string,
    fechaFin: string,
  ): Promise<TatInvoiceLine[]> {
    const urls =
      this.config.get<Record<string, string>>('dispatch.tatInvoicesUrls') ?? {};
    const url = urls[cia];
    const token = this.config.get<string>('dispatch.tatInvoicesToken');
    const timeout = this.config.get<number>('dispatch.timeoutMs');

    if (!url) {
      throw new ServiceUnavailableException(
        `No hay endpoint de facturas TAT configurado para la compañía ${cia}.`,
      );
    }

    const lines: TatInvoiceLine[] = [];
    let offset = 0;
    // Se pagina hasta agotar los resultados (has_more / next_offset).
    for (let guard = 0; guard < 1000; guard++) {
      let res: TatInvoicesResponse;
      try {
        const response = await firstValueFrom(
          this.http.get<TatInvoicesResponse>(url, {
            params: {
              cia,
              fecha_inicio: fechaInicio,
              fecha_fin: fechaFin,
              limit: DispatchClient.PAGE_SIZE,
              offset,
              ...(token ? { token } : {}),
            },
            timeout,
          }),
        );
        res = response.data ?? {};
      } catch (error) {
        const message =
          error && typeof error === 'object' && 'message' in error
            ? (error as { message: string }).message
            : 'Error desconocido';
        this.logger.error(
          `Error consultando facturas TAT (cia ${cia}, ${fechaInicio}..${fechaFin}): ${message}`,
        );
        throw new ServiceUnavailableException(
          'Error consultando las facturas TAT en Siesa.',
        );
      }

      for (const r of res.data ?? []) {
        const line = this.mapLine(r);
        if (line) lines.push(line);
      }

      const nextOffset = res.next_offset;
      if (res.has_more && typeof nextOffset === 'number') {
        offset = nextOffset;
      } else {
        break;
      }
    }
    return lines;
  }

  /** Normaliza una línea cruda. Devuelve null si no trae consecutivo. */
  private mapLine(r: TatInvoiceRaw): TatInvoiceLine | null {
    const invoiceNumber = (r.nro_documento ?? '').trim();
    if (!invoiceNumber) return null;
    // tipo_comercial viene como "0001 - CORTE": se toma la parte descriptiva.
    const rawTipo = (r.tipo_comercial ?? '').trim();
    const tipo = (
      rawTipo.includes('-') ? rawTipo.split('-').slice(1).join('-') : rawTipo
    )
      .trim()
      .toUpperCase();
    return {
      invoiceNumber,
      documentDate: (r.fecha_documento ?? '').slice(0, 10),
      clientCode: (r.cliente_factura ?? '').trim(),
      clientName: (r.razon_social_cliente ?? '').trim(),
      branchCode: (r.codigo_sucursal ?? '').trim(),
      branchName: (r.descripcion_sucursal ?? '').trim(),
      branchAddress: (r.direccion_sucursal ?? '').trim(),
      tipo,
      quantity: Number(r.cantidad_inv) || 0,
      subtotal: Number(r.valor_subtotal) || 0,
    };
  }
}
