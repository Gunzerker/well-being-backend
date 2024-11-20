import { ApiProperty } from '@nestjs/swagger';

import { Categories } from 'aws-sdk/clients/connectcontactlens';
import { IsEmail, IsNotEmpty, Length } from 'class-validator';
import { BoolEnum } from 'sharp';
import { Category } from 'src/api/category/schemas/category.entity';

import { privilege } from 'src/shared/enums';

class Localisation {
  @ApiProperty()
  longitude: number;
  @ApiProperty()
  latitude: number;
}

export class RegisterUserDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  readonly email: string;
  //-------------
  @ApiProperty()
  @IsNotEmpty()
  @Length(6)
  readonly password: string;
  //-------------
  @ApiProperty()
  @IsNotEmpty()
  readonly firstName: string;
  //-------------
  @ApiProperty()
  relatedCompanyName: string;
  //-------------
  @ApiProperty()
  @IsNotEmpty()
  readonly lastName: string;
  //-------------
  @ApiProperty()
  readonly companyName: string;
  //-------------
  @ApiProperty()
  readonly siretNumber: string;
  //-------------
  @ApiProperty()
  readonly city: string;
  //-------------
  @ApiProperty()
  localization: Localisation;
  @ApiProperty()
  phoneNumber: string;
  //--------------

  @ApiProperty()
  readonly address: string;
  //-------------
  @ApiProperty()
  readonly postalCode: string;
  //-------------
  @ApiProperty()
  readonly jointByreferralCode: string;
  //------------
  @ApiProperty()
  @IsNotEmpty()
  readonly type: privilege;
  @ApiProperty()
  country_code: string;
  @ApiProperty()
  iso_code: string;
  @ApiProperty()
  phone_number_without_iso: string;
  @ApiProperty({ required: false })
  addedByAdmin: boolean;
  @ApiProperty({ required: false,default:"fr" })
  userLocale: string;
}

export class Employee {
  @ApiProperty()
  firstName: string;
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;
  @ApiProperty()
  profileImage: string;
}
export class CreateEmployeesDto {
  @ApiProperty({ isArray: true, type: Employee })
  Employees: [Employee];
}
export class referralCodeSenderDto {
  @ApiProperty({ isArray: true, type: String })
  emails: [string];
}
export class EmailVerifDto {
  @ApiProperty()
  email: string;
}
export class RegisterUserByAdminDto {
  @ApiProperty({ required: true })
  email: string;
  @ApiProperty({ required: true })
  firstName: string;
  @ApiProperty({ required: true })
  lastName: string;
  @ApiProperty({ required: true })
  addedByAdmin: boolean;
  @ApiProperty({ required: true, type: String })
  jobTitle: string;
  @ApiProperty({
    required: true,
    type: String,
    enum: privilege,
    default: privilege.PRO,
  })
  type: privilege;
  @ApiProperty({ required: true })
  suggestedSubCategory: string;
  @ApiProperty({ required: true })
  phoneNumber: string;
  @ApiProperty({ required: true })
  address: string;
}


export class DeleteUserDto {
  @ApiProperty({ required: true })
  id: string;
}
