import { ArrayNotEmpty, IsArray, IsInt, Matches, Max, Min } from 'class-validator';

/**
 * Horario de recibido de mercancía: días seleccionados (0=Lunes … 6=Domingo)
 * y rango de horas en formato "HH:mm". Se guarda en el cliente para quedar
 * predeterminado en los siguientes pedidos.
 */
export class DeliveryScheduleDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  days: number[];

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'hourFrom debe tener formato HH:mm',
  })
  hourFrom: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'hourTo debe tener formato HH:mm',
  })
  hourTo: string;
}
