import React, { useState, useEffect } from 'react';
import { Modal } from '../components/common/Modal';
import { createPurchase } from '../services/purchaseService';
import { getSuppliers } from '../services/supplierService';
import { getProducts } from '../services/productService';
import { Plus, Trash2 } from 'lucide-react';

export const PurchaseFormModal = ({ isOpen, onClose, onSaved }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState(`PUR-${Date.now().toString().slice(-6)}`);
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState([
    { product: '', productName: '', variantBarcode: '', size: '', color: '', quantity: 10, purchasePrice: 500, total: 5000 }
  ]);
  const [paidAmount, setPaidAmount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [sRes, pRes] = await Promise.all([getSuppliers(), getProducts({ status: 'active' })]);
      setSuppliers(sRes.suppliers || []);
      setProducts(pRes.products || []);
      if (sRes.suppliers?.length > 0) setSupplierId(sRes.suppliers[0]._id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProductSelect = (idx, prodId) => {
    const selectedProd = products.find((p) => p._id === prodId);
    if (!selectedProd) return;

    const firstVariant = selectedProd.variants[0] || { size: 'M', color: 'Blue', barcode: '100001' };
    const updated = [...items];
    updated[idx] = {
      product: selectedProd._id,
      productName: selectedProd.name,
      variantBarcode: firstVariant.barcode,
      size: firstVariant.size,
      color: firstVariant.color,
      quantity: 10,
      purchasePrice: selectedProd.purchasePrice || 500,
      total: (selectedProd.purchasePrice || 500) * 10
    };
    setItems(updated);
  };

  const handleVariantSelect = (idx, barcode) => {
    const item = items[idx];
    const prod = products.find((p) => p._id === item.product);
    if (!prod) return;
    const variant = prod.variants.find((v) => v.barcode === barcode);
    if (!variant) return;

    const updated = [...items];
    updated[idx] = {
      ...updated[idx],
      variantBarcode: variant.barcode,
      size: variant.size,
      color: variant.color
    };
    setItems(updated);
  };

  const handleItemChange = (idx, field, val) => {
    const updated = [...items];
    updated[idx][field] = Number(val);
    updated[idx].total = updated[idx].quantity * updated[idx].purchasePrice;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { product: '', productName: '', variantBarcode: '', size: '', color: '', quantity: 5, purchasePrice: 100, total: 500 }
    ]);
  };

  const handleRemoveItem = (idx) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const grandTotal = subtotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!supplierId || items.some((i) => !i.product || !i.variantBarcode)) {
      setError('Please select a supplier and choose products & variants for all items');
      return;
    }
    setSubmitting(true);

    try {
      await createPurchase({
        invoiceNumber,
        supplierId,
        items,
        subtotal,
        grandTotal,
        paidAmount: Number(paidAmount)
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create purchase');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Purchase Intake (Stock Increase)" maxWidth="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="p-2.5 bg-rose-500/20 text-rose-300 text-xs rounded">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Supplier Invoice # *</label>
            <input
              type="text"
              required
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Select Supplier *</label>
            <select
              required
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none"
            >
              <option value="">Select Supplier</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-indigo-400 uppercase">Purchased Items</h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-2 py-1 bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white rounded text-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item Line</span>
            </button>
          </div>

          <div className="border border-slate-800 rounded-lg p-2 bg-slate-900/50 space-y-2">
            {items.map((item, idx) => {
              const currentProd = products.find((p) => p._id === item.product);
              return (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-slate-900 p-2 rounded border border-slate-800">
                  <div className="col-span-4">
                    <select
                      required
                      value={item.product}
                      onChange={(e) => handleProductSelect(idx, e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs outline-none"
                    >
                      <option value="">Select Product</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <select
                      required
                      value={item.variantBarcode}
                      onChange={(e) => handleVariantSelect(idx, e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs outline-none"
                    >
                      <option value="">Select Size/Color</option>
                      {currentProd?.variants.map((v) => (
                        <option key={v.barcode} value={v.barcode}>
                          {v.size} ({v.color}) - {v.barcode}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      required
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white font-bold text-xs text-center outline-none"
                    />
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      required
                      value={item.purchasePrice}
                      onChange={(e) => handleItemChange(idx, 'purchasePrice', e.target.value)}
                      placeholder="Price"
                      className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs text-right outline-none"
                    />
                  </div>

                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length <= 1}
                      className="text-slate-500 hover:text-rose-400 disabled:text-slate-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs">
          <div>Grand Total: <strong className="text-emerald-400 text-sm">₹{grandTotal}</strong></div>
          <div className="flex items-center gap-2">
            <span>Paid Amount (₹):</span>
            <input
              type="number"
              min="0"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              className="w-28 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-white text-right font-bold outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
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
            {submitting ? 'Saving...' : 'RECORD PURCHASE & INCREASE STOCK'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
