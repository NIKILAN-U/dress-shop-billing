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
    // Windows printer names (from the OS printer list) so receipts and
    // barcode labels each go to their own physical device instead of both
    // competing for whatever the OS default printer happens to be. Empty
    // string falls back to the OS default.
    receiptPrinterName: { type: String, default: '' },
    labelPrinterName: { type: String, default: '' },
    // Where "Backup Database Now" writes its snapshot files, and where the
    // backup list is read from. Empty means the app-managed default location
    // (inside userData); a real path lets the shop point backups at, say, an
    // external drive.
    backupFolderPath: { type: String, default: '' },
    lowStockThreshold: { type: Number, default: 5 },
    maxCashierDiscountPercent: { type: Number, default: 10 },
    keyboardShortcutsEnabled: { type: Boolean, default: true },
    barcodeLabelWidth: { type: String, default: '50mm' },
    barcodeLabelHeight: { type: String, default: '25mm' },
    barcodeFontSize: { type: Number, default: 10 },
    barcodeHeight: { type: Number, default: 35 },
    barcodePrefix: { type: String, default: 'DSS' },
    barcodeShowPrice: { type: Boolean, default: true },
    barcodeShowProductName: { type: Boolean, default: true },
    barcodeShowSizeColor: { type: Boolean, default: true },
    barcodeShowShopName: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const ShopSettings = mongoose.model('ShopSettings', shopSettingsSchema);
