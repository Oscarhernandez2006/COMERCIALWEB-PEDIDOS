import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CancelOrderDto {
  /** Motivo de la anulación del pedido (obligatorio). */
  @IsString()
  @IsNotEmpty({ message: 'Debe indicar el motivo de la anulación.' })
  @MaxLength(500)
  reason: string;
}
