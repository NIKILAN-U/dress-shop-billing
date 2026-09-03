import mongoose from 'mongoose';

const barcodePrintLogSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    sku: { type: String },
    variantBarcode: { type: String, required: true },
    sizeColor: { type: String },
    quantityPrinted: { type: Number, required: true, min: 1 },
    printedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    printedByName: { type: String },
    labelDimensions: { type: String, default: '50mm x 25mm' },
    printDate: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

barcodePrintLogSchema.index({ variantBarcode: 1, printDate: -1 });

export const BarcodePrintLog = mongoose.model('BarcodePrintLog', barcodePrintLogSchema);
