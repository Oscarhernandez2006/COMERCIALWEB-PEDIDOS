import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PriceListsService } from './price-lists.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CompanyId } from '../../common/decorators/company-id.decorator';

@ApiTags('price-lists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('price-lists')
export class PriceListsController {
  constructor(private readonly priceListsService: PriceListsService) {}

  /** Listas de precios disponibles para la compañía. */
  @Get()
  findLists(@CompanyId() companyId: string) {
    return this.priceListsService.findLists(companyId);
  }

  /** Ítems (referencias y precios) de una lista. */
  @Get(':listCode/items')
  findItems(
    @CompanyId() companyId: string,
    @Param('listCode') listCode: string,
    @Query('search') search?: string,
  ) {
    return this.priceListsService.findItems(companyId, listCode, search);
  }

  /** Sincroniza las listas de precios desde Siesa (solo admin). */
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('sync')
  sync(@CompanyId() companyId: string) {
    return this.priceListsService.syncFromSiesa(companyId);
  }
}
