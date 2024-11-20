import { ApiProperty } from '@nestjs/swagger';
import { Company } from 'src/api/companies/company.models';
import { privilege, ratingDirection, relationships } from 'src/shared/enums';
import mongoose, { Schema } from 'mongoose';
import { Subscription } from 'src/back-office/models/subscription.model';

import { Quotation } from 'src/api/quotation/model/model.quotation';
import { Category } from 'src/api/category/schemas/category.entity';
import { Favourite } from 'src/api/favourite/models/favourite.model';
import { bool } from 'aws-sdk/clients/signer';

export class Localisation {
  @ApiProperty()
  longitude: string;
  @ApiProperty()
  latitude: string;
}
export const RelationshipShema = new mongoose.Schema(
  {
    proId: { type: Schema.Types.ObjectId, ref: 'User' },
    _idProInMyNetwork: { type: Schema.Types.ObjectId, ref: 'User' },
    _idclientInMyNetwork: { type: Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: relationships },
  },
  { timestamps: true },
);

export class Relationship {
  _id: string;
  proId: string;
  _idProInMyNetwork: string;
  _idclientInMyNetwork: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}
export const ReferredShema = new mongoose.Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    AlreadyReferredEmail: { type: String },
  },
  { timestamps: true },
);

export class Referred {
  _id: string;
  userId: string;
  AlreadyReferredEmail: string;
  createdAt: string;
  updatedAt: string;
}

export const RatingShema = new mongoose.Schema(
  {
    from: { type: Schema.Types.ObjectId, ref: 'User' },
    to: { type: Schema.Types.ObjectId, ref: 'User' },
    value: { type: Number, default: 0, enum: [0, 1, 2, 3, 4, 5] },
    comment: { type: String },
    appointementOrInstanceId: {
      type: String,
    },

    type: { type: String, enum: ratingDirection },
    flagedByAdmin: { type: Boolean, default: false },
  },
  { timestamps: true },
);
export class Rating {
  _id: string;
  from: string;
  to: string;
  value: number;
  comment: string;
  appointementOrInstanceId: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  flagedByAdmin: boolean;
}

export const UserSchema = new mongoose.Schema(
  {
    type: { type: String, enum: privilege },
    accountVerified: { type: Boolean, default: false },
    email: { type: String, unique: true },
    password: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    jobTitle: { type: String },
    companyName: { type: String, null: true },
    relatedCompany: { type: Schema.Types.ObjectId, ref: 'Company' },
    siretNumber: { type: String, null: true },
    city: { type: String, null: true },
    phoneNumber: { type: String },
    address: { type: String },
    postalCode: { type: String },
    referralCode: { type: String, null: true },
    notificationDeviceToken: { type: [String] },
    profileImage: { type: String },
    gallery: { type: [String] },
    themeColor: { type: String },
    localization: { type: { longitude: String, latitude: String }, null: true },
    configurationLevel: { type: Number, default: 0 },
    subscription_expiration_date: { type: Date },
    stripe_customer_id: { type: String },
    subscription: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null,
    },
    payed_extras: { type: Boolean, default: false },
    available_team_members: { type: Number, default: 0 },
    unlimited_team_members: { type: Boolean, default: false },
    subscription_start_date: { type: Date },
    stripe_account_id: { type: String },
    stripe_account_data: { type: Schema.Types.Mixed },
    referralCodeLink: { type: String },
    referralLeadsCodeLink: { type: String },
    country_code: { type: String },
    iso_code: { type: String },
    phone_number_without_iso: { type: String },
    available: { type: Boolean, default: true },
    addedByAdmin: { type: Boolean, require: false, default: false },
    title: { type: String, require: false },
    suggestedSubCategory: { type: Schema.Types.ObjectId, ref: 'Category' },
    available_events: { type: Number, default: 10 },
    isFav: { type: Boolean },
    active: { type: Boolean, default: true },
    rating: {
      default: { ratingNote: 0.0, totalRating: 0, shownStarsNumber: 0 },
      _id: false,
      type: {
        ratingNote: { type: Number },
        totalRating: { type: Number },
        shownStarsNumber: { type: Number },
      },
    },
    userAgenda: { type: Schema.Types.ObjectId, ref: 'AgendaUser' },
    ca: { type: Number, default: 0 },
    c_notif_for_appointemnt_accepted: { type: Boolean },
    ep_notif_ask_for_demande: { type: Boolean },
    a_notif_before_appointment: { type: Boolean },
    a_notif_new_rating: { type: Boolean },
    a_notif_prestation_finished: { type: Boolean },
    p_notif_payment: { type: Boolean },
    p_notif_new_event_signup: { type: Boolean },
    pc_notif_posp_or_dec_appointment: { type: Boolean },
    c_notif_begin_event_soon: { type: Boolean },
    appointmentStatPosPTryNumber: { type: Number, default: 0 },
    appointmentStatCanTryNumber: { type: Number, default: 0 },
    total_appointments: { type: Number, default: 0 },
    no_show: { type: Boolean },
    badgeCounter: { type: Number, default: 0 },
    deleted: { type: Boolean, default: false },
    platform: { type: String, default: null },
    took_signup_events: { type: Boolean, default: false },
    userLocale:{type:String,default: "fr" }
  },

  { timestamps: true },
);
export class Rate {
  ratingNote: number;
  totalRating: number;
  shownStarsNumber: number;
}
export class User {
  _id: string;
  type: privilege;
  accountVerified: boolean;
  email: string;
  password: string;
  firstName: string;
  phoneNumber: string;
  lastName: string;
  companyName: string;
  siretNumber: string;
  city: string;
  relatedCompany: Company;
  address: string;
  postalCode: string;
  available_events: number;
  localization: Localisation;
  referralCode: string;
  notificationDeviceToken: [string];
  profileImage: string;
  gallery: [string];
  themeColor: string;
  configurationLevel: number;
  subscription: Subscription;
  stripe_customer_id: string;
  subscription_expiration_date: Date;
  subscription_start_date: Date;
  available_team_members: number;
  unlimited_team_members: boolean;
  payed_extras: boolean;
  stripe_account_id: String;
  stripe_account_data: any;
  referralCodeLink: string;
  country_code: string;
  iso_code: string;
  phone_number_without_iso: string;
  addedByAdmin: boolean;
  jobTitle: string;
  createdAt: string;
  referralLeadsCodeLink: string;
  suggestedSubCategory: Category;
  rating: Rate;
  isFav: boolean;
  active: boolean;
  c_notif_for_appointemnt_accepted: Boolean;
  ep_notif_ask_for_demande: Boolean; //
  a_notif_before_appointment: Boolean;
  a_notif_new_rating: Boolean;
  a_notif_prestation_finished: Boolean;
  p_notif_payment: Boolean; //
  p_notif_new_event_signup: Boolean; //
  pc_notif_posp_or_dec_appointment: Boolean; //
  c_notif_begin_event_soon: Boolean;
  total_appointments: number;

  appointmentStatPosPTryNumber: number;
  appointmentStatCanTryNumber: number;
  no_show: boolean;
  badgeCounter: number;
  deleted: boolean
  platform
  took_signup_events: boolean;
  userLocale:string
}
export const PockeShema = new mongoose.Schema(
  {
    from: { type: Schema.Types.ObjectId, ref: 'User' },
    to: { type: Schema.Types.ObjectId, ref: 'User' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
export class Pocke {
  _id: string;
  from: User;
  to: User;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
