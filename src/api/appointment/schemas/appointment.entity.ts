import mongoose, { Schema } from 'mongoose';
import { Company } from 'src/api/companies/company.models';
import { Payment } from 'src/api/payment/schemas/payment.entity';
import { Prestation } from 'src/api/prestation/models/prestation.model';
import { User } from 'src/api/users/models/user.model';

const toSchema = new mongoose.Schema(
  {
    to: { type: Schema.Types.ObjectId, ref: 'User' },
    accept_status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Refused'],
      default: 'Pending',
    },
    assigned_by_user: { type: Boolean, default: true },
  },
  { _id: false },
);

export const AppointmentInstanceSchema = new mongoose.Schema({
  to: { type: Schema.Types.ObjectId, ref: 'User' },
  start_date: { type: Date },
  end_date: { type: Date },
  prestation: { type: Schema.Types.ObjectId, ref: 'Prestation' },
  attending_members: { type: Number, default: 0 },
  twilio_data: { type: Schema.Types.Mixed },
});

export const AppointmentBusinessInstanceSchema = new mongoose.Schema({
  to: { type: Schema.Types.ObjectId, ref: 'User' },
  start_date: { type: Date },
  end_date: { type: Date },
  prestation: { type: Schema.Types.ObjectId, ref: 'Prestation' },
  attending_members: { type: Number, default: 0 },
})

export class AppointmentBusinessInstance {
  to: string;
  from_date: { type: Date };
  to_date: { type: Date };
  prestation: { type: Schema.Types.ObjectId; ref: 'Prestation' };
  attending_members: { type: Number; default: 0 };
}
//@ts-ignore
export const AppointmentSchema = new mongoose.Schema(
  {
    start_date: { type: Date },
    old_start_date: { type: Date },
    end_date: { type: Date },
    old_end_date: { type: Date },
    canceled_by: { type: Schema.Types.ObjectId, ref: 'User' },
    from: { type: Schema.Types.ObjectId, ref: 'User' },
    to: { type: Schema.Types.ObjectId, ref: 'User' },
    assigned_employees: { type: [{ type: toSchema }], default: [] },
    company: { type: Schema.Types.ObjectId, ref: 'Company' },
    payment_id: { type: Schema.Types.ObjectId, ref: 'Payment' },
    prestations: { type: [Schema.Types.ObjectId], ref: 'Prestation' },
    duration: { type: Number },
    total_amount: { type: Number },
    level: { type: Number, default: 0 }, // 0 is admin level , 1 is employee level
    status: {
      type: String,
      enum: ['Pending', 'Accepted', 'Refused', 'PostPoned', 'Canceled'],
      default: 'Pending',
    },
    active: { type: Boolean, default: false },
    at_home: { type: Boolean, default: false },
    at_business: { type: Boolean, default: false },
    online: { type: Boolean, default: false },
    multi_business: { type: Boolean, default: false },
    appointmentMultiInstance : {type:Schema.Types.ObjectId , ref: 'AppointmentBusinessInstance'},
    appointmentInstance: {
      type: Schema.Types.ObjectId,
      ref: 'AppointmentInstance',
    },
    started: { type: Boolean, default: false },
    finished: { type: Boolean, default: false },
    comments: { type: String },
    startedAt: { type: Date },
    duration_without_break: { type: Number },
    break: { type: Number },
    participantsNumber: { type: Number, default: 0 },
    no_show:{type: Boolean , default:false}
  },
  { timestamps: true },
);

export class Appointment {
  start_date: Date;
  end_date: Date;
  old_start_date: Date;
  from: User;
  to: User;
  assigned_employees: any;
  company: Company;
  payment_id: Payment;
  prestations: [Prestation];
  appointmentInstance: any;
  canceled_by: any;
  status: {
    type: String;
    enum: ['Pending', 'Accepted', 'Refused'];
    default: 'Pending';
  };
  no_show:boolean
  multi_business:boolean
  appointmentMultiInstance:any
}

export class AppointmentInstance {
  to: string;
  from_date: { type: Date };
  to_date: { type: Date };
  prestation: { type: Schema.Types.ObjectId; ref: 'Prestation' };
  attending_members: { type: Number; default: 0 };
  twilio_data: { type: Schema.Types.Mixed };
}
