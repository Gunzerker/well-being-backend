import { ApiProperty } from '@nestjs/swagger';

export enum statusEnum {
  PENDING = 'Pending',
  POSTPONED = 'PostPoned',
  ACCEPTED = 'Accepted',
  REFUSED = 'Refused',
  CANCELED = 'Canceled'
}

export class FetchAppointmentByDateDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  start_date: string;
  @ApiProperty()
  end_date: string;
  @ApiProperty()
  searchText: string;
  @ApiProperty()
  status: statusEnum;
  @ApiProperty()
  page_number: number;
  @ApiProperty()
  page_size: number;
}
