import { ApiProperty } from '@nestjs/swagger';

export class setTokenDto {
  @ApiProperty()
  tokenDevice: string;
  @ApiProperty()
  platform: string
}
