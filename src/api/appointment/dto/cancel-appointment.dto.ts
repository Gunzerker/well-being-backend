import { ApiProperty } from '@nestjs/swagger';

export class CancelAppointmentDto {
  @ApiProperty()
  appointmentId: string;
}
