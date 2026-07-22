import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

export class CanalOrderItemDto {
  @IsString()
  itemRef: string;

  @IsString()
  itemName: string;

  @IsString()
  especie: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsString()
  @IsOptional()
  specifications?: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  freight?: number;
}

export class CreateCanalOrderDto {
  /** Fecha de despacho (YYYY-MM-DD). */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dispatchDate: string;

  @IsString()
  clientCode: string;

  @IsString()
  clientName: string;

  @IsString()
  @IsOptional()
  clientAddress?: string;

  @IsString()
  @IsOptional()
  clientCity?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CanalOrderItemDto)
  @ArrayMinSize(1)
  items: CanalOrderItemDto[];
}
