import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/entities/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('No tienes permisos para esta accion');
    }
    if (requiredRoles.includes(user.role)) {
      return true;
    }

    // Acceso por permisos: un usuario al que se le asignaron módulos de un
    // área puede usar los endpoints de esa área aunque su rol no coincida.
    const permissions: string[] = Array.isArray(user.permissions)
      ? user.permissions
      : [];
    if (
      requiredRoles.includes(UserRole.ADMIN) &&
      permissions.some((p) => typeof p === 'string' && p.startsWith('/admin'))
    ) {
      return true;
    }

    throw new ForbiddenException('No tienes permisos para esta accion');
  }
}
