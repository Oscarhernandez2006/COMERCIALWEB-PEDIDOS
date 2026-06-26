import { Type } from 'class-transformer';
import { IsBoolean, IsInt, Max, Min } from 'class-validator';

/** Datos para actualizar la ventana horaria de creación de pedidos. */
export class UpdateOrderScheduleDto {
  @IsBoolean()
  enabled: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  openHour: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(59)
  openMinute: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(23)
  closeHour: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(59)
  closeMinute: number;
}
