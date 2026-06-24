import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { DeliveryScheduleDto } from './delivery-schedule.dto';
import { DeliveryType } from '../entities/order.entity';

export class CreateOrderItemDto {
  /** Referencia/SKU del producto en la lista de precios del cliente. */
  @IsString()
  sku: string;

  /** Cantidad: se vende de uno en uno (unidades enteras), mínimo 1. */
  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discountPct?: number = 0;
}

export class CreateOrderDto {
  @IsUUID()
  customerId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  /** Fecha de entrega elegida por el vendedor (YYYY-MM-DD). */
  @IsDateString()
  deliveryDate: string;

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
