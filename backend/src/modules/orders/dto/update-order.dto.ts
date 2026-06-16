import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateOrderItemDto } from './create-order.dto';

/**
 * Edición de un pedido pendiente por envío: reemplaza por completo las líneas
 * del pedido (permite agregar, quitar y cambiar cantidades/descuentos). El
 * cliente del pedido no cambia.
 */
export class UpdateOrderDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}
