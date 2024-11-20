import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class EmailPoke {
  @ApiProperty({ required: true })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
