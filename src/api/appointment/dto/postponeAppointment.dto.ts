import { ApiProperty } from '@nestjs/swagger';

export class PostponeAppointmentDto {
  @ApiProperty()
  appointmentId: string;
  @ApiProperty()
  new_start_time: string;
}
