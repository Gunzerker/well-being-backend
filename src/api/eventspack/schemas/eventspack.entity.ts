import mongoose from 'mongoose';

export const EventsPackSchema = new mongoose.Schema(
  {
   number_of_events : {type : Number , default:0},
   price : {type: Number , default : 0}
  },
  { timestamps: true },
);

export class EventsPack {
   number_of_events : number
   price : number
}
