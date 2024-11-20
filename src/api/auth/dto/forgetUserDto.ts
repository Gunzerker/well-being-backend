import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class ForgetPasswordDto {
  @IsNotEmpty()
  @ApiProperty()
  email: string;
}
