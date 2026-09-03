import mongoose from 'mongoose';

const shopSettingsSchema = new mongoose.Schema(
  {
    shopName: { type: String, default: 'AURA TEXTILES' },
    tagline: { type: String, default: 'AURA — THE CLOTHING BRAND (Retail & Wholesale)' },
    logoUrl: { type: String, default: '' },
    address: { type: String, default: 'W-12, SF.NO.594, Markkayankottai Road, Near Vilangu Karuppana Samy Kovil, Chinnamanur, Theni Dist, Tamil Nadu - 625515' },
    phone: { type: String, default: '+91 98765 43210' },
    email: { type: String, default: 'contact@auratextiles.com' },
    gstNumber: { type: String, default: '33HYUPP3790R1Z1' },
    invoicePrefix: { type: String, default: 'AURA-2026-' },
    nextInvoiceNumber: { type: Number, default: 1001 },
    currencySymbol: { type: String, default: '₹' },
    enableGst: { type: Boolean, default: true },
    defaultGstRate: { type: Number, default: 5 },
    receiptWidth: { type: String, enum: ['58mm', '80mm', 'A4'], default: '80mm' },
    lowStockThreshold: { type: Number, default: 5 },
    maxCashierDiscountPercent: { type: Number, default: 10 },
    keyboardShortcutsEnabled: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const ShopSettings = mongoose.model('ShopSettings', shopSettingsSchema);
