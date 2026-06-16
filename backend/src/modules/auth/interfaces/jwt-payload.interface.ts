import { UserRole } from '../../users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  documentId: string;
  role: UserRole;
}
