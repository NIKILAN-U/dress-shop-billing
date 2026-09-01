import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
    gstNumber: { type: String, trim: true },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    notes: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

export const Supplier = mongoose.model('Supplier', supplierSchema);
