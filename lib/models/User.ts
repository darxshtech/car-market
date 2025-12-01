import mongoose, { Schema, Document, Model } from 'mongoose';
import { encrypt, decrypt } from '../encryption';

export interface IUser extends Document {
  googleId: string;
  email: string;
  fullName: string;
  mobileNumber: string;
  documentType: 'aadhaar' | 'pan';
  documentNumber: string;
  verified: boolean;
  banned: boolean;
  createdAt: Date;
  updatedAt: Date;
  getDecryptedDocumentNumber(): string;
}

const UserSchema = new Schema<IUser>(
  {
    googleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    mobileNumber: {
      type: String,
      required: true,
    },
    documentType: {
      type: String,
      enum: ['aadhaar', 'pan'],
      required: true,
    },
    documentNumber: {
      type: String,
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    banned: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt documentNumber before saving
UserSchema.pre('save', function (next) {
  if (this.isModified('documentNumber') && this.documentNumber) {
    // Only encrypt if not already encrypted (check if it's base64)
    try {
      // If it can be decrypted, it's already encrypted
      decrypt(this.documentNumber);
    } catch {
      // Not encrypted yet, so encrypt it
      this.documentNumber = encrypt(this.documentNumber);
    }
  }
  next();
});

// Method to get decrypted document number
UserSchema.methods.getDecryptedDocumentNumber = function (): string {
  return decrypt(this.documentNumber);
};

const User: Model<IUser> = (mongoose.models && mongoose.models.User) || mongoose.model<IUser>('User', UserSchema);

export default User;
