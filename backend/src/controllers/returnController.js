import { Return } from '../models/Return.js';
import { Sale } from '../models/Sale.js';
import { updateVariantStock } from '../services/stockService.js';
import { logAudit } from '../middleware/auditLogger.js';

export const getReturns = async (req, res) => {
  try {
    const returns = await Return.find()
      .populate('originalSale', 'invoiceNumber grandTotal')
      .populate('processedBy', 'name')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: returns.length, returns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createReturn = async (req, res) => {
  try {
    const {
      saleId,
      items,
      refundMethod,
      reason,
      exchangeBarcode,
      exchangeProductName,
      exchangeUnitPrice,
      priceDifference,
      exchangeProductId,
      exchangeItems,
      totalExchangeAmount
    } = req.body;

    if (!saleId || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Sale invoice ID and return items are required' });
    }

    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({ success: false, message: 'Original Sale Invoice not found' });
    }

    if (sale.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot process return for a cancelled invoice' });
    }

    const latestReturn = await Return.findOne().sort({ createdAt: -1 });
    let nextNum = 1;
    if (latestReturn && latestReturn.returnNumber) {
      const parts = latestReturn.returnNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
    }
    const returnNumber = `RET-${new Date().getFullYear()}-${String(nextNum).padStart(6, '0')}`;

    let totalRefundAmount = 0;
    const processedReturnItems = [];

    for (const retItem of items) {
      const originalItem = sale.items.find(
        (i) => i.variantBarcode === retItem.variantBarcode && i.product.toString() === retItem.product.toString()
      );

      if (!originalItem) {
        return res.status(400).json({
          success: false,
          message: `Item with barcode "${retItem.variantBarcode}" was not part of original invoice`
        });
      }

      if (retItem.quantity > originalItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Return quantity (${retItem.quantity}) exceeds purchased quantity (${originalItem.quantity})`
        });
      }

      const itemRefund = Number(retItem.refundUnitPrice || originalItem.unitPrice) * retItem.quantity;
      totalRefundAmount += itemRefund;

      let reversedComm = 0;
      if (originalItem.staff && originalItem.commissionAmount > 0) {
        reversedComm = (originalItem.commissionAmount / originalItem.quantity) * retItem.quantity;
        reversedComm = Math.round(reversedComm * 100) / 100;
      }

      processedReturnItems.push({
        product: originalItem.product,
        productName: originalItem.productName,
        variantBarcode: originalItem.variantBarcode,
        size: originalItem.size,
        color: originalItem.color,
        quantity: retItem.quantity,
        refundUnitPrice: retItem.refundUnitPrice || originalItem.unitPrice,
        totalRefund: itemRefund,
        staff: originalItem.staff || null,
        staffId: originalItem.staffId || null,
        staffName: originalItem.staffName || null,
        reversedCommissionAmount: reversedComm
      });

      // Restore stock for returned item
      try {
        await updateVariantStock({
          productId: originalItem.product,
          barcode: originalItem.variantBarcode,
          quantity: retItem.quantity, // positive to increase stock
          type: 'SalesReturn',
          referenceId: sale._id,
          referenceDocNumber: returnNumber,
          user: req.user,
          notes: `Sales Return #${returnNumber} against Invoice #${sale.invoiceNumber}`
        });
      } catch (stockErr) {
        console.warn(`[Return Stock Warning] Could not update stock for barcode ${originalItem.variantBarcode}: ${stockErr.message}`);
      }
    }

    // Deduct stock for replacement exchange items if provided
    const processedExchangeItems = [];
    if (refundMethod === 'Exchange') {
      if (Array.isArray(exchangeItems) && exchangeItems.length > 0) {
        for (const exItem of exchangeItems) {
          const itemTotal = Number(exItem.unitPrice || 0) * Number(exItem.quantity || 1);
          processedExchangeItems.push({
            product: exItem.product || null,
            productName: exItem.productName,
            variantBarcode: exItem.variantBarcode,
            size: exItem.size || 'N/A',
            color: exItem.color || 'N/A',
            quantity: Number(exItem.quantity || 1),
            unitPrice: Number(exItem.unitPrice || 0),
            totalAmount: itemTotal
          });

          try {
            await updateVariantStock({
              productId: exItem.product,
              barcode: exItem.variantBarcode,
              quantity: -Math.abs(Number(exItem.quantity || 1)), // negative to deduct stock
              type: 'ExchangeIssue',
              referenceId: sale._id,
              referenceDocNumber: returnNumber,
              user: req.user,
              notes: `Product Exchange issued for Return #${returnNumber}`
            });
          } catch (exchangeStockErr) {
            console.warn(`[Exchange Stock Warning] Could not deduct replacement stock for barcode ${exItem.variantBarcode}: ${exchangeStockErr.message}`);
          }
        }
      } else if (exchangeBarcode) {
        // Fallback for single item exchange
        try {
          await updateVariantStock({
            productId: exchangeProductId,
            barcode: exchangeBarcode,
            quantity: -1,
            type: 'ExchangeIssue',
            referenceId: sale._id,
            referenceDocNumber: returnNumber,
            user: req.user,
            notes: `Product Exchange issued for Return #${returnNumber}`
          });
        } catch (exchangeStockErr) {
          console.warn(`[Exchange Stock Warning] Could not deduct replacement stock for barcode ${exchangeBarcode}: ${exchangeStockErr.message}`);
        }
      }
    }

    const returnDoc = await Return.create({
      returnNumber,
      originalSale: sale._id,
      originalInvoiceNumber: sale.invoiceNumber,
      customer: sale.customer || null,
      customerName: sale.customerName,
      items: processedReturnItems,
      totalRefundAmount,
      refundMethod: refundMethod || 'Cash',
      exchangeItems: processedExchangeItems,
      totalExchangeAmount: Number(totalExchangeAmount || 0),
      exchangeBarcode: refundMethod === 'Exchange' ? exchangeBarcode : undefined,
      exchangeProductName: refundMethod === 'Exchange' ? exchangeProductName : undefined,
      exchangeUnitPrice: refundMethod === 'Exchange' ? Number(exchangeUnitPrice || 0) : undefined,
      priceDifference: refundMethod === 'Exchange' ? Number(priceDifference || 0) : undefined,
      reason,
      processedBy: req.user._id,
      processedByName: req.user.name
    });

    // Update sale status
    const allReturned = items.every((retItem) => {
      const orig = sale.items.find((i) => i.variantBarcode === retItem.variantBarcode);
      return orig && retItem.quantity === orig.quantity;
    });

    sale.status = allReturned ? 'Returned' : 'PartiallyReturned';
    await sale.save();

    await logAudit({
      user: req.user,
      action: 'PROCESS_RETURN',
      module: 'RETURNS',
      recordId: returnDoc._id,
      details: `Processed Return #${returnNumber} for Invoice #${sale.invoiceNumber} (Refund: ₹${totalRefundAmount})`,
      req
    });

    res.status(201).json({ success: true, returnDoc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
