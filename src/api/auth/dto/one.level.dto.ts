import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { CompanyAddress } from 'src/api/companies/company.models';

export class categorieDto {
  @ApiProperty()
  parent_cat?: string;
  @ApiProperty()
  cat_id: string;
  @ApiProperty()
  cat_name: string;
}
export class OneLevelDto {
  @ApiProperty({ isArray: true, type: categorieDto })
  categories: [
    {
      parent_cat?: string;
      cat_id: string;
      cat_name: string;
    },
  ];
}

export class TowLevelDto {
  @ApiProperty({ type: 'string', format: 'binary', nullable: true , required:false})
  image: Express.Multer.File;
  @IsNotEmpty()
  @ApiProperty()
  companyName: string;
  @ApiProperty()
  jobTitle: string;
  @IsNotEmpty()
  @ApiProperty()
  companyPhoneNumber: string;
  @ApiProperty()
  description: string;
  @IsNotEmpty()
  @ApiProperty()
  company_country_code: string;
  @ApiProperty()
  company_iso_code: string;
  @ApiProperty()
  company_phone_number_without_iso: string;
  @ApiProperty({required:false})
  no_tva : boolean
}

export class ThreeLevelDto {
  @ApiProperty({ type: CompanyAddress })
  address: CompanyAddress;
}
