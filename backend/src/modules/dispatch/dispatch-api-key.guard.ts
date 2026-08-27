import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Protege la API pública de despacho con un token fijo. El consumidor lo envía
 * en el header `x-api-key` o en el query `token`. Se compara con
 * `DISPATCH_API_TOKEN` del entorno.
 */
@Injectable()
export class DispatchApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('dispatch.apiToken');
    if (!expected) {
      throw new ServiceUnavailableException(
        'La API de despacho no está configurada (DISPATCH_API_TOKEN).',
      );
    }
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers['x-api-key'];
    const provided =
      (Array.isArray(header) ? header[0] : header) ??
      (req.query?.token as string | undefined);
    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Token de API inválido o ausente.');
    }
    return true;
  }
}
