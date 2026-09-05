import { Product } from '../models/Product.js';
import { BarcodePrintLog } from '../models/BarcodePrintLog.js';
import { ShopSettings } from '../models/ShopSettings.js';

// Helper to generate next unique barcode e.g. DSS000001. `reserved` lets a
// caller ask for several in one batch (e.g. every variant on a new product)
// without persisting in between each one — the DB scan alone can't tell two
// not-yet-saved candidates apart.
const generateNextBarcode = async (prefix = 'DSS', reserved = new Set()) => {
  const products = await Product.find({}, 'variants.barcode');
  const existingBarcodes = new Set(reserved);
  products.forEach((p) => {
    p.variants.forEach((v) => {
      if (v.barcode) existingBarcodes.add(v.barcode.trim());
    });
  });

  let counter = 1;
  let candidate = `${prefix}${String(counter).padStart(6, '0')}`;
  while (existingBarcodes.has(candidate)) {
    counter++;
    candidate = `${prefix}${String(counter).padStart(6, '0')}`;
  }
  return candidate;
};

// Next barcode(s) for the "Add Product" form — continues the same running
// sequence used everywhere else (barcode management, bulk-generate) rather
// than a separate random scheme, so a fresh product picks up right after
// whatever the previous product's last variant barcode was.
export const getNextBarcodes = async (req, res) => {
  try {
    const settings = await ShopSettings.findOne();
    const prefix = settings?.barcodePrefix || 'DSS';
    const count = Math.min(50, Math.max(1, parseInt(req.query.count, 10) || 1));

    const reserved = new Set();
    const barcodes = [];
    for (let i = 0; i < count; i++) {
      const bc = await generateNextBarcode(prefix, reserved);
      reserved.add(bc);
      barcodes.push(bc);
    }

    res.json({ success: true, barcodes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 1. Get Barcode Catalog & Statistics
export const getBarcodeCatalog = async (req, res) => {
  try {
    const { search, category, hasBarcode } = req.query;

    const products = await Product.find({ status: 'active' })
      .populate('category', 'name')
      .populate('brand', 'name')
      .sort({ createdAt: -1 });

    const catalogItems = [];
    let totalItems = 0;
    let withBarcode = 0;
    let withoutBarcode = 0;

    products.forEach((p) => {
      p.variants.forEach((v) => {
        totalItems++;
        const hasBC = !!(v.barcode && v.barcode.trim());
        if (hasBC) withBarcode++;
        else withoutBarcode++;

        const item = {
          productId: p._id,
          productName: p.name,
          sku: p.sku,
          category: p.category?.name || 'Uncategorized',
          brand: p.brand?.name || '',
          variantId: v._id,
          size: v.size,
          color: v.color,
          barcode: v.barcode || '',
          stock: v.stock || 0,
          purchasePrice: p.purchasePrice,
          sellingPrice: p.sellingPrice,
          mrp: p.mrp
        };

        // Filter checks
        if (hasBarcode === 'true' && !hasBC) return;
        if (hasBarcode === 'false' && hasBC) return;
        if (category && p.category?._id?.toString() !== category) return;

        if (search) {
          const s = search.trim().toLowerCase();
          const match =
            item.productName.toLowerCase().includes(s) ||
            item.sku.toLowerCase().includes(s) ||
            item.category.toLowerCase().includes(s) ||
            item.barcode.toLowerCase().includes(s) ||
            item.size.toLowerCase().includes(s) ||
            item.color.toLowerCase().includes(s);
          if (!match) return;
        }

        catalogItems.push(item);
      });
    });

    const printedJobsCount = await BarcodePrintLog.countDocuments();

    res.json({
      success: true,
      stats: {
        totalItems,
        withBarcode,
        withoutBarcode,
        printedJobsCount
      },
      items: catalogItems
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Generate or Regenerate Single Variant Barcode
export const generateVariantBarcode = async (req, res) => {
  try {
    const { productId, barcode: customBarcode, isRegenerate } = req.body;
    const { variantId } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const variant = product.variants.id(variantId);
    if (!variant) {
      return res.status(404).json({ success: false, message: 'Product variant not found' });
    }

    if (variant.barcode && !isRegenerate && !customBarcode) {
      return res.status(400).json({ success: false, message: 'Variant already has a barcode assigned' });
    }

    let finalBarcode = '';

    if (customBarcode && customBarcode.trim()) {
      finalBarcode = customBarcode.trim().toUpperCase();
      // Uniqueness check across all other variants in system
      const existing = await Product.findOne({
        'variants.barcode': finalBarcode,
        _id: { $exists: true }
      });
      if (existing) {
        const otherVar = existing.variants.find((v) => v.barcode === finalBarcode);
        if (otherVar && (existing._id.toString() !== productId || otherVar._id.toString() !== variantId.toString())) {
          return res.status(400).json({
            success: false,
            message: `This barcode "${finalBarcode}" is already assigned to product "${existing.name}" (${otherVar.size}/${otherVar.color})`
          });
        }
      }
    } else {
      const settings = await ShopSettings.findOne();
      const prefix = settings?.barcodePrefix || 'DSS';
      finalBarcode = await generateNextBarcode(prefix);
    }

    variant.barcode = finalBarcode;
    await product.save();

    res.json({
      success: true,
      message: `Successfully assigned barcode ${finalBarcode}`,
      productName: product.name,
      barcode: finalBarcode
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Bulk Generate Barcodes for All Missing Variants
export const bulkGenerateBarcodes = async (req, res) => {
  try {
    const settings = await ShopSettings.findOne();
    const prefix = settings?.barcodePrefix || 'DSS';

    const products = await Product.find({ status: 'active' });
    let generatedCount = 0;
    const reserved = new Set();

    for (const product of products) {
      let modified = false;
      for (const variant of product.variants) {
        if (!variant.barcode || !variant.barcode.trim()) {
          const bc = await generateNextBarcode(prefix, reserved);
          reserved.add(bc);
          variant.barcode = bc;
          generatedCount++;
          modified = true;
        }
      }
      if (modified) {
        await product.save();
      }
    }

    res.json({
      success: true,
      message: `Bulk barcode generation complete. Assigned barcodes to ${generatedCount} product variants.`,
      generatedCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Record Barcode Label Print Log
export const logBarcodePrint = async (req, res) => {
  try {
    const { productId, productName, sku, variantBarcode, sizeColor, quantityPrinted, labelDimensions } = req.body;

    if (!productId || !variantBarcode || !quantityPrinted) {
      return res.status(400).json({ success: false, message: 'Missing barcode print log fields' });
    }

    const printLog = new BarcodePrintLog({
      product: productId,
      productName,
      sku: sku || '',
      variantBarcode,
      sizeColor: sizeColor || '',
      quantityPrinted: Number(quantityPrinted),
      printedBy: req.user._id,
      printedByName: req.user.name,
      labelDimensions: labelDimensions || '50mm x 25mm'
    });

    await printLog.save();

    res.status(201).json({ success: true, message: 'Recorded barcode print log', printLog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Get Barcode Print History Logs
export const getBarcodePrintLogs = async (req, res) => {
  try {
    const logs = await BarcodePrintLog.find().sort({ printDate: -1 }).limit(100);
    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
