import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { DisapproveOrderDto } from './dto/disapprove-order.dto';

/**
 * Módulo de aprobación de cartera. Lista y resuelve los pedidos retenidos por
 * deuda del cliente (estado "pendiente por aprobación en cartera"). Solo
 * accesible para el rol CARTERA (y administradores).
 */
@ApiTags('cartera')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CARTERA, UserRole.SELLER, UserRole.ADMIN)
@Controller('cartera/orders')
export class CarteraOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Pedidos pendientes de aprobación en cartera, SOLO de las compañías que el
   * usuario tiene asignadas (los administradores ven todas). Así cada persona
   * de cartera ve únicamente los pedidos de su(s) compañía(s).
   */
  @Get()
  findPending(@CurrentUser() user: User) {
    return this.ordersService.findPendingApproval(user);
  }

  /** Aprueba el pedido: pasa a "pendiente por envío" a Siesa. */
  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: User) {
    return this.ordersService.approveOrder(id, user);
  }

  /** Desaprueba el pedido: se libera el inventario reservado. */
  @Post(':id/disapprove')
  disapprove(
    @Param('id') id: string,
    @Body() dto: DisapproveOrderDto,
    @CurrentUser() user: User,
  ) {
    return this.ordersService.disapproveOrder(id, dto.reason, user);
  }
}
