import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { AssignCompanyDto } from './dto/assign-company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { COMPANIES } from '../../common/companies';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    const users = await this.usersService.findAll();
    return Promise.all(users.map((u) => this.toView(u)));
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return this.toView(user);
  }

  /** Edita la información de un usuario. */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.usersService.update(id, dto);
    return this.toView(user);
  }

  /** Elimina un usuario y sus accesos por compañía. */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { ok: true };
  }

  @Patch(':id/active')
  async setActive(
    @Param('id') id: string,
    @Body('active') active: boolean,
  ) {
    const user = await this.usersService.setActive(id, active);
    return this.toView(user);
  }

  /** Define los módulos visibles del usuario (rutas del front). */
  @Patch(':id/permissions')
  async setPermissions(
    @Param('id') id: string,
    @Body('permissions') permissions: string[],
  ) {
    const user = await this.usersService.setPermissions(id, permissions ?? []);
    return this.toView(user);
  }

  /** Define los módulos visibles del usuario EN una compañía especifica. */
  @Patch(':id/companies/:companyId/permissions')
  async setCompanyPermissions(
    @Param('id') id: string,
    @Param('companyId') companyId: string,
    @Body('permissions') permissions: string[],
  ) {
    await this.usersService.setCompanyPermissions(
      id,
      companyId,
      permissions ?? [],
    );
    const user = await this.usersService.findById(id);
    return this.toView(user);
  }

  /** Asigna (o actualiza) el acceso del usuario a una compañía con su código. */
  @Post(':id/companies')
  async assignCompany(
    @Param('id') id: string,
    @Body() dto: AssignCompanyDto,
  ) {
    await this.usersService.assignCompany(
      id,
      dto.companyId,
      dto.siesaSellerCode,
    );
    const user = await this.usersService.findById(id);
    return this.toView(user);
  }

  @Delete(':id/companies/:companyId')
  async removeCompany(
    @Param('id') id: string,
    @Param('companyId') companyId: string,
  ) {
    await this.usersService.removeCompany(id, companyId);
    const user = await this.usersService.findById(id);
    return this.toView(user);
  }

  private async toView(user: User) {
    const mappings = await this.usersService.findCompaniesForUser(user.id);
    return {
      id: user.id,
      documentId: user.documentId,
      email: user.email,
      name: user.name,
      role: user.role,
      active: user.active,
      permissions: user.permissions ?? [],
      createdAt: user.createdAt,
      companies: mappings.map((m) => ({
        companyId: m.companyId,
        name: COMPANIES.find((c) => c.id === m.companyId)?.name ?? m.companyId,
        siesaSellerCode: m.siesaSellerCode,
        permissions: m.permissions ?? [],
      })),
    };
  }
}
