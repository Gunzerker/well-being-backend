import mongoose, { Schema } from 'mongoose';

export const walletSchema = new mongoose.Schema(
  {
    proId: { type: Schema.Types.ObjectId, ref: 'User' },
    amount : {type:Number , default:0},
  },
  { timestamps: true },
);

export class Wallet {
  proId?: string;
  amount: string;
}
