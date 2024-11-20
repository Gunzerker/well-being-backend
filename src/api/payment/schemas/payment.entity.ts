import mongoose, { Schema } from "mongoose"

export const PaymentSchema = new mongoose.Schema(
  {
    from: { type: Schema.Types.ObjectId, ref: 'User' },
    to: { type: Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    status: {
      type: String,
      enum: ['Pending', 'Success', 'Failed', 'Refunded'],
      default: 'Pending',
    },
    type: {
      type: String,
      enum: ['Subscription', 'Event', 'Job', 'EventPack', 'Transfert' , 'Export'],
    },
    stripe_data: Schema.Types.Mixed,
    sub_occurance: { type: Number, default: 0 },
    subId: { type: Schema.Types.ObjectId, ref: 'Subscription' },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    eventPackId: { type: Schema.Types.ObjectId, ref: 'EventsPack' },
    eventId: { type: Schema.Types.ObjectId, ref: 'Events' },
    subLength: String,
    expiration_date : {type : Date},
    extra:{type:Boolean},
    coupon:{type:String},
    reference:{type:String}
  },
  { timestamps: true },
);
PaymentSchema.post('save',async (doc,next)=>{
  if (!doc.reference){
    doc.reference = String(new Date(doc["createdAt"]).getTime())
    await doc.save()
}
})


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
  coupon:string
}