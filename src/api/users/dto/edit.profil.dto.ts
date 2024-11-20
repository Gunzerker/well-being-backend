import { UploadedFile } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, Length } from 'class-validator';
import { Localisation } from '../models/user.model';

export class EditProfilDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    nullable: true,
    required: false,
  })
  image: Express.Multer.File | null;
  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
  })
  firstName: string | null;
  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
  })
  lastName: string | null;
  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
  })
  email: string | null;
  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
  })
  phoneNumber: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
  })
  country_code: string;

  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
  })
  iso_code: string;

  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
  })
  phone_number_without_iso: string;

  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
  })
  city: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
  })
  companyName: string;
  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
  })
  address: string;
  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
  })
  postalCode: string;
  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
    description: '<b>Exemple : {"longitude":20,"latitude":20.3}',
  })
  localization_string: string;
  localization: Localisation;
}

export class EditPasswordDto {
  @IsNotEmpty()
  @Length(8)
  @ApiProperty({ required: true })
  newPassword: string;
  @IsNotEmpty()
  @Length(8)
  @ApiProperty({ required: true })
  lastPassword: string;
}

export class ProDto {
  @ApiProperty()
  proId: string;
}


export class BackofficeNotifyUser {
  @ApiProperty({ isArray: true })
  toUserId: [string];
  @ApiProperty()
  content: string
  @ApiProperty()
  formUserId: string
}
export class BackofficeNotifyAllUser {

  @ApiProperty()
  content: string

}



export class localUserDto {

  @ApiProperty()
  userLocale: string

}

