import mongoose, { Schema } from 'mongoose';

export const favouriteSchema = new mongoose.Schema(
  {
    fromClient: { type: Schema.Types.ObjectId, ref: 'User' },
    toPro: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
export class Favourite {
  _id: string;

  fromClient: string;

  toPro: string;
}
