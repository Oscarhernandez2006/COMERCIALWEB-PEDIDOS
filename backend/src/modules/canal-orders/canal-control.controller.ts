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
import { CanalOrdersService } from './canal-orders.service';
import { UpdateCanalOrderDto } from './dto/update-canal-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { CompanyId } from '../../common/decorators/company-id.decorator';

/**
 * Control de canales (Zulma). Revisa, edita y aprueba los pedidos antes de que
 * pasen a la validación de cartera. Acceso por rol admin o por el permiso del
 * módulo `/admin/canales-control`.
 */
@ApiTags('canal-orders-control')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/canal-orders/control')
export class CanalControlController {
  constructor(private readonly service: CanalOrdersService) {}

  /** Pedidos pendientes de revisión/aprobación del controlador. */
  @Get()
  findPending(@CompanyId() companyId: string, @CurrentUser() user: User) {
    return this.service.findForControl(companyId, user);
  }

  /** Edita un pedido pendiente (cantidades, precios, datos del cliente). */
  @Patch(':id')
  edit(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCanalOrderDto,
    @CurrentUser() user: User,
  ) {
    return this.service.updateByControl(companyId, id, dto, user);
  }

  /** Aprueba el pedido: pasa a validación de cartera. */
  @Post(':id/approve')
  approve(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.service.approveByControl(companyId, id, user);
  }
}
