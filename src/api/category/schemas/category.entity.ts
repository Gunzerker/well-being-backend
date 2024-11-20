import mongoose, { Schema } from 'mongoose';

export const CategorySchema = new mongoose.Schema(
  {
    active: { type: Boolean, default: false },
    name: { type: String, require: true },
    content: { type: String },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      null: true,
      default: null,
    },
    imageUrl: String,
  },
  { timestamps: true },
);

export class Category {
  _id: string;
  content: any;
  name: any;
  active: boolean;
  parentCategory: any;
  imageUrl: string;
  subCategories: Category;
  createdAt: Date;
}
