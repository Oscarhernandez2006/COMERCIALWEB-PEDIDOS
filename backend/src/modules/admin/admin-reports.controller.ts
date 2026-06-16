import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AdminReportsService } from './admin-reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

/**
 * Reportes del panel de administración (solo admin). Los reportes se generan
 * en PDF. El admin no fija compañía: se indica por query (`companyId`).
 */
@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/reports')
export class AdminReportsController {
  constructor(private readonly reportsService: AdminReportsService) {}

  /** Resumen de inventario por día (vendido, stock que queda y agotados). */
  @Get('inventory')
  async inventory(
    @Query('companyId') companyId: string,
    @Query('date') date: string,
    @Res() res: Response,
  ) {
    const { buffer, date: reportDate } =
      await this.reportsService.getInventoryReportPdf(companyId, date);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="inventario-${companyId}-${reportDate}.pdf"`,
    );
    res.send(buffer);
  }
}
