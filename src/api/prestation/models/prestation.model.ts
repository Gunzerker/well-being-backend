import { ApiProperty } from '@nestjs/swagger';
import mongoose, { Schema } from 'mongoose';

export const prestationSchema = new mongoose.Schema(
  {
    name: { type: String },
    duration: { type: Number },
    fee: { type: Number },
    fee_online: { type: Number },
    fee_at_home: { type: Number },
    durationv2: { type: String },
    relatedCompany: { type: Schema.Types.ObjectId, ref: 'Company' },
    onLineMeeting: { type: Boolean, default: false },
    participants: { type: Boolean, default: false },
    participantsNumber: { type: Number, default: 0 },
    at_home: { type: Boolean, default: false },
    at_business: { type: Boolean, default: false },
    participants_at_busniness: { type: Boolean, default: false },
    participantsNumber_at_busniness: { type: Number, default: 0 },
    cached: { type: Boolean, default: false },
  },
  { timestamps: true },
);
export class Prestation {
  @ApiProperty()
  _id: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  duration: number;
  @ApiProperty({ required: true })
  durationv2: string;
  @ApiProperty()
  fee: number;
  @ApiProperty()
  fee_online: number;
  @ApiProperty()
  fee_at_home: number;
  @ApiProperty({})
  onLineMeeting: boolean;
  @ApiProperty({})
  participants: boolean;
  @ApiProperty({})
  participantsNumber: number;
  @ApiProperty()
  at_home: boolean;
  @ApiProperty()
  at_business: boolean;
  @ApiProperty()
  participants_at_busniness: boolean
  @ApiProperty()
  participantsNumber_at_busniness: number
  relatedCompany: string;
  cached: boolean;
}
