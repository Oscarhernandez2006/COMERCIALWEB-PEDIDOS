import { IsNumber, IsOptional } from 'class-validator';

export class RecordLocationDto {
  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsNumber()
  @IsOptional()
  accuracy?: number;
}
