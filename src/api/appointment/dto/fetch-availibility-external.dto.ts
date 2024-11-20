import { ApiProperty } from '@nestjs/swagger';

export class FetchAvailibilityExternalDto {
  @ApiProperty()
  start_date: Date;
  @ApiProperty({ type: String, nullable: false, isArray: true })
  prestation: [string];
  @ApiProperty()
  at_home: boolean;
  @ApiProperty()
  at_business: boolean
}
