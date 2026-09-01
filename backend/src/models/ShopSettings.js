import mongoose from 'mongoose';

const shopSettingsSchema = new mongoose.Schema(
  {
    shopName: { type: String, default: 'ELEGANCE DRESS SHOP' },
    tagline: { type: String, default: 'Premium Fashion & Ethnic Wear' },
    logoUrl: { type: String, default: '' },
    address: { type: String, default: '123 Commercial Street, Main Market, City' },
    phone: { type: String, default: '+91 98765 43210' },
    email: { type: String, default: 'contact@elegancedress.com' },
    gstNumber: { type: String, default: '33AAAAA0000A1Z5' },
    invoicePrefix: { type: String, default: 'INV-2026-' },
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
