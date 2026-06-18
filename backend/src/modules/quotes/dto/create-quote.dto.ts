import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateQuoteItemDto {
  /** Referencia/SKU del producto en la lista de precios del cliente. */
  @IsString()
  sku: string;

  /** Cantidad cotizada (unidades enteras), mínimo 1. */
  @IsInt()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discountPct?: number = 0;
}

export class CreateQuoteDto {
  @IsUUID()
  customerId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteItemDto)
  items: CreateQuoteItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;

  /** Días de vigencia de la cotización (por defecto 15). */
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  validityDays?: number;
}
