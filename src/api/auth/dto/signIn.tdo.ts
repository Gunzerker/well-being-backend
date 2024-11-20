import { privilege } from 'src/shared/enums';
import { IsEmail, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class SignInUserDto {
  @IsNotEmpty()
  @ApiProperty()
  @IsNotEmpty()
  readonly email: string;
  @ApiProperty()
  @IsNotEmpty()
  readonly password: string;
  @ApiProperty()
  //@IsNotEmpty()
  readonly notificationDeviceToken: string;
  @ApiProperty()
  platform:string;
}
