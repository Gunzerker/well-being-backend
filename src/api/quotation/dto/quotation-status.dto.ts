import { ApiProperty } from '@nestjs/swagger';

export class GetQuotationDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  appointment_status: string;
}

export class GetQuotationComptableDto {
  @ApiProperty()
  from_date: Date;
  @ApiProperty()
  to_date: Date;
  @ApiProperty()
  search:string
}
