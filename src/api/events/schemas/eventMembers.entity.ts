import mongoose, { Schema } from 'mongoose';
import { User } from 'src/api/users/models/user.model';

export const EventsMembersSchema = new mongoose.Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    eventId: { type: Schema.Types.ObjectId, ref: 'Events' },
    status: {
      type: String,
      default: 'Pending',
      enum: ['Pending', 'Invited', 'Accepted', 'Refunded'],
    },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    online: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export class EventsMembers {
  userId: string;
  eventId: string;
  status: string;
  paymentId: string;
  online: boolean;
}
