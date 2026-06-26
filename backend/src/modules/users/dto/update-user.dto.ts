import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

/** Datos editables de un usuario. Todos los campos son opcionales. */
export class UpdateUserDto {
  @IsString()
  @MinLength(4)
  @IsOptional()
  documentId?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  /** Si se envía, se cambia la contraseña. Si se omite, se conserva la actual. */
  @IsString()
  @MinLength(4)
  @IsOptional()
  password?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsString()
  @IsOptional()
  siesaSellerCode?: string;
}
