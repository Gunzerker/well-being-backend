import { ApiProperty } from '@nestjs/swagger';
import { scope } from 'aws-sdk/clients/ec2';
export class socialData {
  @ApiProperty()
  facebook: string;
  @ApiProperty()
  instagram: string;
  @ApiProperty()
  twitter: string;
  @ApiProperty()
  linkedIn: string;
}
export class LevelEightDto {
  @ApiProperty()
  socialMedia: socialData;
}
