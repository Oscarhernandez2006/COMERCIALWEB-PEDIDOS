import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GeoService } from './geo.service';
import { RecordLocationDto } from './dto/record-location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CompanyId } from '../../common/decorators/company-id.decorator';
import { User, UserRole } from '../users/entities/user.entity';

/** Registro de ubicación del vendedor (ping). Cualquier usuario autenticado. */
@ApiTags('geo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('geo')
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Post('ping')
  ping(
    @CompanyId() companyId: string,
    @CurrentUser() user: User,
    @Body() dto: RecordLocationDto,
  ) {
    return this.geoService.recordLocation(user.id, companyId, dto);
  }
}

/** Consulta del recorrido en el mapa (solo admin / permiso de rutas). */
@ApiTags('geo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/geo')
export class GeoAdminController {
  constructor(private readonly geoService: GeoService) {}

  @Get('sellers')
  sellers(@Query('companyId') companyId: string) {
    return this.geoService.sellers(companyId);
  }

  @Get('route')
  route(
    @Query('companyId') companyId: string,
    @Query('sellerId') sellerId: string,
    @Query('date') date: string,
  ) {
    return this.geoService.route(companyId, sellerId, date);
  }
}
