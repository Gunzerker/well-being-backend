import { ApiProperty } from '@nestjs/swagger';

export class CreateEventspackDto {
  @ApiProperty()
  number_of_events: number;
  @ApiProperty()
  price: number;
}
