import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CompanyId } from '../../common/decorators/company-id.decorator';
import { User, UserRole } from '../users/entities/user.entity';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Tablero de gestión comercial de un vendedor para un mes.
   * Si no se envían mes/año, usa el mes actual. Cada vendedor ve su propio
   * tablero; solo los administradores pueden consultar el de otro vendedor
   * enviando `sellerId`.
   */
  @Get('commercial')
  commercial(
    @CompanyId() companyId: string,
    @CurrentUser() user: User,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('day') day?: string,
    @Query('sellerId') sellerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const now = new Date();
    const m = Number(month) || now.getMonth() + 1;
    const y = Number(year) || now.getFullYear();
    const d = Number(day) || undefined;
    const isAdmin = user.role === UserRole.ADMIN;
    const requested = sellerId?.trim();
    // Solo un administrador puede ver el tablero general (todos los vendedores)
    // o el de otro vendedor; el resto siempre ve el suyo.
    const allSellers = isAdmin && requested === 'all';
    const targetSellerId =
      isAdmin && requested && requested !== 'all' ? requested : user.id;
    // Rango de fechas explícito (YYYY-MM-DD). Si viene, prima sobre mes/día.
    const rangeFrom = from?.trim() || undefined;
    const rangeTo = to?.trim() || undefined;
    return this.dashboardService.getSellerDashboard(
      companyId,
      targetSellerId,
      m,
      y,
      d,
      allSellers,
      rangeFrom,
      rangeTo,
    );
  }
}
