import { Sale } from '../models/Sale.js';
import { Customer } from '../models/Customer.js';
import { ShopSettings } from '../models/ShopSettings.js';
import { updateVariantStock } from '../services/stockService.js';
import { generateNextInvoiceNumber } from '../services/invoiceNumberService.js';
import { logAudit } from '../middleware/auditLogger.js';
import { resolveCommissionTerms, calculateCommission } from '../utils/commission.js';

export const getSales = async (req, res) => {
  try {
    const { startDate, endDate, customer, cashier, paymentMethod, status, search } = req.query;

    const query = {};

    if (status) query.status = status;
    if (customer) query.customer = customer;
    if (cashier) query.cashier = cashier;
    if (paymentMethod) query.paymentMethod = paymentMethod;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { invoiceNumber: searchRegex },
        { customerName: searchRegex },
        { customerMobile: searchRegex }
      ];
    }

    // Cashiers only see their own sales if specified in business policy, but here cashiers can view history
    const sales = await Sale.find(query)
      .populate('cashier', 'name username')
      .populate('customer', 'name mobile')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: sales.length, sales });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('cashier', 'name username')
      .populate('customer');

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale invoice not found' });
    }

    res.json({ success: true, sale });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createSale = async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      customerMobile,
      items,
      subtotal,
      itemDiscountTotal,
      billDiscountTotal,
      taxableAmount,
      cgstTotal,
      sgstTotal,
      igstTotal,
      taxTotal,
      roundOff,
      grandTotal,
      paymentMethod,
      payments,
      notes
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart items cannot be empty' });
    }

    // Enforce Cashier Discount Limit if user is cashier
    if (req.user.role === 'cashier') {
      const settings = await ShopSettings.findOne();
      const maxDiscountPercent = settings?.maxCashierDiscountPercent || 10;
      const totalDiscount = (Number(itemDiscountTotal || 0) + Number(billDiscountTotal || 0));
      const grossSubtotal = Number(subtotal || 1);
      const discountPercentage = (totalDiscount / grossSubtotal) * 100;

      if (discountPercentage > maxDiscountPercent) {
        return res.status(403).json({
          success: false,
          message: `Cashiers are only permitted to give up to ${maxDiscountPercent}% discount. (Requested: ${discountPercentage.toFixed(1)}%)`
        });
      }
    }

    // Generate unique sequential invoice number
    const invoiceNumber = await generateNextInvoiceNumber();

    // Verify and handle Customer reference
    let customerDoc = null;
    if (customerId) {
      customerDoc = await Customer.findById(customerId);
    } else if (customerMobile) {
      customerDoc = await Customer.findOne({ mobile: customerMobile.trim() });
    }

    // Prepare Sale items & perform stock reduction with rollback safety
    const processedItems = [];
    const updatedVariantsLog = [];

    try {
      for (const item of items) {
        // Deduct stock for variant
        const { product, variant } = await updateVariantStock({
          productId: item.product,
          barcode: item.variantBarcode,
          quantity: -item.quantity, // negative for sale reduction
          type: 'Sale',
          referenceDocNumber: invoiceNumber,
          user: req.user,
          notes: `POS Sale Invoice #${invoiceNumber}`
        });

        updatedVariantsLog.push({
          productId: product._id,
          barcode: item.variantBarcode,
          quantity: item.quantity
        });

        const { commissionType: commType, commissionValue: commVal } =
          resolveCommissionTerms(item, product);
        const commAmount = item.staff
          ? calculateCommission(item.totalAmount, { commissionType: commType, commissionValue: commVal })
          : 0;

        processedItems.push({
          product: product._id,
          productName: product.name,
          variantBarcode: item.variantBarcode,
          size: item.size || variant.size,
          color: item.color || variant.color,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          mrp: item.mrp || product.mrp,
          purchasePrice: product.purchasePrice || 0,
          discountAmount: item.discountAmount || 0,
          taxPercent: item.taxPercent || 0,
          cgstAmount: item.cgstAmount || 0,
          sgstAmount: item.sgstAmount || 0,
          igstAmount: item.igstAmount || 0,
          totalAmount: item.totalAmount,
          staff: item.staff || null,
          staffId: item.staffId || null,
          staffName: item.staffName || null,
          commissionType: commType,
          commissionValue: commVal,
          commissionAmount: commAmount
        });
      }

      const sale = await Sale.create({
        invoiceNumber,
        customer: customerDoc?._id || null,
        customerName: customerDoc?.name || customerName || 'Walk-in Customer',
        customerMobile: customerDoc?.mobile || customerMobile || '',
        cashier: req.user._id,
        cashierName: req.user.name,
        items: processedItems,
        subtotal,
        itemDiscountTotal: itemDiscountTotal || 0,
        billDiscountTotal: billDiscountTotal || 0,
        taxableAmount,
        cgstTotal: cgstTotal || 0,
        sgstTotal: sgstTotal || 0,
        igstTotal: igstTotal || 0,
        taxTotal: taxTotal || 0,
        roundOff: roundOff || 0,
        grandTotal,
        paymentMethod: paymentMethod || 'Cash',
        payments: payments || [{ method: paymentMethod || 'Cash', amount: grandTotal }],
        status: 'Completed',
        notes
      });

      if (customerDoc) {
        customerDoc.totalPurchases += grandTotal;
        customerDoc.totalPaid += grandTotal;
        await customerDoc.save();
      }

      await logAudit({
        user: req.user,
        action: 'CREATE_SALE',
        module: 'POS_SALES',
        recordId: sale._id,
        details: `Generated Invoice #${sale.invoiceNumber} total ₹${sale.grandTotal} via ${sale.paymentMethod}`,
        req
      });

      res.status(201).json({ success: true, sale });
    } catch (checkoutError) {
      // Rollback stock for any items already processed before error
      for (const log of updatedVariantsLog) {
        try {
          await updateVariantStock({
            productId: log.productId,
            barcode: log.barcode,
            quantity: log.quantity, // positive to restore
            type: 'Adjustment',
            user: req.user,
            notes: `Rollback stock due to checkout error on invoice #${invoiceNumber}`
          });
        } catch (rbErr) {
          console.error('[Rollback Error]', rbErr);
        }
      }
      throw checkoutError;
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const cancelSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale invoice not found' });
    }

    if (sale.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Invoice is already cancelled' });
    }

    // Restore stock for all items
    for (const item of sale.items) {
      await updateVariantStock({
        productId: item.product,
        barcode: item.variantBarcode,
        quantity: item.quantity, // positive to restore
        type: 'Adjustment',
        referenceId: sale._id,
        referenceDocNumber: sale.invoiceNumber,
        user: req.user,
        notes: `Stock restored from cancelled invoice #${sale.invoiceNumber}`
      });
    }

    sale.status = 'Cancelled';
    await sale.save();

    await logAudit({
      user: req.user,
      action: 'CANCEL_SALE',
      module: 'POS_SALES',
      recordId: sale._id,
      details: `Cancelled invoice #${sale.invoiceNumber} (Restored inventory)`,
      req
    });

    res.json({ success: true, message: `Invoice #${sale.invoiceNumber} cancelled and stock restored successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
