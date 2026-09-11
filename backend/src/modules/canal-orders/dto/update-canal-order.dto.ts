import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { CanalOrderItemDto } from './create-canal-order.dto';

/**
 * Edición del pedido por parte del controlador (Zulma): puede ajustar fecha,
 * datos del cliente, líneas (cantidades/precios) y dejar una nota.
 */
export class UpdateCanalOrderDto {
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dispatchDate?: string;

  @IsString()
  @IsOptional()
  clientCode?: string;

  @IsString()
  @IsOptional()
  clientName?: string;

  @IsString()
  @IsOptional()
  clientAddress?: string;

  @IsString()
  @IsOptional()
  clientCity?: string;

  @IsString()
  @IsOptional()
  clientBranch?: string;

  @IsString()
  @IsOptional()
  clientPaymentTerm?: string;

  @IsString()
  @IsOptional()
  controlNote?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CanalOrderItemDto)
  @ArrayMinSize(1)
  items?: CanalOrderItemDto[];
}
