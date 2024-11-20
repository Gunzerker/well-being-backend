import { ApiProperty } from '@nestjs/swagger';


class CompanyHours {
  @ApiProperty()
  day: boolean;
  @ApiProperty()
  day_outside: boolean;
  @ApiProperty()
  day_home: boolean;
  @ApiProperty()
  day_from_hours: string;
  @ApiProperty()
  day_to_hours: string;
  @ApiProperty()
  mid_day: boolean;
  @ApiProperty()
  mid_day_outside: boolean;
  @ApiProperty()
  mid_day_home: boolean;
  @ApiProperty()
  mid_day_from_hours: string;
  @ApiProperty()
  mid_day_to_hours: string;
}

export class agendaUserDto {
  @ApiProperty()
  break_duration_in_minutes:Number
  @ApiProperty()
  vacation_from: Date;
  @ApiProperty()
  vacation_to: Date;
  @ApiProperty({ isArray: true, type: CompanyHours })
  hours: [CompanyHours];
}
