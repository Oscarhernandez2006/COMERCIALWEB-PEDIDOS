import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @MinLength(4)
  documentId: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  @MinLength(4)
  password: string;

  @IsEnum(UserRole)
  @IsOptional()
  role: UserRole = UserRole.SELLER;

  @IsString()
  @IsOptional()
  siesaSellerCode?: string;

  /** Presupuesto por cliente/tienda (aparte del general). */
  @IsBoolean()
  @IsOptional()
  clientBudget?: boolean;

  /** Módulos visibles para el usuario (rutas del front). Vacío = todos. */
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];
}
