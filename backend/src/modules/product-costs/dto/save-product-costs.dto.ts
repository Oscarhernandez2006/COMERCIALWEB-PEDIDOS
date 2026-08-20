import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ProductCostItemDto {
  @IsString()
  productRef: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  unitCost: number;
}

export class SaveProductCostsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductCostItemDto)
  items: ProductCostItemDto[];
}
