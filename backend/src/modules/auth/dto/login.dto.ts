import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  /** Cedula del usuario (o correo). */
  @IsString()
  @MinLength(4)
  username: string;

  @IsString()
  @MinLength(4)
  password: string;
}
