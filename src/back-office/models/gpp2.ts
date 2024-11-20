import { ApiProperty } from '@nestjs/swagger';
import { APIGateway } from 'aws-sdk';
import mongoose from 'mongoose';

export const GppSchema = new mongoose.Schema(
  {
    id: { type: String },
    generalConditions: { type: String },
    privacyPolicy: { type: String },
    paymentRules: { type: String },
    politiqueCookies: { type: String },
    conditionsVente: { type: String },
    locale:{type:String}

  },
  { timestamps: true },
);

export class Gpp {
  _id: string;
  @ApiProperty()
  id: string;
  generalConditions: string;
  @ApiProperty()
  privacyPolicy: string;
  @ApiProperty()
  paymentRules: string;
  @ApiProperty()
  politiqueCookies: string;
  @ApiProperty()
  conditionsVente: string;
  @ApiProperty()
  locale: string
}

export class GppDto {
 
  generalConditions: string;
  @ApiProperty()
  privacyPolicy: string;
  @ApiProperty()
  paymentRules: string;
  @ApiProperty()
  politiqueCookies: string;
  @ApiProperty()
  conditionsVente: string;
}
