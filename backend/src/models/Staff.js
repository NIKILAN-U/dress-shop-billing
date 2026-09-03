import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema(
  {
    staffId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    joiningDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

staffSchema.index({ staffId: 1, status: 1, name: 'text' });

export const Staff = mongoose.model('Staff', staffSchema);
