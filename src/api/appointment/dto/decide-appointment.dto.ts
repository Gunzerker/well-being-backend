import { ApiProperty } from '@nestjs/swagger';

export class DecideAppointmentDto {
  @ApiProperty()
  appointmentId: string;
  @ApiProperty()
  decision: string;
}
