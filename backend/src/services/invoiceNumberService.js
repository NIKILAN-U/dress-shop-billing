import { ShopSettings } from '../models/ShopSettings.js';

export const generateNextInvoiceNumber = async () => {
  let settings = await ShopSettings.findOne();
  if (!settings) {
    settings = await ShopSettings.create({});
  }

  const prefix = settings.invoicePrefix || 'INV-2026-';
  const currentNum = settings.nextInvoiceNumber || 1001;

  // Format with padding e.g., INV-2026-001001
  const paddedNum = String(currentNum).padStart(6, '0');
  const invoiceNumber = `${prefix}${paddedNum}`;

  // Increment counter atomically
  settings.nextInvoiceNumber = currentNum + 1;
  await settings.save();

  return invoiceNumber;
};
