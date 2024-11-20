import mongoose, { Schema } from 'mongoose';
import { Subscription } from 'rxjs';
import { User } from 'src/api/users/models/user.model';

export const EventsSchema = new mongoose.Schema(
  {
    image_name: { type: String },
    owner: { type: Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      default: 'Public',
      enum: ['Public', 'Private'],
    },
    face_to_face: { type: Boolean, default: false },
    on_line: { type: Boolean, default: false },
    price_face_to_face: { type: Number, default: 0 },
    price_on_line: { type: Number, default: 0 },
    number_of_participant_face_to_face: { type: Number, default: 0 },
    number_of_participant_on_line: { type: Number, default: 0 },
    address: { type: String },
    city: { type: String },
    lat: { type: Number },
    lng: { type: Number },
    activity: { type: Schema.Types.ObjectId, ref: 'Category' },
    event_name: { type: String },
    start_date: { type: Date },
    end_date: { type: Date },
    event_url: { type: String },
    status: { type: String, default: 'Active', enum: ['Active', 'Canceled'] },
    description: { type: String },
    twilio_data: { type: Schema.Types.Mixed },
    started: { type: Boolean, default: false },
    ended: { type: Boolean, default: false },
    formation : {type:Boolean , default:false}
  },
  { timestamps: true },
);

export class Events {
  type: string;
  owner: string;
  face_to_face: boolean;
  on_line: boolean;
  price_face_to_face: number;
  price_on_line: number;
  number_of_participant_face_to_face: number;
  number_of_participant_on_line: number;
  address: string;
  city: string;
  lat: string;
  lng: string;
  activity: string;
  event_name: string;
  start_date: Date;
  end_date: Date;
}


export const TheNextSchema = new mongoose.Schema(
  {
    toNotif: { type: Schema.Types.ObjectId, ref: 'User' },
    event: { type: Schema.Types.ObjectId, ref: 'Events' },
    comparativeDate: { type: Date },
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    notifPayload: { type: Schema.Types.ObjectId, ref: 'User' },
    soonInD: { type: Number },
    soonInH: { type: Number },
    soonInM: { type: Number },
    type: { type: String, enum: ['event', 'appointment', 'subscription'] },
    fridayNodif:{type:Boolean}
  },
  { timestamps: true },
);

export class TheNext { 
  toNotif: any;
  event: any;
  comparativeDate: string
  appointment: string
  notifPayload: string
  soonInD:number
  soonInH: number
  soonInM: number
  type: string
  fridayNodif:boolean
}