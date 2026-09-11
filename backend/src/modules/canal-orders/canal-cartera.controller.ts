import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CanalOrdersService } from './canal-orders.service';
import { CarteraDecisionDto } from './dto/cartera-decision.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { CompanyId } from '../../common/decorators/company-id.decorator';

/**
 * Validación de cupo de cartera para pedidos de canales. Cartera revisa que el
 * cliente tenga cupo (facturado + pedidos sin facturar + este pedido ≤ cupo) y
 * aprueba o rechaza. Acceso por rol admin/cartera o permiso `/admin/canales-cartera`.
 */
@ApiTags('canal-orders-cartera')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.CARTERA)
@Controller('cartera/canal-orders')
export class CanalCarteraController {
  constructor(private readonly service: CanalOrdersService) {}

  /** Pedidos pendientes de validación de cartera (con su cupo calculado). */
  @Get()
  findPending(@CompanyId() companyId: string, @CurrentUser() user: User) {
    return this.service.findForCartera(companyId, user);
  }

  /** Aprueba el cupo: el pedido pasa a despacho. */
  @Post(':id/approve')
  approve(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: CarteraDecisionDto,
    @CurrentUser() user: User,
  ) {
    return this.service.carteraApprove(companyId, id, dto, user);
  }

  /** Rechaza por cupo: se detiene y se notifica al vendedor. */
  @Post(':id/reject')
  reject(
    @CompanyId() companyId: string,
    @Param('id') id: string,
    @Body() dto: CarteraDecisionDto,
    @CurrentUser() user: User,
  ) {
    return this.service.carteraReject(companyId, id, dto, user);
  }
}
