import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DispatchService } from './dispatch.service';
import { SaveDispatchSelectionDto } from './dto/save-dispatch-selection.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CompanyId } from '../../common/decorators/company-id.decorator';

@ApiTags('dispatch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/dispatch')
export class DispatchController {
  constructor(private readonly service: DispatchService) {}

  /** Facturas TAT guardadas de la compañía con su estado de selección. */
  @Get('tat-invoices')
  list(@CompanyId() companyId: string) {
    return this.service.list(companyId);
  }

  /**
   * Sincroniza desde Siesa las facturas TAT de la fecha indicada y los 5 días
   * anteriores. `date` en formato YYYY-MM-DD.
   */
  @Post('tat-invoices/sync')
  sync(@CompanyId() companyId: string, @Query('date') date?: string) {
    const d = (date ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      throw new BadRequestException(
        'La fecha es obligatoria en formato YYYY-MM-DD.',
      );
    }
    return this.service.sync(companyId, d);
  }

  /** Guarda la selección de facturas a despachar en Drivin. */
  @Put('tat-invoices/selection')
  saveSelection(
    @CompanyId() companyId: string,
    @Body() dto: SaveDispatchSelectionDto,
  ) {
    return this.service.saveSelection(companyId, dto);
  }
}
