import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CORTES } from './order-cortes';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CompanyId } from '../../common/decorators/company-id.decorator';

/**
 * Carga de pedidos a Siesa (solo admin). El admin elige la compañía
 * (X-Company-Id), el corte y la fecha; previsualiza los pedidos pendientes por
 * envío y los sube al ERP.
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /** Catálogo de cortes disponibles. */
  @Get('cortes')
  cortes() {
    return CORTES;
  }

  /** Pedidos que se subirían en el corte/fecha indicados. */
  @Get('upload-preview')
  preview(
    @CompanyId() companyId: string,
    @Query('corte') corte: string,
    @Query('date') date?: string,
  ) {
    return this.ordersService.previewUpload(companyId, corte, date);
  }

  /** Sube a Siesa los pedidos pendientes por envío del corte/fecha. */
  @Post('upload')
  upload(
    @CompanyId() companyId: string,
    @Query('corte') corte: string,
    @Query('date') date?: string,
  ) {
    return this.ordersService.uploadBatch(companyId, corte, date);
  }
}
