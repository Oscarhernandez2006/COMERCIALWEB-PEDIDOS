import {
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
}
