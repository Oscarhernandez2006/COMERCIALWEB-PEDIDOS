import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ChannelSalesService } from './channel-sales.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { bogotaToday } from '../orders/order-cortes';

@ApiTags('channel-sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/channel-sales')
export class ChannelSalesController {
  constructor(private readonly service: ChannelSalesService) {}

  /**
   * Reporte de ventas por canal por día y vendedor. Filtros: from, to,
   * companyId (opcional), sellerCode (cédula, opcional).
   */
  @Get()
  report(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('companyId') companyId?: string,
    @Query('sellerCode') sellerCode?: string,
  ) {
    const today = bogotaToday();
    return this.service.report({
      from: from || today,
      to: to || today,
      companyId: companyId || undefined,
      sellerCode: sellerCode || undefined,
    });
  }

  /**
   * Backfill/sincronización manual de un rango (todas las compañías). Útil para
   * poblar el histórico de fechas pasadas.
   */
  @Post('sync')
  sync(@Query('from') from?: string, @Query('to') to?: string) {
    const today = bogotaToday();
    return this.service.syncAll(from || today, to || today);
  }
}
