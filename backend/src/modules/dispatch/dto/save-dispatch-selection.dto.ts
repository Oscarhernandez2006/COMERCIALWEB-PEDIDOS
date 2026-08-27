import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsString,
  ValidateNested,
} from 'class-validator';

/** Estado de selección de una factura (por consecutivo). */
export class DispatchSelectionItemDto {
  @IsString()
  invoiceNumber: string;

  @IsBoolean()
  selected: boolean;
}

/** Guardado de la selección de facturas TAT para despacho. */
export class SaveDispatchSelectionDto {
  @IsArray()
  @ArrayMaxSize(10000)
  @ValidateNested({ each: true })
  @Type(() => DispatchSelectionItemDto)
  items: DispatchSelectionItemDto[];
}
