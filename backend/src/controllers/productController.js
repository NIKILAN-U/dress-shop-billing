import { Product } from '../models/Product.js';
import { StockTransaction } from '../models/StockTransaction.js';
import { logAudit } from '../middleware/auditLogger.js';
import { DEFAULT_COMMISSION_TYPE, DEFAULT_COMMISSION_VALUE } from '../utils/commission.js';

export const getProducts = async (req, res) => {
  try {
    const { search, category, brand, gender, lowStock, status } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    } else {
      query.status = 'active';
    }

    if (category) query.category = category;
    if (brand) query.brand = brand;
    if (gender) query.gender = gender;

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { sku: searchRegex },
        { 'variants.barcode': searchRegex }
      ];
    }

    let products = await Product.find(query)
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('supplier', 'name')
      .sort({ createdAt: -1 });

    if (lowStock === 'true') {
      products = products.filter((p) => {
        const totalStock = p.variants.reduce((acc, v) => acc + v.stock, 0);
        return totalStock <= p.minStockLevel;
      });
    }

    res.json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProductByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;
    if (!barcode) {
      return res.status(400).json({ success: false, message: 'Barcode is required' });
    }

    const product = await Product.findOne({
      'variants.barcode': barcode.trim(),
      status: 'active'
    })
      .populate('category', 'name')
      .populate('brand', 'name');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found with barcode' });
    }

    const variant = product.variants.find((v) => v.barcode === barcode.trim());

    res.json({
      success: true,
      product: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        category: product.category,
        brand: product.brand,
        gender: product.gender,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        mrp: product.mrp,
        taxPercent: product.taxPercent,
        discountPercent: product.discountPercent,
        commissionType: product.commissionType || DEFAULT_COMMISSION_TYPE,
        commissionValue: product.commissionValue ?? DEFAULT_COMMISSION_VALUE,
        selectedVariant: {
          variantId: variant._id,
          size: variant.size,
          color: variant.color,
          barcode: variant.barcode,
          stock: variant.stock
        },
        allVariants: product.variants
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('supplier', 'name');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      category,
      subcategory,
      brand,
      gender,
      description,
      purchasePrice,
      sellingPrice,
      mrp,
      taxPercent,
      discountPercent,
      minStockLevel,
      supplier,
      commissionType,
      commissionValue,
      variants
    } = req.body;

    const trimmedSku = sku?.trim();

    if (!name || !category || sellingPrice === undefined || sellingPrice === null || sellingPrice === '') {
      return res.status(400).json({ success: false, message: 'Product name, category, and selling price are required' });
    }

    if (trimmedSku) {
      const existingSku = await Product.findOne({ sku: trimmedSku });
      if (existingSku) {
        return res.status(400).json({ success: false, message: 'Product SKU already exists' });
      }
    }

    // Check duplicate barcodes in input variants & DB
    if (variants && variants.length > 0) {
      const barcodes = variants.map((v) => v.barcode);
      const uniqueBarcodes = new Set(barcodes);
      if (uniqueBarcodes.size !== barcodes.length) {
        return res.status(400).json({ success: false, message: 'Duplicate barcodes found in variants input' });
      }

      const existingBarcodeProduct = await Product.findOne({ 'variants.barcode': { $in: barcodes } });
      if (existingBarcodeProduct) {
        return res.status(400).json({ success: false, message: 'One or more variant barcodes already exist in system' });
      }
    }

    const product = await Product.create({
      name: name.trim(),
      // Omitted entirely (not an empty string) when not provided, so the
      // sparse unique index treats it as absent rather than colliding with
      // every other product that also has no SKU.
      ...(trimmedSku ? { sku: trimmedSku } : {}),
      category,
      subcategory,
      brand: brand || null,
      gender: gender || 'Unisex',
      description,
      purchasePrice: purchasePrice || 0,
      sellingPrice,
      mrp: mrp || sellingPrice,
      taxPercent: taxPercent || 0,
      discountPercent: discountPercent || 0,
      minStockLevel: minStockLevel || 5,
      supplier: supplier || null,
      commissionType: commissionType || DEFAULT_COMMISSION_TYPE,
      commissionValue: commissionValue ?? DEFAULT_COMMISSION_VALUE,
      variants: variants || []
    });

    // Record Opening Stock Transactions for variants with stock > 0
    if (product.variants && product.variants.length > 0) {
      for (const v of product.variants) {
        if (v.stock > 0) {
          await StockTransaction.create({
            product: product._id,
            productName: product.name,
            variantId: v._id.toString(),
            variantBarcode: v.barcode,
            size: v.size,
            color: v.color,
            type: 'Opening',
            quantity: v.stock,
            previousStock: 0,
            newStock: v.stock,
            performedBy: req.user?._id,
            notes: 'Initial Product Stock'
          });
        }
      }
    }

    await logAudit({
      user: req.user,
      action: 'CREATE_PRODUCT',
      module: 'PRODUCTS',
      recordId: product._id,
      details: `Created product "${product.name}" with ${product.variants.length} variants`,
      req
    });

    res.status(201).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const {
      name,
      sku,
      category,
      subcategory,
      brand,
      gender,
      description,
      purchasePrice,
      sellingPrice,
      mrp,
      taxPercent,
      discountPercent,
      minStockLevel,
      supplier,
      status,
      commissionType,
      commissionValue,
      variants
    } = req.body;

    const oldValue = { name: product.name, sellingPrice: product.sellingPrice, variants: product.variants };

    if (sku && sku.trim() !== product.sku) {
      const existingSku = await Product.findOne({ sku: sku.trim(), _id: { $ne: product._id } });
      if (existingSku) {
        return res.status(400).json({ success: false, message: 'Product SKU already exists on another product' });
      }
      product.sku = sku.trim();
    }

    if (variants && variants.length > 0) {
      const barcodes = variants.map((v) => v.barcode);
      const uniqueBarcodes = new Set(barcodes);
      if (uniqueBarcodes.size !== barcodes.length) {
        return res.status(400).json({ success: false, message: 'Duplicate barcodes found in variants input' });
      }

      const existingBarcodeProduct = await Product.findOne({
        'variants.barcode': { $in: barcodes },
        _id: { $ne: product._id }
      });
      if (existingBarcodeProduct) {
        return res.status(400).json({ success: false, message: 'One or more variant barcodes already exist on another product' });
      }
      product.variants = variants;
    }

    if (name) product.name = name.trim();
    if (category) product.category = category;
    if (subcategory !== undefined) product.subcategory = subcategory;
    if (brand !== undefined) product.brand = brand || null;
    if (gender) product.gender = gender;
    if (description !== undefined) product.description = description;
    if (purchasePrice !== undefined) product.purchasePrice = purchasePrice;
    if (sellingPrice !== undefined) product.sellingPrice = sellingPrice;
    if (mrp !== undefined) product.mrp = mrp;
    if (taxPercent !== undefined) product.taxPercent = taxPercent;
    if (discountPercent !== undefined) product.discountPercent = discountPercent;
    if (minStockLevel !== undefined) product.minStockLevel = minStockLevel;
    if (supplier !== undefined) product.supplier = supplier || null;
    if (commissionType !== undefined) product.commissionType = commissionType;
    if (commissionValue !== undefined) product.commissionValue = commissionValue;
    if (status) product.status = status;

    await product.save();

    await logAudit({
      user: req.user,
      action: 'UPDATE_PRODUCT',
      module: 'PRODUCTS',
      recordId: product._id,
      details: `Updated product "${product.name}"`,
      oldValue,
      newValue: { name: product.name, sellingPrice: product.sellingPrice, variants: product.variants },
      req
    });

    res.json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    product.status = 'inactive';
    await product.save();

    await logAudit({
      user: req.user,
      action: 'DISABLE_PRODUCT',
      module: 'PRODUCTS',
      recordId: product._id,
      details: `Disabled product "${product.name}"`,
      req
    });

    res.json({ success: true, message: 'Product set to inactive' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
