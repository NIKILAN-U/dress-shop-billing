import fs from 'fs';
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
      'receiptPrinterName',
      'labelPrinterName',
      'backupFolderPath',
      'lowStockThreshold',
      'maxCashierDiscountPercent',
      'keyboardShortcutsEnabled'
    ];

    // A bad backup folder (typo, a drive letter that's been unplugged, no
    // write permission) would otherwise fail silently until the next backup
    // is attempted — check it now, while there is still a chance to say why.
    if (req.body.backupFolderPath) {
      try {
        fs.mkdirSync(req.body.backupFolderPath, { recursive: true });
        fs.accessSync(req.body.backupFolderPath, fs.constants.W_OK);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: `Can't use "${req.body.backupFolderPath}" for backups: ${err.message}`
        });
      }
    }

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
