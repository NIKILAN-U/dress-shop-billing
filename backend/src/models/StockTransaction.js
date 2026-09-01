import mongoose from 'mongoose';

const stockTransactionSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    variantId: { type: String },
    variantBarcode: { type: String, required: true },
    size: { type: String, required: true },
    color: { type: String, required: true },
    type: {
      type: String,
      enum: ['Opening', 'Purchase', 'Sale', 'SalesReturn', 'PurchaseReturn', 'Adjustment'],
      required: true
    },
    quantity: { type: Number, required: true }, // positive or negative
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    referenceDocNumber: { type: String },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String }
  },
  { timestamps: true }
);

stockTransactionSchema.index({ product: 1, variantBarcode: 1, createdAt: -1 });

export const StockTransaction = mongoose.model('StockTransaction', stockTransactionSchema);
