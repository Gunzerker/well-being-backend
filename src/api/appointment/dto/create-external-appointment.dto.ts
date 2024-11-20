import { ApiProperty } from '@nestjs/swagger';

export class CreateExternalAppointmentDto {
  @ApiProperty()
  client_name: string;
  @ApiProperty({ isArray: true, type: String })
  assigned_employees: [string];
  @ApiProperty({ isArray: true, type: String })
  prestationId: [string];
  @ApiProperty()
  at_home: boolean;
  @ApiProperty()
  at_business: boolean;
  @ApiProperty()
  start_date: Date;
  @ApiProperty()
  comments: string;
}
