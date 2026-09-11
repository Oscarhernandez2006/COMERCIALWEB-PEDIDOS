import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CanalOrdersService } from './canal-orders.service';
import { CreateCanalOrderDto } from './dto/create-canal-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CompanyId } from '../../common/decorators/company-id.decorator';

@ApiTags('canal-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('canal-orders')
export class CanalOrdersController {
  constructor(private readonly canalOrdersService: CanalOrdersService) {}

  /** Crea un pedido de canales. */
  @Post()
  create(
    @CompanyId() companyId: string,
    @Body() dto: CreateCanalOrderDto,
    @CurrentUser() user: User,
  ) {
    return this.canalOrdersService.create(companyId, dto, user);
  }

  /** Lista los pedidos de canales (consolidado) de la compañía. */
  @Get()
  findAll(
    @CompanyId() companyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.canalOrdersService.findAll(companyId, from, to);
  }

  /** Pedidos del vendedor autenticado (para ver el estado de su flujo). */
  @Get('mine')
  findMine(
    @CompanyId() companyId: string,
    @CurrentUser('id') sellerId: string,
  ) {
    return this.canalOrdersService.findAllForSeller(companyId, sellerId);
  }

  /** Pedidos del vendedor con novedad de cartera/despacho. */
  @Get('notifications')
  notifications(
    @CompanyId() companyId: string,
    @CurrentUser('id') sellerId: string,
  ) {
    return this.canalOrdersService.findSellerNotifications(companyId, sellerId);
  }

  /** Marca como visto el aviso de cartera de un pedido. */
  @Post(':id/acknowledge')
  acknowledge(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @CurrentUser('id') sellerId: string,
  ) {
    return this.canalOrdersService.acknowledgeNotification(
      companyId,
      sellerId,
      id,
    );
  }

  /** Detalle de un pedido de canales. */
  @Get(':id')
  findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.canalOrdersService.findOne(companyId, id);
  }
}
