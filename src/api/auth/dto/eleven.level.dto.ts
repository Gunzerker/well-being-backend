import { ApiProperty } from '@nestjs/swagger';

class Hours {
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

export class LevelElevenDto {
  @ApiProperty()
  break_duration_in_minutes: number;
  @ApiProperty({isArray:true,type:Hours})
  hours: [Hours];
}
