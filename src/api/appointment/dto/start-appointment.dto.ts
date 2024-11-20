import { ApiProperty } from '@nestjs/swagger';

export class StartAppointmentDto {
  @ApiProperty()
  appointmentId: string;
}
