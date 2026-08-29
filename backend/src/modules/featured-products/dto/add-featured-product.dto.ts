import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/** Cuerpo para marcar un producto como estrella/favorito. */
export class AddFeaturedProductDto {
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsString()
  @IsOptional()
  name?: string;
}
