import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateOrderItemDto } from './create-order.dto';
import { DeliveryScheduleDto } from './delivery-schedule.dto';
import { DeliveryType } from '../entities/order.entity';

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

  /** Fecha de entrega elegida por el vendedor (YYYY-MM-DD). */
  @IsDateString()
  @IsOptional()
  deliveryDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  /** Nota logística del pedido (instrucciones de entrega/transporte). */
  @IsString()
  @IsOptional()
  logisticsNote?: string;

  /** Tipo de entrega: despacho al cliente o recoge en planta. */
  @IsEnum(DeliveryType)
  @IsOptional()
  deliveryType?: DeliveryType;

  /** Horario/días en que el cliente puede recibir la mercancía (texto legible). */
  @IsString()
  @IsOptional()
  deliverySchedule?: string;

  /**
   * Horario de recibido estructurado (rango de días y horas). Se guarda en el
   * cliente para quedar predeterminado en los siguientes pedidos.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryScheduleDto)
  deliveryScheduleData?: DeliveryScheduleDto;
}
