import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CompanyId } from '../../common/decorators/company-id.decorator';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  findAll(@CompanyId() companyId: string, @Query('search') search?: string) {
    return this.customersService.findAll(companyId, search);
  }

  @Get(':id')
  findOne(@CompanyId() companyId: string, @Param('id') id: string) {
    return this.customersService.findOne(companyId, id);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('sync')
  sync(@CompanyId() companyId: string) {
    return this.customersService.syncFromSiesa(companyId);
  }
}
