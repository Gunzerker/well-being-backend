import { ApiProperty } from '@nestjs/swagger';

export class UpdateEventPackAdmin {
  @ApiProperty()
  _id: string;
  @ApiProperty()
  number_of_events: number;
  @ApiProperty()
  price: number;
  @ApiProperty()
  toSearch: any;
  @ApiProperty()
  page_number: number;
  @ApiProperty()
  page_size: number;
}