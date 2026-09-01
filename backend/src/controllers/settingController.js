import { ShopSettings } from '../models/ShopSettings.js';
import { logAudit } from '../middleware/auditLogger.js';

export const getSettings = async (req, res) => {
  try {
    let settings = await ShopSettings.findOne();
    if (!settings) {
      settings = await ShopSettings.create({});
    }
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSettings = async (req, res) => {
  try {
    let settings = await ShopSettings.findOne();
    if (!settings) {
      settings = new ShopSettings();
    }

    const fields = [
      'shopName',
      'tagline',
      'logoUrl',
      'address',
      'phone',
      'email',
      'gstNumber',
      'invoicePrefix',
      'nextInvoiceNumber',
      'currencySymbol',
      'enableGst',
      'defaultGstRate',
      'receiptWidth',
      'lowStockThreshold',
      'maxCashierDiscountPercent',
      'keyboardShortcutsEnabled'
    ];

    const oldValue = settings.toObject();

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field];
      }
    });

    await settings.save();

    await logAudit({
      user: req.user,
      action: 'UPDATE_SETTINGS',
      module: 'SETTINGS',
      details: 'Updated shop configuration settings',
      oldValue,
      newValue: settings.toObject(),
      req
    });

    res.json({ success: true, message: 'Settings saved successfully', settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
