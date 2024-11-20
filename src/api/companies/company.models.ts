import { ApiProperty } from '@nestjs/swagger';
import mongoose, { Schema } from 'mongoose';
import { geoJsonEnum } from 'src/shared/enums';
import { Category } from '../category/schemas/category.entity';
import { Prestation } from '../prestation/models/prestation.model';
import { Localisation, User } from '../users/models/user.model';

const PointSchema = new mongoose.Schema({
  type: {
    type: String, // Don't do `{ location: { type: String } }`
    enum: geoJsonEnum, // 'location.type' must be 'Point'
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
  },
});

export class locationJson {
  @ApiProperty({ type: String, enum: geoJsonEnum, default: geoJsonEnum.POINT })
  type: geoJsonEnum;
  @ApiProperty({ type: Number, isArray: true, default: [0, 0] })
  coordinates: [number];
}
export class CompanyAddress {
  @ApiProperty()
  name: string;
  @ApiProperty()
  ray: number;
  @ApiProperty({ type: locationJson })
  location: locationJson;
}

export const CompanyHoursSchema = new mongoose.Schema({
  day: { type: Boolean },
  day_outside: { type: Boolean },
  day_home: { type: Boolean },
  day_from_hours: { type: Date },
  day_to_hours: { type: Date },
  mid_day: { type: Boolean },
  mid_day_outside: { type: Boolean },
  mid_day_home: { type: Boolean },
  mid_day_from_hours: { type: Date },
  mid_day_to_hours: { type: Date },
});

const CertificatSchema = new mongoose.Schema({
  syndicate_name: { type: String },
  certificat_name: { type: String },
});

export const CompanySchema = new mongoose.Schema(
  {
    companyLogo: { type: String },
    companyName: { type: String },
    reletedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    companyPhoneNumber: { type: String },
    description: { type: String },
    onLineMeeting: { type: Boolean, default: false },
    participants: { type: Boolean, default: false },
    participantsNumber: { type: Number },
    address: {
      name: { type: String },
      ray: { type: Number },
      location: { type: PointSchema, index: '2dsphere' },
    },
    categories: { type: [Schema.Types.ObjectId], ref: 'Category' },
    prestations: { type: [Schema.Types.ObjectId], ref: 'Prestation' },
    break_duration_in_minutes: Number,
    hours: [CompanyHoursSchema],
    part_of_syndicate: { type: Boolean },
    syndicate_name: { type: String },
    certifications: [{ type: CertificatSchema }],
    socialMedia: {
      type: {
        facebook: String,
        instagram: String,
        twitter: String,
        linkedIn: String,
      },
    },
    cover_images: [{ type: String }],
    employees: { type: [Schema.Types.ObjectId], ref: 'User' },
    boutique_images: [{ type: String }],
    portfolio_images: [{ type: String }],
    show_public_employees: { type: Boolean , default:true },
    job: { type: String },
    company_country_code: { type: String },
    company_iso_code: { type: String },
    company_phone_number_without_iso: { type: String },
    no_tva:{type:Boolean , default:false}
  },
  { timestamps: true },
);

export class CompanyHours {
  day: boolean;
  day_outside: boolean;
  day_home: boolean;
  day_from_hours: Date;
  day_to_hours: Date;
  mid_day: boolean;
  mid_day_outside: boolean;
  mid_day_home: boolean;
  mid_day_from_hours: Date;
  mid_day_to_hours: Date;
}

class Certificat {
  syndicate_name: string;
  certificat_name: string;
}

export class Social {
  @ApiProperty()
  facebook: string;
  @ApiProperty()
  instagram: string;
  @ApiProperty()
  twitter: string;
  @ApiProperty()
  linkedIn: string;
}
export class Company {
  _id: string;
  companyLogo: string;
  companyPhoneNumber: string;
  description: string;
  onLineMeeting: boolean;
  participants: number;
  address: CompanyAddress;
  categories: [string];
  reletedTo: string;
  prestations: [Prestation];
  employees:any
  break_duration_in_minutes: number;
  hours: [CompanyHours];
  certifications: [Certificat];
  socialMedia: [Social];
  cover_images: [string];
  boutique_images: [{ type: String }];
  portfolio_images: [{ type: String }];
  show_public_employees: boolean;
  job: string;
  companyName: string;
  company_country_code: string;
  company_iso_code: string;
  company_phone_number_without_iso: string;
  no_tva:boolean
  // favouritedBy: [User];
}

export class Benefit {}
