import { Product } from '../models/Product.js';
import { StockTransaction } from '../models/StockTransaction.js';
import { updateVariantStock } from '../services/stockService.js';
import { logAudit } from '../middleware/auditLogger.js';

export const getStockSummary = async (req, res) => {
  try {
    const products = await Product.find({ status: 'active' })
      .populate('category', 'name')
      .populate('brand', 'name')
      .sort({ name: 1 });

    const stockList = [];
    let totalStockCount = 0;
    let lowStockCount = 0;

    for (const prod of products) {
      for (const variant of prod.variants) {
        totalStockCount += variant.stock;
        const isLow = variant.stock <= prod.minStockLevel;
        if (isLow) lowStockCount++;

        stockList.push({
          productId: prod._id,
          productName: prod.name,
          sku: prod.sku,
          category: prod.category?.name || 'Uncategorized',
          brand: prod.brand?.name || 'Generic',
          gender: prod.gender,
          variantId: variant._id,
          size: variant.size,
          color: variant.color,
          barcode: variant.barcode,
          stock: variant.stock,
          purchasePrice: prod.purchasePrice,
          sellingPrice: prod.sellingPrice,
          mrp: prod.mrp,
          minStockLevel: prod.minStockLevel,
          isLowStock: isLow
        });
      }
    }

    res.json({
      success: true,
      count: stockList.length,
      totalStockCount,
      lowStockCount,
      stock: stockList
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStockTransactions = async (req, res) => {
  try {
    const { productId, barcode, type, startDate, endDate } = req.query;
    const query = {};

    if (productId) query.product = productId;
    if (barcode) query.variantBarcode = barcode.trim();
    if (type) query.type = type;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const transactions = await StockTransaction.find(query)
      .populate('performedBy', 'name username')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const adjustStock = async (req, res) => {
  try {
    const { productId, barcode, newStock, notes } = req.body;

    if (!productId || !barcode || newStock === undefined) {
      return res.status(400).json({ success: false, message: 'Product ID, barcode and target new stock are required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const variant = product.variants.find((v) => v.barcode === barcode);
    if (!variant) {
      return res.status(404).json({ success: false, message: 'Variant barcode not found' });
    }

    const currentStock = variant.stock;
    const diff = Number(newStock) - currentStock;

    if (diff === 0) {
      return res.json({ success: true, message: 'Stock remains unchanged', stock: currentStock });
    }

    const result = await updateVariantStock({
      productId: product._id,
      barcode,
      quantity: diff,
      type: 'Adjustment',
      user: req.user,
      notes: notes || `Manual stock adjustment from ${currentStock} to ${newStock}`
    });

    await logAudit({
      user: req.user,
      action: 'MANUAL_STOCK_ADJUSTMENT',
      module: 'INVENTORY',
      recordId: product._id,
      details: `Adjusted stock for "${product.name}" (${variant.size}/${variant.color}): ${currentStock} -> ${newStock}`,
      oldValue: { stock: currentStock },
      newValue: { stock: newStock },
      req
    });

    res.json({ success: true, message: 'Stock updated successfully', result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
