import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

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

  @IsString()
  @IsOptional()
  notes?: string;
}
