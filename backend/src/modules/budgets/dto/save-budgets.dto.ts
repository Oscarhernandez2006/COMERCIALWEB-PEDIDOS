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

export class BudgetItemDto {
  @IsString()
  sellerId: string;

  @IsNumber()
  @Min(0)
  targetKilos: number;

  @IsNumber()
  @Min(0)
  expectedRevenue: number;
}

export class SaveBudgetsDto {
  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(2000)
  year: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BudgetItemDto)
  items: BudgetItemDto[];
}
