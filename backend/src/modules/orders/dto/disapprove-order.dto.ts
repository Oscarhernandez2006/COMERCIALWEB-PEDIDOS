import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DisapproveOrderDto {
  /** Motivo de la desaprobación en cartera (opcional). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
