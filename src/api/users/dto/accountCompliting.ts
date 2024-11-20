import { ApiProperty } from '@nestjs/swagger';

import { Diplomas } from '../models/deplomas';
import { ProAvailablity } from '../models/proAvailablty';
import { Localisation, User } from '../models/user.model';

export class AccountComplitingDto {
  @ApiProperty()
  categorie: [string];
  //-----------------------------
  @ApiProperty()
  logo: string;
  //-----------------------------
  @ApiProperty()
  companyName: string;
  //-----------------------------
  @ApiProperty()
  phoneNumber: string;
  //-----------------------------
  @ApiProperty()
  Description: string;
  //-----------------------------
  @ApiProperty()
  onLineMeeting: boolean;
  //-----------------------------
  @ApiProperty()
  address: Localisation;
  //-----------------------------

  //-----------------------------
  @ApiProperty()
  listoOfEmployee: [User];
  //-----------------------------
  @ApiProperty()
  gallery: [string];
  //-----------------------------
  @ApiProperty()
  diplomas: [Diplomas];
  //-----------------------------
  @ApiProperty()
  socilaMedia: [string];
  //-----------------------------
  @ApiProperty()
  jointByreferralCode: string;
  //-----------------------------
  @ApiProperty()
  availablity: [ProAvailablity];
  //-----------------------------
}
