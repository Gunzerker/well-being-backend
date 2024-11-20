import mongoose, { Schema } from 'mongoose';
import { appointStatus } from 'src/shared/enums';

export const AppointmentStatSchema = new mongoose.Schema(
  {
    userId: { type: String },
    tryNumber: { type: Number },
    type: { type: String, enum: appointStatus },
  },
  { timestamps: true },
);
export class AppointmentStat {
  _id: string;
  userId: string;
  tryNumber: number;
  type: string;
  createdAt: string;
  updatedAt: string;
}
