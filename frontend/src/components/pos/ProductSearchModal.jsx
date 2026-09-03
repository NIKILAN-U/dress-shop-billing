import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { getProducts } from '../../services/productService';
import { Search, Tag, Package, Check, Plus } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const ProductSearchModal = ({
  isOpen,
  onClose,
  onSelectVariant,
  settings,
  closeOnSelect = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addedCounts, setAddedCounts] = useState({});
  const [notification, setNotification] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchProducts('');
      setAddedCounts({});
      setNotification('');
    }
  }, [isOpen]);

  const fetchProducts = async (queryStr) => {
    setLoading(true);
    try {
      const data = await getProducts({ search: queryStr, status: 'active' });
      setProducts(data.products || []);
    } catch (err) {
      console.error('Search error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    fetchProducts(val);
  };

  const handleSelect = (product, variant) => {
    onSelectVariant(product, variant);

    setAddedCounts((prev) => ({
      ...prev,
      [variant.barcode]: (prev[variant.barcode] || 0) + 1
    }));

    setNotification(`Added "${product.name} (${variant.size}/${variant.color})" to exchange bill`);
    setTimeout(() => {
      setNotification('');
    }, 2500);

    if (closeOnSelect) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Search Catalog & Select Multiple Replacement Products" maxWidth="max-w-4xl">
      <div className="space-y-4">
        {notification && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-xs rounded-xl flex items-center gap-2 animate-fade-in shadow-xs">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{notification}</span>
          </div>
        )}

        {/* Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-600" />
          <input
            type="text"
            autoFocus
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Search by Product Name, SKU, Category or Barcode..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-semibold outline-none transition bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500 shadow-xs"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs font-semibold">Searching products catalog...</div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs font-semibold">No matching products found.</div>
        ) : (
          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
            {products.map((product) => (
              <div
                key={product._id}
                className="border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors bg-white border-slate-200 text-slate-900 shadow-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm">{product.name}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] uppercase font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {product.sku}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                      {product.category?.name || 'General'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-3 font-semibold">
                    <span>
                      Selling Price:{' '}
                      <strong className="text-emerald-600 font-extrabold">
                        {formatCurrency(product.sellingPrice, settings?.currencySymbol)}
                      </strong>
                    </span>
                    <span>
                      MRP:{' '}
                      <span className="line-through text-slate-400 font-medium">
                        {formatCurrency(product.mrp, settings?.currencySymbol)}
                      </span>
                    </span>
                    <span>GST: {product.taxPercent}%</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => {
                    const outOfStock = variant.stock <= 0;
                    const count = addedCounts[variant.barcode] || 0;
                    return (
                      <button
                        key={variant.barcode}
                        disabled={outOfStock}
                        onClick={() => handleSelect(product, variant)}
                        className={`px-3 py-2 rounded-xl border text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${
                          outOfStock
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            : count > 0
                            ? 'bg-emerald-600 border-emerald-600 text-white font-black shadow-md shadow-emerald-600/20'
                            : 'bg-amber-50 hover:bg-amber-500 border-amber-200 text-amber-900 hover:text-slate-950 font-extrabold shadow-xs'
                        }`}
                      >
                        <span>Size {variant.size} ({variant.color})</span>
                        {count > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-white text-emerald-900 font-black">
                            +{count} Added
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 font-extrabold">
                            {variant.stock} left
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="text-xs font-semibold text-slate-500">
            Click any size/color variant button to add multiple items directly to the exchange bill.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold cursor-pointer shadow-md"
          >
            Done Adding Products
          </button>
        </div>
      </div>
    </Modal>
  );
};
