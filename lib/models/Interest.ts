import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IInterest extends Document {
  listingId: Types.ObjectId;
  userId: Types.ObjectId;
  createdAt: Date;
}

const InterestSchema = new Schema<IInterest>(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound unique index to prevent duplicate interests
InterestSchema.index({ listingId: 1, userId: 1 }, { unique: true });
// Index for counting interests per listing
InterestSchema.index({ listingId: 1 });

const Interest: Model<IInterest> = (mongoose.models && mongoose.models.Interest) || mongoose.model<IInterest>('Interest', InterestSchema);

export default Interest;
