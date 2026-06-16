import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

/**
 * Inyecta el usuario autenticado (o una de sus propiedades) en el handler.
 * Uso: @CurrentUser() user: User  |  @CurrentUser('id') id: string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User;
    return data ? user?.[data] : user;
  },
);
