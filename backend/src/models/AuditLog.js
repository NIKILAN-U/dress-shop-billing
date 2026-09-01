import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String },
    userRole: { type: String },
    action: { type: String, required: true },
    module: { type: String, required: true },
    recordId: { type: String },
    details: { type: String },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String }
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1, module: 1, action: 1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
