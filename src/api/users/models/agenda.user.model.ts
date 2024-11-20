import mongoose, { Schema } from 'mongoose';
import { CompanyHours, CompanyHoursSchema  } from 'src/api/companies/company.models';


export const agendaUserSchema = new mongoose.Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    vacation_from: { type: Date },
    vacation_to: { type: Date },
    hours: [CompanyHoursSchema],
  },
  { timestamps: true },
);

export class AgendaUser {
  user_id: string;
  vacation_from: Date;
  vacation_to: Date;
  hours: [CompanyHours];
}