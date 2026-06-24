import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { COMPANIES } from '../../common/companies';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: User) {
    return {
      id: user.id,
      documentId: user.documentId,
      email: user.email,
      name: user.name,
      role: user.role,
      siesaSellerCode: user.siesaSellerCode,
      permissions: user.permissions ?? [],
    };
  }

  /** Compañías a las que el usuario puede entrar (toma de pedidos). */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('companies')
  async companies(@CurrentUser() user: User) {
    // El admin tiene acceso a todas las compañías.
    if (user.role === UserRole.ADMIN) {
      return COMPANIES.map((c) => ({ id: c.id, name: c.name }));
    }
    const mappings = await this.usersService.findCompaniesForUser(user.id);
    return mappings
      .map((m) => COMPANIES.find((c) => c.id === m.companyId))
      .filter((c): c is (typeof COMPANIES)[number] => Boolean(c))
      .map((c) => ({ id: c.id, name: c.name }));
  }
}
