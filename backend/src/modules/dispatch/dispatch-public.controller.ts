import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DispatchService } from './dispatch.service';
import { DispatchApiKeyGuard } from './dispatch-api-key.guard';
import { isValidCompany } from '../../common/companies';

/**
 * API pública de despacho (consumida por Drivin). Se autentica con el token de
 * `DISPATCH_API_TOKEN` vía header `x-api-key` o query `token`.
 */
@ApiTags('dispatch-public')
@UseGuards(DispatchApiKeyGuard)
@Controller('public/dispatch')
export class DispatchPublicController {
  constructor(private readonly service: DispatchService) {}

  /**
   * Facturas TAT marcadas y guardadas para despacho de una compañía.
   * `cia`: id de la compañía (3 = AGROPECUARIA, 8 = CARNES FRIAS).
   */
  @Get('tat-invoices')
  selected(@Query('cia') cia?: string) {
    const company = (cia ?? '').trim();
    if (!isValidCompany(company)) {
      throw new BadRequestException(
        'Parámetro "cia" inválido o ausente (p. ej. 3 u 8).',
      );
    }
    return this.service.listSelectedPublic(company);
  }
}
