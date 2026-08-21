import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * Alta/actualización (upsert) de un usuario emitida por la suite.
 * La clave común entre sistemas es la cédula (document_id).
 */
export class ProvisionUsuarioDto {
  @IsString()
  @IsNotEmpty()
  cedula: string;

  @IsString()
  @IsOptional()
  nombre?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  rol?: string;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permisos?: string[];
}

export class EstadoDto {
  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsBoolean()
  @IsOptional()
  bloqueadoSuite?: boolean;
}

export class PasswordDto {
  @IsString()
  @MinLength(6)
  password: string;
}

export class PermisosDto {
  @IsString()
  @IsOptional()
  rol?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permisos?: string[];
}

export class CompanyPermisosDto {
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permisos?: string[];
}

export class AssignCompanyDto {
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @IsString()
  @IsOptional()
  siesaSellerCode?: string;
}
