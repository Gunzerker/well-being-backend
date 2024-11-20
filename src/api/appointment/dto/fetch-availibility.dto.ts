import { ApiProperty } from '@nestjs/swagger';

export class FetchAvailibilityDto {
  @ApiProperty()
  appointmentId: string;
}
