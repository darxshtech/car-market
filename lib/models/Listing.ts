import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IListing extends Document {
  sellerId: Types.ObjectId;
  brand: string;
  carModel: string;
  variant: string;
  fuelType: 'petrol' | 'diesel' | 'cng' | 'electric';
  transmission: 'manual' | 'automatic';
  yearOfOwnership: number;
  numberOfOwners: number;
  kmDriven: number;
  city: string;
  state: string;
  description: string;
  price: number;
  images: string[];
  status: 'pending' | 'approved' | 'rejected' | 'sold';
  interestCount: number;
  source: 'user' | 'scraped';
  createdAt: Date;
  updatedAt: Date;
}

const ListingSchema = new Schema<IListing>(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    brand: {
      type: String,
      required: true,
    },
    carModel: {
      type: String,
      required: true,
    },
    variant: {
      type: String,
      required: true,
    },
    fuelType: {
      type: String,
      enum: ['petrol', 'diesel', 'cng', 'electric'],
      required: true,
    },
    transmission: {
      type: String,
      enum: ['manual', 'automatic'],
      required: true,
    },
    yearOfOwnership: {
      type: Number,
      required: true,
    },
    numberOfOwners: {
      type: Number,
      required: true,
    },
    kmDriven: {
      type: Number,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    images: {
      type: [String],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'sold'],
      default: 'pending',
      index: true,
    },
    interestCount: {
      type: Number,
      default: 0,
    },
    source: {
      type: String,
      enum: ['user', 'scraped'],
      default: 'user',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for search optimization
ListingSchema.index({ brand: 1, city: 1, price: 1 });
ListingSchema.index({ createdAt: -1 });

const Listing: Model<IListing> = (mongoose.models && mongoose.models.Listing) || mongoose.model<IListing>('Listing', ListingSchema);

export default Listing;
