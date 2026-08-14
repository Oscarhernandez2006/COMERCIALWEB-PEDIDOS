import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { UpdateOrderDto } from './dto/update-order.dto';
import { DisapproveOrderDto } from './dto/disapprove-order.dto';

/**
 * Controlador de subproductos. Los pedidos de subproductos NO suben a Siesa al
 * crearse: quedan aquí para que un controlador los revise, edite (agregar/quitar
 * productos, cambiar cantidades) y apruebe. Al aprobar, se suben a Siesa
 * divididos por categoría (bovino/porcino) con el mismo consecutivo.
 */
@ApiTags('controlador-subproductos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/controlador-subproductos/orders')
export class ControladorSubproductosController {
  constructor(private readonly ordersService: OrdersService) {}

  /** Pedidos de subproductos pendientes de revisión/aprobación. */
  @Get()
  async findPending(@CurrentUser() user: User) {
    await this.ordersService.assertCanControlSubproductos(user);
    return this.ordersService.findPendingSubproductos();
  }

  /** Edita las líneas de un pedido pendiente (no lo sube a Siesa). */
  @Patch(':id')
  async edit(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: User,
  ) {
    await this.ordersService.assertCanControlSubproductos(user);
    return this.ordersService.editSubproductoOrder(id, dto);
  }

  /** Aprueba el pedido y lo sube a Siesa (dividido por categoría). */
  @Post(':id/approve')
  async approve(@Param('id') id: string, @CurrentUser() user: User) {
    await this.ordersService.assertCanControlSubproductos(user);
    return this.ordersService.approveSubproductoOrder(id, user);
  }

  /** Rechaza el pedido: devuelve el inventario reservado. */
  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() dto: DisapproveOrderDto,
    @CurrentUser() user: User,
  ) {
    await this.ordersService.assertCanControlSubproductos(user);
    return this.ordersService.rejectSubproductoOrder(id, dto.reason, user);
  }
}
