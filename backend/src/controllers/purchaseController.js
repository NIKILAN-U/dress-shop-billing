import { Purchase } from '../models/Purchase.js';
import { Supplier } from '../models/Supplier.js';
import { updateVariantStock } from '../services/stockService.js';
import { logAudit } from '../middleware/auditLogger.js';

export const getPurchases = async (req, res) => {
  try {
    const purchases = await Purchase.find()
      .populate('supplier', 'name phone')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: purchases.length, purchases });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPurchaseById = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate('supplier')
      .populate('createdBy', 'name');

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase record not found' });
    }

    res.json({ success: true, purchase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPurchase = async (req, res) => {
  try {
    const {
      invoiceNumber,
      supplierId,
      purchaseDate,
      items,
      subtotal,
      taxTotal,
      discount,
      grandTotal,
      paidAmount
    } = req.body;

    if (!invoiceNumber || !supplierId || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Purchase invoice details and items are required' });
    }

    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const paid = Number(paidAmount || 0);
    const balance = Number(grandTotal) - paid;
    let paymentStatus = 'Paid';
    if (balance > 0 && paid > 0) paymentStatus = 'Partial';
    if (paid === 0) paymentStatus = 'Pending';

    const purchase = await Purchase.create({
      invoiceNumber,
      supplier: supplier._id,
      supplierName: supplier.name,
      purchaseDate: purchaseDate || new Date(),
      items,
      subtotal,
      taxTotal: taxTotal || 0,
      discount: discount || 0,
      grandTotal,
      paidAmount: paid,
      balanceAmount: balance,
      paymentStatus,
      createdBy: req.user._id
    });

    // Automatically increase stock for each purchased variant
    for (const item of items) {
      await updateVariantStock({
        productId: item.product,
        barcode: item.variantBarcode,
        quantity: item.quantity,
        type: 'Purchase',
        referenceId: purchase._id,
        referenceDocNumber: purchase.invoiceNumber,
        user: req.user,
        notes: `Stock increased via Purchase Invoice #${purchase.invoiceNumber}`
      });
    }

    // Update supplier balance if pending amount exists
    if (balance > 0) {
      supplier.currentBalance += balance;
      await supplier.save();
    }

    await logAudit({
      user: req.user,
      action: 'CREATE_PURCHASE',
      module: 'PURCHASES',
      recordId: purchase._id,
      details: `Created Purchase Invoice #${purchase.invoiceNumber} for ₹${purchase.grandTotal} from ${supplier.name}`,
      req
    });

    res.status(201).json({ success: true, purchase });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
