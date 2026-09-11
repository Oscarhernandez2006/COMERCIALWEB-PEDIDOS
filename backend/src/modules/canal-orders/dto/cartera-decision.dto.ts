import { IsOptional, IsString } from 'class-validator';

/** Decisión de cartera al rechazar un pedido por cupo. */
export class CarteraDecisionDto {
  /** Nota u observación de cartera (opcional al aprobar). */
  @IsString()
  @IsOptional()
  note?: string;

  /** Motivo del rechazo (obligatorio al rechazar, se notifica al vendedor). */
  @IsString()
  @IsOptional()
  reason?: string;
}
