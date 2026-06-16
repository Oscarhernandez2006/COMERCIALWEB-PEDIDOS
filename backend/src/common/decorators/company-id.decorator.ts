import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { isValidCompany } from '../companies';

/**
 * Extrae y valida la compañía activa desde el header `X-Company-Id`.
 * Garantiza el aislamiento por compañía: toda operación debe indicar
 * sobre qué compañía actúa. Si falta o es inválida, rechaza la petición.
 */
export const CompanyId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const companyId = request.headers['x-company-id'] as string | undefined;
    if (!isValidCompany(companyId)) {
      throw new BadRequestException(
        'Compañía inválida o no especificada (X-Company-Id)',
      );
    }
    return companyId;
  },
);
