import mongoose, { Schema } from 'mongoose';
import { status } from 'src/shared/enums';

export const quotationSchema = new mongoose.Schema(
  {
    from: { type: Schema.Types.ObjectId, ref: 'User' },
    to: { type: Schema.Types.ObjectId, ref: 'User' },
    num_quo: { type: Number, default: 0 },
    status: { type: String, enum: status, default: status.PENDING },
    onLineMeeting: { type: Boolean, default: false },
    at_home: { type: Boolean, default: false },
    at_business: { type: Boolean, default: false },
    description: { type: String },
    appointment_taken: { type: Boolean, default: false },
    reply: {
      _id: false,
      type: {
        files: [String],
        name: { type: String },
        duration: Number,
        comment: String,
        onLineMeeting: { type: Boolean, default: false },
        fee: { type: Number },
      },
    },
  },
  { timestamps: true },
);
export class Reply {
  files: [string];
  duration?: number;
  comment?: string;
  name: string;
  fee: number;
  onLineMeeting: boolean;
}
export class Quotation {
  _id?: string;
  from: string;
  to: string;
  num_quo: number;
  status: status;
  description: string;
  onLineMeeting: boolean;
  at_home: boolean;
  at_business: boolean;
  reply?: Reply;
}
