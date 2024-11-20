import { ApiProperty } from '@nestjs/swagger';

export class SignInDtro {
  @ApiProperty()
  userName: string;
  @ApiProperty()
  password: string;
}
