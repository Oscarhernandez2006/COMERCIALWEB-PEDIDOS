import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminStatsService } from './admin-stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

/**
 * Panel de administración: estadísticas agregadas de TODAS las compañías.
 * La administración es única; el dashboard consolida la 3 y la 8.
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminStatsController {
  constructor(private readonly statsService: AdminStatsService) {}

  @Get('dashboard')
  dashboard() {
    return this.statsService.getDashboard();
  }
}
