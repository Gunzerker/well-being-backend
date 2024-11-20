import { ApiProperty } from '@nestjs/swagger';
import mongoose from 'mongoose';

const VisibilitySchema = new mongoose.Schema({
  annuaire: { type: Boolean },
  presonalisation: { type: Boolean },
  priority: { type: Boolean },
  banner: { type: Boolean },
});

const FonctionalitySchema = new mongoose.Schema({
  client_demandes: { type: Boolean },
  client_validation: { type: Boolean },
  planning: { type: Boolean },
  facturation: { type: Boolean },
  events: { type: Boolean },
  exports: { type: Boolean },
  table: { type: Boolean },
  no_show: { type: Boolean },
  intervents: { type: Boolean },
});

const DimensionnementSchema = new mongoose.Schema({
  team_size: { type: Number },
  team_unlimited: { type: Boolean },
  pricing_monthly: { type: Number },
  pricing_yearly: { type: Number },
  extras_monthly_stripe_id: { type: String },
  extras_yearly_stripe_id: { type: String },
});

export const SubscriptionSchema = new mongoose.Schema(
  {
    name: String,
    subscriptionName: [{ label: String, language: String }],
    monthly_payment: Number,
    monthly_payment_extras: Number,
    monthly_payment_with_extra_id: String,
    yearly_payment: Number,
    yearly_payment_extras: Number,
    yearly_payment_with_extra_id: String,
    monthly_payment_id: String,
    yearly_payment_id: String,
    visibility: { _id: false, type: VisibilitySchema },
    fonctionality: { _id: false, type: FonctionalitySchema },
    unlimited_teams: { type: Boolean },
    availabe_team: { type: Number, default: 0 },
    dimensionnement: [{ _id: false, type: DimensionnementSchema }],
    cached: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export class Strings {
  @ApiProperty()
  label: string;
  @ApiProperty()
  language: string;
}

export class Visibility {
  @ApiProperty()
  annuaire: boolean;
  @ApiProperty()
  presonalisation: boolean;
  @ApiProperty()
  priority: boolean;
  @ApiProperty()
  banner: boolean;
}

export class Fonctionality {
  @ApiProperty()
  client_demandes: boolean;
  @ApiProperty()
  client_validation: boolean;
  @ApiProperty()
  planning: boolean;
  @ApiProperty()
  facturation: boolean;
  @ApiProperty()
  events: boolean;
  @ApiProperty()
  exports: boolean;
  @ApiProperty()
  table: boolean;
  @ApiProperty()
  no_show: boolean;
  @ApiProperty()
  intervents: boolean;
}

export class Dimensionnement {
  @ApiProperty()
  team_size: number;
  @ApiProperty()
  team_unllimited: boolean;
  @ApiProperty()
  pricing_monthly: number;
  @ApiProperty()
  pricing_yearly: number;
  extras_monthly_stripe_id: string;
  extras_yearly_stripe_id: string;
}

export class SubscriptionName {
  @ApiProperty()
  label: string;
  @ApiProperty()
  language: string;
}
export class Subscription {
  _id: string;
  name: string;
  monthly_payment: number;
  monthly_payment_extras: number;
  monthly_payment_with_extra_id: string;
  yearly_payment: number;
  yearly_payment_extras: number;
  yearly_payment_with_extra_id: string;
  monthly_payment_id: string;
  yearly_payment_id: string;
  visibility: Visibility;
  fonctionality: Fonctionality;
  unlimited_teams: boolean;
  availabe_team: number;
  dimensionnement: [Dimensionnement];
  cached: boolean;
}
//---------------------------------------------------------------------- test

const TestVisibilitySchema = new mongoose.Schema({
  annuaire: { type: Boolean },
  presonalisation: { type: Boolean },
  priority: { type: Boolean },
  banner: { type: Boolean },
});

const TestFonctionalitySchema = new mongoose.Schema({
  client_demandes: { type: Boolean },
  client_validation: { type: Boolean },
  planning: { type: Boolean },
  facturation: { type: Boolean },
  events: { type: Boolean },
  exports: { type: Boolean },
  table: { type: Boolean },
  no_show: { type: Boolean },
  intervents: { type: Boolean },
});

const TestDimensionnementSchema = new mongoose.Schema({
  team_size: { type: Number },
  team_unlimited: { type: Boolean },
  pricing_monthly: { type: Number },
  pricing_yearly: { type: Number },
});

export const TestSubscriptionSchema = new mongoose.Schema(
  {
    name: String,
    subscriptionName: [{ label: String, language: String }],
    monthly_payment: Number,
    monthly_payment_extras: Number,
    monthly_payment_with_extra_id: String,
    yearly_payment: Number,
    yearly_payment_extras: Number,
    yearly_payment_with_extra_id: String,
    monthly_payment_id: String,
    yearly_payment_id: String,
    visibility: { _id: false, type: VisibilitySchema },
    fonctionality: { _id: false, type: FonctionalitySchema },
    unlimited_teams: { type: Boolean },
    availabe_team: { type: Number, default: 0 },
    dimensionnement: [{ _id: false, type: DimensionnementSchema }],
  },
  { timestamps: true },
);

export class TestStrings {
  @ApiProperty()
  label: string;
  @ApiProperty()
  language: string;
}

export class TestVisibility {
  @ApiProperty()
  annuaire: boolean;
  @ApiProperty()
  presonalisation: boolean;
  @ApiProperty()
  priority: boolean;
  @ApiProperty()
  banner: boolean;
}

export class TestFonctionality {
  @ApiProperty()
  client_demandes: boolean;
  @ApiProperty()
  client_validation: boolean;
  @ApiProperty()
  planning: boolean;
  @ApiProperty()
  facturation: boolean;
  @ApiProperty()
  events: boolean;
  @ApiProperty()
  exports: boolean;
  @ApiProperty()
  table: boolean;
  @ApiProperty()
  no_show: boolean;
  @ApiProperty()
  intervents: boolean;
}

export class TestDimensionnement {
  @ApiProperty()
  team_size: number;
  @ApiProperty()
  team_unllimited: boolean;
  @ApiProperty()
  pricing_monthly: number;
  @ApiProperty()
  pricing_yearly: number;
}

export class TestSubscriptionName {
  @ApiProperty()
  label: string;
  @ApiProperty()
  language: string;
}
export class TestSubscription {
  _id: string;
  name: string;
  monthly_payment: number;
  monthly_payment_extras: number;
  monthly_payment_with_extra_id: string;
  yearly_payment: number;
  yearly_payment_extras: number;
  yearly_payment_with_extra_id: string;
  monthly_payment_id: string;
  yearly_payment_id: string;
  visibility: Visibility;
  fonctionality: Fonctionality;
  unlimited_teams: boolean;
  availabe_team: number;
  dimensionnement: [Dimensionnement];
}
