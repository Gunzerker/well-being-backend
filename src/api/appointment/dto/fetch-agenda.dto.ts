import { ApiProperty } from '@nestjs/swagger';

export class FetchAgendaDto {
  @ApiProperty()
  start_date: Date;
  @ApiProperty()
  end_date: Date;
  @ApiProperty()
  employeeId: string;
}
