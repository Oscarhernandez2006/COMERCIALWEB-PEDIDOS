import {
  Body,
  Controller,
  Get,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { SaveBudgetsDto } from './dto/save-budgets.dto';
import { SaveProjectionDto } from './dto/save-projection.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, User } from '../users/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CompanyId } from '../../common/decorators/company-id.decorator';

@ApiTags('budgets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  /** Presupuestos de los vendedores de una compañía para un mes/año. */
  @Get()
  list(
    @CompanyId() companyId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const now = new Date();
    const m = Number(month) || now.getMonth() + 1;
    const y = Number(year) || now.getFullYear();
    return this.budgetsService.list(companyId, m, y);
  }

  /** Guarda (crea/actualiza) el presupuesto del mes para varios vendedores. */
  @Put()
  save(
    @CompanyId() companyId: string,
    @Body() dto: SaveBudgetsDto,
    @CurrentUser() user: User,
  ) {
    return this.budgetsService.save(companyId, dto, user);
  }

  /** Proyección de ventas de la compañía para un mes/año. */
  @Get('projection')
  getProjection(
    @CompanyId() companyId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    const now = new Date();
    const m = Number(month) || now.getMonth() + 1;
    const y = Number(year) || now.getFullYear();
    return this.budgetsService.getProjection(companyId, m, y);
  }

  /** Guarda (crea/actualiza) la proyección de ventas de la compañía. */
  @Put('projection')
  saveProjection(
    @CompanyId() companyId: string,
    @Body() dto: SaveProjectionDto,
    @CurrentUser() user: User,
  ) {
    return this.budgetsService.saveProjection(companyId, dto, user);
  }
}
