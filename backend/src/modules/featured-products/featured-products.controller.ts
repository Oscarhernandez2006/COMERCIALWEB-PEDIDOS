import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FeaturedProductsService } from './featured-products.service';
import { AddFeaturedProductDto } from './dto/add-featured-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CompanyId } from '../../common/decorators/company-id.decorator';

@ApiTags('featured-products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('featured-products')
export class FeaturedProductsController {
  constructor(private readonly service: FeaturedProductsService) {}

  /** Lista los productos estrella de la compañía (vendedor y admin). */
  @Get()
  list(@CompanyId() companyId: string) {
    return this.service.list(companyId);
  }

  /** Marca un producto como estrella (solo admin). */
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  add(@CompanyId() companyId: string, @Body() dto: AddFeaturedProductDto) {
    return this.service.add(companyId, dto.sku, dto.name);
  }

  /** Quita la marca de estrella de un producto (solo admin). */
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete()
  remove(@CompanyId() companyId: string, @Query('sku') sku: string) {
    return this.service.remove(companyId, sku);
  }
}
