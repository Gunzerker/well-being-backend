import mongoose, { Schema } from 'mongoose';

export const CouponSchema = new mongoose.Schema(
  {
    to: [{ type: String }], //EMAIL OF THE USER
    subscriptions: [{ type: Schema.Types.ObjectId, ref: 'Subscription' }],
    duration: { type: String }, // MONTHLY or YEARLY
    code: { type: String },
    percent_off: { type: Number },
    expires_at: { type: Date }, // UTC 0
  },
  { timestamps: true },
);

export class Coupon {
  _id: string;
  code: string
  percent_off:Number
  expires_at: Date
}
