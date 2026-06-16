import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { COMPANY_IDS } from '../../../common/companies';

export class AssignCompanyDto {
  @ApiProperty({ enum: COMPANY_IDS, description: 'ID de la compañía' })
  @IsString()
  @IsIn(COMPANY_IDS)
  companyId: string;

  @ApiProperty({ required: false, description: 'Código de vendedor en Siesa' })
  @IsOptional()
  @IsString()
  siesaSellerCode?: string;
}
