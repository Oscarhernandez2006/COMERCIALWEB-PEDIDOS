import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('No tienes permisos para esta accion');
    }
    if (requiredRoles.includes(user.role)) {
      return true;
    }

    // Acceso por permisos: el rol solo diferencia al usuario; el acceso a un
    // módulo lo decide el permiso asignado. Un usuario con un permiso del área
    // administrativa puede usar los endpoints de esa área aunque su rol no
    // coincida. Se aceptan tanto los permisos GLOBALES del usuario como los
    // asignados por COMPAÑÍA (según la compañía de la petición).
    if (requiredRoles.includes(UserRole.ADMIN)) {
      const globalPerms: string[] = Array.isArray(user.permissions)
        ? user.permissions
        : [];
      if (globalPerms.some((p) => this.isAdminPermission(p))) {
        return true;
      }

      const companyId = this.resolveCompanyId(request);
      if (companyId) {
        const companies = await this.usersService.findCompaniesForUser(user.id);
        const mapping = companies.find((c) => c.companyId === companyId);
        const companyPerms: string[] = Array.isArray(mapping?.permissions)
          ? (mapping!.permissions as string[])
          : [];
        if (companyPerms.some((p) => this.isAdminPermission(p))) {
          return true;
        }
      }
    }

    throw new ForbiddenException('No tienes permisos para esta accion');
  }

  /** ¿El permiso corresponde a un módulo del área administrativa? */
  private isAdminPermission(permission: unknown): boolean {
    return typeof permission === 'string' && permission.startsWith('/admin');
  }

  /** Compañía de la petición (query `companyId` o cabecera `x-company-id`). */
  private resolveCompanyId(request: {
    query?: Record<string, unknown>;
    headers?: Record<string, unknown>;
  }): string | undefined {
    const fromQuery = request.query?.companyId;
    if (typeof fromQuery === 'string' && fromQuery.trim()) {
      return fromQuery.trim();
    }
    const fromHeader = request.headers?.['x-company-id'];
    if (typeof fromHeader === 'string' && fromHeader.trim()) {
      return fromHeader.trim();
    }
    return undefined;
  }
}
