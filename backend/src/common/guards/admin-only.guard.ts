import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '../../modules/users/entities/user.entity';

/**
 * Exige rol de administrador REAL (no basta con tener un permiso de módulo
 * administrativo). Se usa en endpoints sensibles como la gestión de usuarios,
 * donde un permiso genérico de área no debe habilitar la creación/edición de
 * usuarios ni el cambio de roles/permisos.
 */
@Injectable()
export class AdminOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<{ user?: { role?: UserRole } }>().user;
    if (user?.role === UserRole.ADMIN) return true;
    throw new ForbiddenException('Se requiere rol de administrador.');
  }
}
