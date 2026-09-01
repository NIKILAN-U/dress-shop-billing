import mongoose from 'mongoose';

const variantSchema = new mongoose.Schema({
  size: { type: String, required: true, trim: true },
  color: { type: String, required: true, trim: true },
  barcode: { type: String, required: true, trim: true },
  stock: { type: Number, default: 0, min: 0 }
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subcategory: { type: String, trim: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand' },
    gender: { type: String, enum: ['Men', 'Women', 'Kids', 'Unisex'], default: 'Unisex' },
    description: { type: String, trim: true },
    purchasePrice: { type: Number, required: true, default: 0 },
    sellingPrice: { type: Number, required: true, default: 0 },
    mrp: { type: Number, required: true, default: 0 },
    taxPercent: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0 },
    minStockLevel: { type: Number, default: 5 },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    variants: [variantSchema]
  },
  { timestamps: true }
);

// Indexes for fast searching
productSchema.index({ name: 'text', sku: 'text' });
productSchema.index({ 'variants.barcode': 1 });

export const Product = mongoose.model('Product', productSchema);
