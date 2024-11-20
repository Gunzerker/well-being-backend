import { ApiProperty } from '@nestjs/swagger';

class AssignedUser {
  @ApiProperty()
  to: string;
  @ApiProperty()
  assigned_by_user: boolean;
}
export class UpdateAppointmentDto {
  @ApiProperty({ type: AssignedUser, nullable: false, isArray: true })
  userId: [AssignedUser];
  @ApiProperty()
  appointmentId: string;
  @ApiProperty()
  refused: boolean;
}
