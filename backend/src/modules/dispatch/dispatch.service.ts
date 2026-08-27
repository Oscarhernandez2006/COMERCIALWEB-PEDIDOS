import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { baseCompanyId } from '../../common/companies';
import { DispatchTatInvoice } from './entities/dispatch-tat-invoice.entity';
import { DispatchClient, TatInvoiceLine } from './dispatch.client';
import { SaveDispatchSelectionDto } from './dto/save-dispatch-selection.dto';

/** Número de días previos que se incluyen al sincronizar (la fecha + 5 antes). */
const SYNC_DAYS_BACK = 5;

interface GroupedInvoice {
  invoiceNumber: string;
  documentDate: string;
  clientCode: string;
  clientName: string;
  tipoComercial: string;
  quantity: number;
  subtotal: number;
}

@Injectable()
export class DispatchService {
  constructor(
    @InjectRepository(DispatchTatInvoice)
    private readonly invoiceRepository: Repository<DispatchTatInvoice>,
    private readonly client: DispatchClient,
  ) {}

  /** Facturas TAT guardadas de la compañía, ordenadas por fecha y consecutivo. */
  list(companyId: string): Promise<DispatchTatInvoice[]> {
    return this.invoiceRepository.find({
      where: { companyId: baseCompanyId(companyId) },
      order: { documentDate: 'DESC', invoiceNumber: 'ASC' },
    });
  }

  /**
   * API pública: facturas MARCADAS y guardadas para despacho de una compañía,
   * con los campos del ERP. Es lo que consume Drivin.
   */
  async listSelectedPublic(companyId: string): Promise<
    {
      nro_documento: string;
      fecha_documento: string;
      cliente_factura: string;
      razon_social_cliente: string;
      tipo_comercial: string | null;
      cantidad_inv: number;
      valor_subtotal: number;
    }[]
  > {
    const rows = await this.invoiceRepository.find({
      where: { companyId: baseCompanyId(companyId), selected: true },
      order: { documentDate: 'DESC', invoiceNumber: 'ASC' },
    });
    return rows.map((r) => ({
      nro_documento: r.invoiceNumber,
      fecha_documento: r.documentDate,
      cliente_factura: r.clientCode,
      razon_social_cliente: r.clientName,
      tipo_comercial: r.tipoComercial,
      cantidad_inv: Number(r.quantity),
      valor_subtotal: Number(r.subtotal),
    }));
  }

  /**
   * Sincroniza desde Siesa las facturas TAT de la fecha indicada y los
   * {@link SYNC_DAYS_BACK} días anteriores (p. ej. fecha 27 → 22 al 27). La
   * tabla queda con SOLO ese rango: se borra lo anterior y se inserta lo nuevo
   * (agrupado por consecutivo), conservando la selección previa por consecutivo.
   */
  async sync(companyId: string, date: string): Promise<DispatchTatInvoice[]> {
    const company = baseCompanyId(companyId);
    const fechaFin = date;
    const fechaInicio = this.subtractDays(date, SYNC_DAYS_BACK);

    const lines = await this.client.fetchTatInvoices(
      company,
      fechaInicio,
      fechaFin,
    );
    const grouped = this.groupByInvoice(lines);

    // Se conserva la selección previa (por consecutivo) para no perderla al
    // re-sincronizar el mismo rango.
    const prevSelected = new Set(
      (
        await this.invoiceRepository.find({
          where: { companyId: company, selected: true },
          select: { invoiceNumber: true },
        })
      ).map((r) => r.invoiceNumber),
    );

    // Reemplazo total: la tabla refleja únicamente el rango elegido.
    await this.invoiceRepository.delete({ companyId: company });

    const toInsert = [...grouped.values()].map((inv) => ({
      companyId: company,
      invoiceNumber: inv.invoiceNumber,
      documentDate: inv.documentDate,
      clientCode: inv.clientCode,
      clientName: inv.clientName,
      tipoComercial: inv.tipoComercial,
      quantity: inv.quantity,
      subtotal: inv.subtotal,
      selected: prevSelected.has(inv.invoiceNumber),
    }));
    // Inserción en lotes (un INSERT por lote) para que sea rápido.
    const CHUNK = 500;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      await this.invoiceRepository.insert(toInsert.slice(i, i + CHUNK));
    }

    return this.invoiceRepository.find({
      where: { companyId: company },
      order: { documentDate: 'DESC', invoiceNumber: 'ASC' },
    });
  }

  /** Guarda la selección de facturas para despacho. */
  async saveSelection(
    companyId: string,
    dto: SaveDispatchSelectionDto,
  ): Promise<string[]> {
    const company = baseCompanyId(companyId);
    for (const item of dto.items) {
      const number = item.invoiceNumber.trim();
      if (!number) continue;
      await this.invoiceRepository.update(
        { companyId: company, invoiceNumber: number },
        { selected: item.selected },
      );
    }
    const selected = await this.invoiceRepository.find({
      where: { companyId: company, selected: true },
      select: { invoiceNumber: true },
    });
    return selected.map((s) => s.invoiceNumber);
  }

  /** Agrupa las líneas por consecutivo, sumando cantidad y valor. */
  private groupByInvoice(lines: TatInvoiceLine[]): Map<string, GroupedInvoice> {
    const map = new Map<string, GroupedInvoice & { tipos: Set<string> }>();
    for (const l of lines) {
      let g = map.get(l.invoiceNumber);
      if (!g) {
        g = {
          invoiceNumber: l.invoiceNumber,
          documentDate: l.documentDate,
          clientCode: l.clientCode,
          clientName: l.clientName,
          tipoComercial: '',
          quantity: 0,
          subtotal: 0,
          tipos: new Set<string>(),
        };
        map.set(l.invoiceNumber, g);
      }
      if (l.tipo) g.tipos.add(l.tipo);
      g.quantity += l.quantity;
      g.subtotal += l.subtotal;
    }
    for (const g of map.values()) {
      g.tipoComercial = [...g.tipos].sort().join(', ');
    }
    return map;
  }

  /** Resta días a una fecha YYYY-MM-DD y devuelve YYYY-MM-DD. */
  private subtractDays(date: string, days: number): string {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  }
}
