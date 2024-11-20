import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserByAdminDto {
  @ApiProperty()
  _id: string;
  @ApiProperty()
  firstName: string;
  @ApiProperty()
  lastName: string;
  @ApiProperty()
  jobTitle: string;
  @ApiProperty()
  profileImage: string;
  @ApiProperty()
  active: boolean;
  @ApiProperty()
  phoneNumber: string;
  @ApiProperty()
  address: string;
  @ApiProperty()
  email: string;
  
  
}

