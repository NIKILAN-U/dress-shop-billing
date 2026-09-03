import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  variantBarcode: { type: String, required: true },
  size: { type: String, required: true },
  color: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  mrp: { type: Number, default: 0 },
  purchasePrice: { type: Number, default: 0 }, // stored for net profit calculations
  discountAmount: { type: Number, default: 0 },
  taxPercent: { type: Number, default: 0 },
  cgstAmount: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  staff: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  staffId: { type: String, trim: true },
  staffName: { type: String, trim: true },
  commissionType: { type: String, enum: ['Percentage', 'Fixed'] },
  commissionValue: { type: Number, default: 0 },
  commissionAmount: { type: Number, default: 0 }
});

const paymentSplitSchema = new mongoose.Schema({
  method: { type: String, enum: ['Cash', 'UPI', 'Card', 'BankTransfer'], required: true },
  amount: { type: Number, required: true, min: 0 },
  referenceNo: { type: String, trim: true }
});

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    customerName: { type: String, default: 'Walk-in Customer' },
    customerMobile: { type: String, default: '' },
    cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cashierName: { type: String },
    items: [saleItemSchema],
    subtotal: { type: Number, required: true },
    itemDiscountTotal: { type: Number, default: 0 },
    billDiscountTotal: { type: Number, default: 0 },
    taxableAmount: { type: Number, required: true },
    cgstTotal: { type: Number, default: 0 },
    sgstTotal: { type: Number, default: 0 },
    igstTotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Card', 'BankTransfer', 'Mixed'], default: 'Cash' },
    payments: [paymentSplitSchema],
    status: { type: String, enum: ['Completed', 'Returned', 'PartiallyReturned', 'Cancelled'], default: 'Completed' },
    notes: { type: String }
  },
  { timestamps: true }
);

saleSchema.index({ invoiceNumber: 1, createdAt: -1, cashier: 1, customer: 1 });

export const Sale = mongoose.model('Sale', saleSchema);
