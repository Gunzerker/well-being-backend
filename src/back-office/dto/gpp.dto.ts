import { ApiProperty } from '@nestjs/swagger';

export class GppDto {
  @ApiProperty({ nullable: true })
  generalConditions?: string;
  @ApiProperty({ nullable: true })
  privacyPolicy?: string;
  @ApiProperty({ nullable: true })
  paymentRules?: string;
}
