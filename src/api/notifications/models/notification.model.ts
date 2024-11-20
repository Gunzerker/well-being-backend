import { User } from 'aws-sdk/clients/budgets';
import mongoose, { Schema } from 'mongoose';
import { notifStatus, notifTag } from 'src/shared/enums';

export class Content {
  title: string;
  body: string;
}

// export const NotifContentSchema = new mongoose.Schema({
//   title: { type: String },
//   body: { type: String },
//   tag:
// });
export const NotificationSchema = new mongoose.Schema(
  {
    from: { type: Schema.Types.ObjectId, ref: 'User' },
    to: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: notifStatus, default: notifStatus.UNREAD },
    content: { type: String, default: null },
    data: { type: Object, default: {} },
  },
  { timestamps: true },
);

export class Notification {
  _id?: string;
  from: User;
  to: User;
  status?: string;
  data?: any;
  content: any;
  createdAt: string;
}
export class NotificationDto {
  from: string;
  to: string;
  data?: any;
  content: any;
}
