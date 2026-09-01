import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
    gstNumber: { type: String, trim: true },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    totalPurchases: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

customerSchema.index({ name: 'text', mobile: 'text' });

export const Customer = mongoose.model('Customer', customerSchema);
