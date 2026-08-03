import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres.' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
    message:
      'La contraseña debe tener al menos una mayúscula, una minúscula y un número.',
  })
  newPassword: string;
}
