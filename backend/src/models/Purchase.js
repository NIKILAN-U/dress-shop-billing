import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  variantBarcode: { type: String, required: true },
  size: { type: String, required: true },
  color: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  purchasePrice: { type: Number, required: true, min: 0 },
  taxPercent: { type: Number, default: 0 },
  total: { type: Number, required: true }
});

const purchaseSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, trim: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    supplierName: { type: String },
    purchaseDate: { type: Date, default: Date.now },
    items: [purchaseItemSchema],
    subtotal: { type: Number, required: true },
    taxTotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['Paid', 'Partial', 'Pending'], default: 'Paid' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

purchaseSchema.index({ invoiceNumber: 1, supplier: 1 });

export const Purchase = mongoose.model('Purchase', purchaseSchema);
