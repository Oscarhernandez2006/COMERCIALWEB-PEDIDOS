import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import type { ProjectionMode } from '../entities/projection.entity';

/** Guardado de la proyección de ventas de una compañía para un mes. */
export class SaveProjectionDto {
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(2000)
  year: number;

  @IsIn(['month', 'day'])
  mode: ProjectionMode;

  /** Valor en pesos (total del mes o de un día hábil según el modo). */
  @IsNumber()
  @Min(0)
  revenue: number;

  /** Valor en kilos (total del mes o de un día hábil según el modo). */
  @IsNumber()
  @Min(0)
  kilos: number;

  /** Días hábiles seleccionados (fechas 'YYYY-MM-DD'). */
  @IsArray()
  @IsString({ each: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true })
  workingDays: string[];
}
