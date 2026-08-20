import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNumber,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ClientBudgetItemDto {
  @IsString()
  clientCode: string;

  @IsNumber()
  @Min(0)
  targetKilos: number;

  @IsNumber()
  @Min(0)
  expectedRevenue: number;
}

export class SaveClientBudgetsDto {
  @IsString()
  sellerId: string;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(2000)
  year: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientBudgetItemDto)
  items: ClientBudgetItemDto[];
}
