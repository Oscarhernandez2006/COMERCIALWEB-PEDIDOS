import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CompanyId } from '../../common/decorators/company-id.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @CompanyId() companyId: string,
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.create(companyId, dto, user);
  }

  @Get()
  findMine(
    @CompanyId() companyId: string,
    @CurrentUser('id') sellerId: string,
  ) {
    return this.ordersService.findAllForSeller(companyId, sellerId);
  }

  /** Avisos pendientes para el vendedor (decisiones de cartera). */
  @Get('notifications')
  notifications(@CurrentUser('id') sellerId: string) {
    return this.ordersService.findSellerNotifications(sellerId);
  }

  /** Avisos de cambio de estado en Siesa de los pedidos del vendedor. */
  @Get('siesa-state-notifications')
  siesaStateNotifications(@CurrentUser('id') sellerId: string) {
    return this.ordersService.findSiesaStateNotifications(sellerId);
  }

  /** Estado real en Siesa de los pedidos del vendedor (orderNumber -> estado). */
  @Get('siesa-states')
  siesaStates(
    @CompanyId() companyId: string,
    @CurrentUser('id') sellerId: string,
  ) {
    return this.ordersService.getSiesaStates(companyId, sellerId);
  }

  /** Marca como visto un aviso de cartera del vendedor. */
  @Post(':id/acknowledge')
  acknowledge(
    @CurrentUser('id') sellerId: string,
    @Param('id') id: string,
  ) {
    return this.ordersService.acknowledgeNotification(sellerId, id);
  }

  /** Marca como visto un aviso de cambio de estado en Siesa. */
  @Post(':id/siesa-state-ack')
  acknowledgeSiesaState(
    @CurrentUser('id') sellerId: string,
    @Param('id') id: string,
  ) {
    return this.ordersService.acknowledgeSiesaStateNotification(sellerId, id);
  }

  @Get(':id')
  findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.ordersService.findOne(companyId, id);
  }

  @Patch(':id')
  update(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.ordersService.update(companyId, id, dto);
  }

  @Post(':id/confirm')
  confirm(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.ordersService.confirm(companyId, id);
  }

  @Post(':id/sync')
  sync(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.ordersService.syncToSiesa(companyId, id);
  }

  @Post(':id/cancel')
  cancel(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancel(companyId, id, dto.reason);
  }

  @Get(':id/pdf')
  async pdf(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const order = await this.ordersService.findOne(companyId, id);
    const buffer = await this.ordersService.generatePdf(
      companyId,
      id,
      user.name,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="pedido-${order.orderNumber}.pdf"`,
    );
    res.send(buffer);
  }
}
