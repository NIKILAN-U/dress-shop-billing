import { Product } from '../models/Product.js';
import { StockTransaction } from '../models/StockTransaction.js';

/**
 * Updates stock for a product variant and records a stock transaction entry.
 * @param {Object} params
 * @param {String} params.productId
 * @param {String} params.barcode
 * @param {Number} params.quantity - Positive for addition, negative for reduction
 * @param {String} params.type - 'Opening' | 'Purchase' | 'Sale' | 'SalesReturn' | 'PurchaseReturn' | 'Adjustment'
 * @param {String} [params.referenceId]
 * @param {String} [params.referenceDocNumber]
 * @param {Object} [params.user]
 * @param {String} [params.notes]
 * @param {Boolean} [params.allowNegative=false]
 */
export const updateVariantStock = async ({
  productId,
  barcode,
  quantity,
  type,
  referenceId,
  referenceDocNumber,
  user,
  notes,
  allowNegative = false
}) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  const variant = product.variants.find((v) => v.barcode === barcode);
  if (!variant) {
    throw new Error(`Variant with barcode "${barcode}" not found in product "${product.name}"`);
  }

  const previousStock = variant.stock;
  const newStock = previousStock + quantity;

  if (newStock < 0 && !allowNegative) {
    throw new Error(
      `Insufficient stock for "${product.name}" (${variant.size}/${variant.color}). Available: ${previousStock}, Requested reduction: ${Math.abs(quantity)}`
    );
  }

  variant.stock = newStock;
  await product.save();

  const transaction = await StockTransaction.create({
    product: product._id,
    productName: product.name,
    variantId: variant._id.toString(),
    variantBarcode: variant.barcode,
    size: variant.size,
    color: variant.color,
    type,
    quantity,
    previousStock,
    newStock,
    referenceId,
    referenceDocNumber,
    performedBy: user?._id || user?.id,
    notes
  });

  return { product, variant, previousStock, newStock, transaction };
};
