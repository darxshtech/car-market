import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IAdminLog extends Document {
  action: 'approve_listing' | 'reject_listing' | 'ban_user' | 'import_scraped';
  targetId: Types.ObjectId;
  targetType: 'listing' | 'user';
  details: Record<string, any>;
  timestamp: Date;
}

const AdminLogSchema = new Schema<IAdminLog>(
  {
    action: {
      type: String,
      enum: ['approve_listing', 'reject_listing', 'ban_user', 'import_scraped'],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    targetType: {
      type: String,
      enum: ['listing', 'user'],
      required: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

// Compound index for audit trail queries
AdminLogSchema.index({ targetId: 1, targetType: 1 });

const AdminLog: Model<IAdminLog> = mongoose.models.AdminLog || mongoose.model<IAdminLog>('AdminLog', AdminLogSchema);

export default AdminLog;
