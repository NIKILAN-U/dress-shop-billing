import React, { useState, useEffect } from 'react';
import { Modal } from '../components/common/Modal';
import { createProduct, updateProduct } from '../services/productService';
import { getCategories } from '../services/categoryService';
import { getBrands } from '../services/brandService';
import { getSuppliers } from '../services/supplierService';
import { Plus, Trash2, Tag, Barcode } from 'lucide-react';

export const ProductFormModal = ({ isOpen, onClose, productToEdit, onSaved }) => {
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    subcategory: '',
    brand: '',
    gender: 'Unisex',
    description: '',
    purchasePrice: 0,
    sellingPrice: 0,
    mrp: 0,
    taxPercent: 5,
    discountPercent: 0,
    minStockLevel: 5,
    supplier: '',
    variants: [
      { size: 'M', color: 'Blue', barcode: String(Math.floor(100000 + Math.random() * 900000)), stock: 10 }
    ]
  });

  useEffect(() => {
    if (isOpen) {
      loadDropdowns();
      if (productToEdit) {
        setFormData({
          name: productToEdit.name || '',
          sku: productToEdit.sku || '',
          category: productToEdit.category?._id || productToEdit.category || '',
          subcategory: productToEdit.subcategory || '',
          brand: productToEdit.brand?._id || productToEdit.brand || '',
          gender: productToEdit.gender || 'Unisex',
          description: productToEdit.description || '',
          purchasePrice: productToEdit.purchasePrice || 0,
          sellingPrice: productToEdit.sellingPrice || 0,
          mrp: productToEdit.mrp || 0,
          taxPercent: productToEdit.taxPercent || 5,
          discountPercent: productToEdit.discountPercent || 0,
          minStockLevel: productToEdit.minStockLevel || 5,
          supplier: productToEdit.supplier?._id || productToEdit.supplier || '',
          variants: productToEdit.variants?.length ? productToEdit.variants : []
        });
      } else {
        // Reset
        const randCode = String(Math.floor(100000 + Math.random() * 900000));
        setFormData({
          name: '',
          sku: `SKU-${Date.now().toString().slice(-5)}`,
          category: '',
          subcategory: '',
          brand: '',
          gender: 'Unisex',
          description: '',
          purchasePrice: 0,
          sellingPrice: 0,
          mrp: 0,
          taxPercent: 5,
          discountPercent: 0,
          minStockLevel: 5,
          supplier: '',
          variants: [
            { size: 'M', color: 'Blue', barcode: randCode, stock: 10 }
          ]
        });
      }
    }
  }, [isOpen, productToEdit]);

  const loadDropdowns = async () => {
    try {
      const [cRes, bRes, sRes] = await Promise.all([getCategories(), getBrands(), getSuppliers()]);
      setCategories(cRes.categories || []);
      setBrands(bRes.brands || []);
      setSuppliers(sRes.suppliers || []);
      if (!productToEdit && cRes.categories?.length > 0) {
        setFormData((prev) => ({ ...prev, category: cRes.categories[0]._id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddVariant = () => {
    const nextBarcode = String(Math.floor(100000 + Math.random() * 900000));
    setFormData({
      ...formData,
      variants: [...formData.variants, { size: 'L', color: 'Blue', barcode: nextBarcode, stock: 5 }]
    });
  };

  const handleRemoveVariant = (idx) => {
    if (formData.variants.length <= 1) return;
    const updated = formData.variants.filter((_, i) => i !== idx);
    setFormData({ ...formData, variants: updated });
  };

  const handleVariantChange = (idx, field, val) => {
    const updated = [...formData.variants];
    updated[idx][field] = field === 'stock' ? Number(val) : val;
    setFormData({ ...formData, variants: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (productToEdit) {
        await updateProduct(productToEdit._id, formData);
      } else {
        await createProduct(formData);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={productToEdit ? 'Edit Product & Variants' : 'Add New Product & Variants'}
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Men Silk Shirt"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Product SKU *</label>
            <input
              type="text"
              required
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Gender Segment</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none"
            >
              <option value="Men">Men</option>
              <option value="Women">Women</option>
              <option value="Kids">Kids</option>
              <option value="Unisex">Unisex</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Category *</label>
            <select
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none"
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
            <label className="block text-xs font-semibold text-slate-300 mb-1">Brand</label>
            <select
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none"
            >
              <option value="">Select Brand (Optional)</option>
              {brands.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Supplier</label>
            <select
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none"
            >
              <option value="">Select Supplier (Optional)</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Purchase Price (₹) *</label>
            <input
              type="number"
              min="0"
              required
              value={formData.purchasePrice}
              onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Selling Price (₹) *</label>
            <input
              type="number"
              min="0"
              required
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">MRP Price (₹)</label>
            <input
              type="number"
              min="0"
              value={formData.mrp}
              onChange={(e) => setFormData({ ...formData, mrp: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">GST Tax Rate (%)</label>
            <input
              type="number"
              min="0"
              value={formData.taxPercent}
              onChange={(e) => setFormData({ ...formData, taxPercent: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none"
            />
          </div>
        </div>

        {/* Product Variants Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Product Variants (Size / Color / Barcode / Stock)</h3>
            <button
              type="button"
              onClick={handleAddVariant}
              className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Variant</span>
            </button>
          </div>

          <div className="border border-slate-800 rounded-lg overflow-hidden space-y-2 p-2 bg-slate-900/50">
            {formData.variants.map((variant, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900 p-2 rounded border border-slate-800">
                <div className="col-span-3">
                  <input
                    type="text"
                    required
                    placeholder="Size (S, M, L, XL, 32...)"
                    value={variant.size}
                    onChange={(e) => handleVariantChange(idx, 'size', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs outline-none"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    required
                    placeholder="Color (Blue, Black...)"
                    value={variant.color}
                    onChange={(e) => handleVariantChange(idx, 'color', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs outline-none"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="text"
                    required
                    placeholder="Barcode Number"
                    value={variant.barcode}
                    onChange={(e) => handleVariantChange(idx, 'barcode', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-indigo-300 font-mono text-xs outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="Stock Qty"
                    value={variant.stock}
                    onChange={(e) => handleVariantChange(idx, 'stock', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white font-bold text-xs outline-none"
                  />
                </div>
                <div className="col-span-1 text-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(idx)}
                    disabled={formData.variants.length <= 1}
                    className="text-slate-500 hover:text-rose-400 disabled:text-slate-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-extrabold cursor-pointer"
          >
            {submitting ? 'Saving...' : 'SAVE PRODUCT & VARIANTS'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
