import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProductCostsService } from './product-costs.service';
import { SaveProductCostsDto } from './dto/save-product-costs.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CompanyId } from '../../common/decorators/company-id.decorator';

@ApiTags('product-costs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/product-costs')
export class ProductCostsController {
  constructor(private readonly service: ProductCostsService) {}

  /** Costos estándar cargados de la compañía. */
  @Get()
  list(@CompanyId() companyId: string) {
    return this.service.list(companyId);
  }

  /** Crea/actualiza costos estándar de la compañía. */
  @Put()
  save(@CompanyId() companyId: string, @Body() dto: SaveProductCostsDto) {
    return this.service.saveMany(companyId, dto);
  }
}
