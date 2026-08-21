import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';

/**
 * Protege las rutas de aprovisionamiento (server-to-server desde la suite).
 * Valida la cabecera `X-SSO-Secret` contra el secreto compartido `sso.sharedSecret`.
 */
@Injectable()
export class SharedSecretGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const secret = this.config.get<string>('sso.sharedSecret') ?? '';
    if (!secret) {
      throw new ServiceUnavailableException(
        'El aprovisionamiento no está configurado',
      );
    }

    const req = context.switchToHttp().getRequest<Request>();
    const provided = String(req.headers['x-sso-secret'] ?? '');

    const a = Buffer.from(provided);
    const b = Buffer.from(secret);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedException('No autorizado');
    }
    return true;
  }
}
