import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByUsername(dto.username);
    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const valid = await this.usersService.validatePassword(user, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    return {
      accessToken: this.signToken(user),
      user: this.toPublicUser(user),
    };
  }

  async changePassword(user: User, dto: ChangePasswordDto) {
    const valid = await this.usersService.validatePassword(user, dto.currentPassword);
    if (!valid) {
      throw new BadRequestException('La contraseña actual es incorrecta.');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('La nueva contraseña debe ser diferente a la actual.');
    }

    await this.usersService.updatePassword(user.id, dto.newPassword);
    const updatedUser = await this.usersService.findById(user.id);
    
    return {
      accessToken: this.signToken(updatedUser),
      user: this.toPublicUser(updatedUser),
    };
  }

  private signToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      documentId: user.documentId,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  private toPublicUser(user: User) {
    return {
      id: user.id,
      documentId: user.documentId,
      email: user.email,
      name: user.name,
      role: user.role,
      siesaSellerCode: user.siesaSellerCode,
      permissions: user.permissions ?? [],
      mustChangePassword: user.mustChangePassword ?? false,
    };
  }
}
