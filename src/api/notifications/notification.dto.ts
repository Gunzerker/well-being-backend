import { ApiProperty } from '@nestjs/swagger';

export class PayloadNotificationTestDto {
  @ApiProperty()
  message: string;
  @ApiProperty()
  option: string;
  @ApiProperty()
  deviceToken: string;
}
