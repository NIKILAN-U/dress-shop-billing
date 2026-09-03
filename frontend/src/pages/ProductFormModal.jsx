import React, { useState, useEffect } from 'react';
import { Modal } from '../components/common/Modal';
import { createProduct, updateProduct } from '../services/productService';
import { getCategories } from '../services/categoryService';
import { getBrands } from '../services/brandService';
import { Plus, Trash2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ProductFormModal = ({ isOpen, onClose, productData = null, onSaved }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    brand: '',
    purchasePrice: 0,
    sellingPrice: 0,
    mrp: 0,
    taxPercent: 5,
    minStockLevel: 5,
    commissionType: 'Percentage',
    commissionValue: 0,
    variants: [
      { size: 'M', color: 'Sky Blue', barcode: '', stock: 10 }
    ]
  });

  useEffect(() => {
    if (isOpen) {
      fetchMasterData();
      if (productData) {
        setFormData({
          name: productData.name,
          sku: productData.sku,
          category: productData.category?._id || productData.category || '',
          brand: productData.brand?._id || productData.brand || '',
          purchasePrice: productData.purchasePrice,
          sellingPrice: productData.sellingPrice,
          mrp: productData.mrp,
          taxPercent: productData.taxPercent,
          minStockLevel: productData.minStockLevel,
          commissionType: productData.commissionType || 'Percentage',
          commissionValue: productData.commissionValue || 0,
          variants: productData.variants || []
        });
      } else {
        setFormData({
          name: '',
          sku: '',
          category: '',
          brand: '',
          purchasePrice: 0,
          sellingPrice: 0,
          mrp: 0,
          taxPercent: 5,
          minStockLevel: 5,
          commissionType: 'Percentage',
          commissionValue: 0,
          variants: [
            { size: 'M', color: 'Sky Blue', barcode: `BAR-${Date.now().toString().slice(-6)}`, stock: 10 }
          ]
        });
      }
    }
  }, [isOpen, productData]);

  const fetchMasterData = async () => {
    try {
      const [catRes, brandRes] = await Promise.all([getCategories(), getBrands()]);
      setCategories(catRes.categories || []);
      setBrands(brandRes.brands || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddVariant = () => {
    setFormData({
      ...formData,
      variants: [
        ...formData.variants,
        { size: 'L', color: 'White', barcode: `BAR-${Date.now().toString().slice(-6)}`, stock: 5 }
      ]
    });
  };

  const handleRemoveVariant = (idx) => {
    if (formData.variants.length === 1) return;
    setFormData({
      ...formData,
      variants: formData.variants.filter((_, i) => i !== idx)
    });
  };

  const handleVariantChange = (idx, field, value) => {
    const updated = [...formData.variants];
    updated[idx][field] = value;
    setFormData({ ...formData, variants: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const trimmedData = {
        ...formData,
        sku: formData.sku?.trim(),
        name: formData.name?.trim(),
        variants: formData.variants.map((v) => ({
          ...v,
          barcode: v.barcode?.trim()
        }))
      };

      const barcodes = trimmedData.variants.map((v) => v.barcode);
      const uniqueBarcodes = new Set(barcodes);
      if (uniqueBarcodes.size !== barcodes.length) {
        setError('Duplicate variant barcodes found. Each variant must have a unique barcode.');
        setLoading(false);
        return;
      }

      if (productData) {
        await updateProduct(productData._id, trimmedData);
      } else {
        await createProduct(trimmedData);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border rounded-xl text-xs font-semibold outline-none bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productData ? 'Edit Product & Variants' : 'Add New Product & Variants'}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">SKU / Code *</label>
            <input
              type="text"
              required
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category *</label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className={inputClass}
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Brand</label>
            <select
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className={inputClass}
            >
              <option value="">Select Brand</option>
              {brands.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Purchase Price</label>
            <input
              type="number"
              min="0"
              value={formData.purchasePrice}
              onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Selling Price *</label>
            <input
              type="number"
              min="0"
              required
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">MRP</label>
            <input
              type="number"
              min="0"
              value={formData.mrp}
              onChange={(e) => setFormData({ ...formData, mrp: Number(e.target.value) })}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">GST Tax (%)</label>
            <input
              type="number"
              min="0"
              value={formData.taxPercent}
              onChange={(e) => setFormData({ ...formData, taxPercent: Number(e.target.value) })}
              className={inputClass}
            />
          </div>
        </div>

        {/* Staff Commission Configuration */}
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
          <label className="block text-xs font-black text-amber-900 uppercase tracking-wider">
            Staff Sales Commission Setting
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Commission Calculation Type</label>
              <select
                value={formData.commissionType}
                onChange={(e) => setFormData({ ...formData, commissionType: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-amber-500 shadow-xs"
              >
                <option value="Percentage">Percentage (%) of Selling Price</option>
                <option value="Fixed">Fixed Amount (₹) per Item</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                {formData.commissionType === 'Percentage' ? 'Commission Rate (%)' : 'Commission Amount (₹)'}
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.commissionValue}
                onChange={(e) => setFormData({ ...formData, commissionValue: Number(e.target.value) })}
                placeholder={formData.commissionType === 'Percentage' ? 'e.g. 5%' : 'e.g. ₹50'}
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-amber-500 shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Variants Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Product Variants (Size / Color / Barcode)
            </label>
            <button
              type="button"
              onClick={handleAddVariant}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Variant</span>
            </button>
          </div>

          <div className="space-y-2">
            {formData.variants.map((variant, idx) => (
              <div
                key={idx}
                className={`p-3 border rounded-xl grid grid-cols-1 sm:grid-cols-4 gap-2 items-center ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div>
                  <input
                    type="text"
                    placeholder="Size (e.g. S, M, 32)"
                    value={variant.size}
                    onChange={(e) => handleVariantChange(idx, 'size', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Color (e.g. Red, Blue)"
                    value={variant.color}
                    onChange={(e) => handleVariantChange(idx, 'color', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Barcode Number"
                    value={variant.barcode}
                    onChange={(e) => handleVariantChange(idx, 'barcode', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Stock Qty"
                    value={variant.stock}
                    onChange={(e) => handleVariantChange(idx, 'stock', Number(e.target.value))}
                    className={inputClass}
                  />
                  {formData.variants.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveVariant(idx)}
                      className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold cursor-pointer"
          >
            {loading ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
