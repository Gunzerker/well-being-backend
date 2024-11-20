import mongoose, { Schema } from "mongoose"

export const PaymentSchema = new mongoose.Schema(
  {
    from: { type: Schema.Types.ObjectId, ref: 'users' },
    to: { type: Schema.Types.ObjectId, ref: 'users' },
    amount: Number,
    status: {
      type: String,
      enum: ['Pending', 'Success', 'Failed', 'Refunded'],
      default: 'Pending',
    },
    type: {
      type: String,
      enum: ['Subscription', 'Event', 'Job' , 'EventPack'],
    },
    stripe_data: Schema.Types.Mixed,
    subId: { type: Schema.Types.ObjectId, ref: 'subscriptions' },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'appointments' },
    eventPackId : {type : Schema.Types.ObjectId , ref : 'eventspacks'},
    eventId: String,
    subLength: String,
  },
  { timestamps: true },
);

export class Payment {
  _id: string;
  from: any;
  to: any;
  amount: number;
  status: string;
  type: string;
  stripe_data: any;
  subId: string;
  eventId: string;
  subLength: string;

}