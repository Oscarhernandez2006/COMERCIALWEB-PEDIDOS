import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByUsername(dto.username);
    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    if (user.suiteBlocked) {
      throw new UnauthorizedException(
        'Usuario bloqueado desde la suite. Contacte al administrador.',
      );
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

  /**
   * Inicia sesión con un ticket SSO emitido por la suite (SCTOOLS).
   * El ticket se canjea server-to-server contra la suite; esta devuelve la
   * cédula del usuario, con la que se busca la cuenta local y se emite un JWT
   * propio de esta aplicación. La cédula es la clave común entre sistemas.
   */
  async loginBySso(ticket: string) {
    const issuerUrl = (
      this.configService.get<string>('sso.issuerUrl') ?? ''
    ).replace(/\/+$/, '');
    const sharedSecret =
      this.configService.get<string>('sso.sharedSecret') ?? '';

    if (!issuerUrl || !sharedSecret) {
      throw new ServiceUnavailableException('SSO no está configurado');
    }

    let redeem: { cedula?: string };
    try {
      const res = await fetch(`${issuerUrl}/api/sso/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-SSO-Secret': sharedSecret,
        },
        body: JSON.stringify({ ticket }),
      });

      if (!res.ok) {
        throw new UnauthorizedException('Ticket SSO inválido o expirado');
      }

      redeem = (await res.json()) as { cedula?: string };
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      this.logger.error(
        `No se pudo contactar la suite SSO: ${String(err)}`,
      );
      throw new ServiceUnavailableException(
        'No se pudo validar la sesión con la suite',
      );
    }

    const cedula = (redeem.cedula ?? '').trim();
    if (!cedula) {
      throw new UnauthorizedException('Ticket SSO inválido');
    }

    const user = await this.usersService.findByDocumentId(cedula);
    if (!user || !user.active) {
      throw new UnauthorizedException(
        'El usuario no está registrado en esta aplicación',
      );
    }

    if (user.suiteBlocked) {
      throw new UnauthorizedException(
        'Usuario bloqueado desde la suite. Contacte al administrador.',
      );
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
