import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AdminOrdersService } from './admin-orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

/**
 * Descarga masiva de pedidos (solo admin). Lista los pedidos subidos a Siesa
 * (no rebotados ni anulados) y genera un único PDF con los seleccionados,
 * marcándolos como descargados. El admin indica la compañía por query.
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly adminOrdersService: AdminOrdersService) {}

  /** Listado administrativo de pedidos con seguimiento completo y filtros. */
  @Get()
  listAll(
    @Query('companyId') companyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminOrdersService.listAll(companyId, {
      from,
      to,
      status,
      search,
    });
  }

  /** Pedidos descargables (subidos a Siesa, no rebotados ni anulados). */
  @Get('downloadable')
  listDownloadable(@Query('companyId') companyId: string) {
    return this.adminOrdersService.listDownloadable(companyId);
  }

  /** Genera un PDF con los pedidos seleccionados y los marca como descargados. */
  @Post('download')
  async download(
    @Body() body: { companyId: string; orderIds: string[] },
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const { companyId, orderIds } = body ?? {};
    if (!companyId) {
      throw new BadRequestException('Falta la compañía.');
    }
    const buffer = await this.adminOrdersService.downloadPdf(
      companyId,
      orderIds,
      user.name,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="pedidos-${companyId}.pdf"`,
    );
    res.send(buffer);
  }
}
