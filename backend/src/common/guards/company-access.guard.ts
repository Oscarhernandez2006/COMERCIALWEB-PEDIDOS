import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UsersService } from '../../modules/users/users.service';
import { UserRole } from '../../modules/users/entities/user.entity';
import { isValidCompany } from '../companies';

/**
 * Verifica que el usuario autenticado tenga acceso a la compañía indicada en
 * `X-Company-Id`. Sin esto, cualquier usuario podía operar contra una compañía
 * a la que no pertenece con solo cambiar la cabecera (ruptura del aislamiento
 * entre tenants). Los administradores tienen acceso a todas las compañías.
 */
@Injectable()
export class CompanyAccessGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{
        user?: { id: string; role: UserRole };
        headers: Record<string, string | undefined>;
      }>();
    const user = request.user;
    if (!user) return true;
    if (user.role === UserRole.ADMIN) return true;

    const companyId = (request.headers['x-company-id'] ?? '').trim();
    // Si no hay compañía (o es inválida), el decorador CompanyId ya rechaza la
    // petición donde corresponde; aquí no se bloquean rutas sin tenant.
    if (!companyId || !isValidCompany(companyId)) return true;

    const hasAccess = await this.usersService.hasCompanyAccess(
      user.id,
      companyId,
    );
    if (!hasAccess) {
      throw new ForbiddenException('No tienes acceso a esta compañía.');
    }
    return true;
  }
}
