import mongoose from 'mongoose';

const returnItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  variantBarcode: { type: String, required: true },
  size: { type: String, required: true },
  color: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  refundUnitPrice: { type: Number, required: true },
  totalRefund: { type: Number, required: true },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  staffId: { type: String, trim: true },
  staffName: { type: String, trim: true },
  reversedCommissionAmount: { type: Number, default: 0 }
});

const returnSchema = new mongoose.Schema(
  {
    returnNumber: { type: String, required: true, unique: true },
    originalSale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', required: true },
    originalInvoiceNumber: { type: String, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String },
    items: [returnItemSchema],
    totalRefundAmount: { type: Number, required: true },
    refundMethod: { type: String, enum: ['Cash', 'UPI', 'StoreCredit'], default: 'Cash' },
    reason: { type: String, trim: true },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    processedByName: { type: String }
  },
  { timestamps: true }
);

export const Return = mongoose.model('Return', returnSchema);
