import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { getProducts } from '../../services/productService';
import { Search, Tag, Package, Check } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { useTheme } from '../../context/ThemeContext';

export const ProductSearchModal = ({ isOpen, onClose, onSelectVariant, settings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProducts('');
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Search Catalog & Select Variant" maxWidth="max-w-4xl">
      <div className="space-y-4">
        {/* Bright Light Search Input */}
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-600" />
          <input
            type="text"
            autoFocus
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Type Product Name, SKU, Category or Barcode..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-semibold outline-none transition bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500 shadow-xs"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs font-semibold">Searching products catalog...</div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs font-semibold">No matching products found.</div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
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
                    return (
                      <button
                        key={variant.barcode}
                        disabled={outOfStock}
                        onClick={() => {
                          onSelectVariant(product, variant);
                          onClose();
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                          outOfStock
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-amber-50 hover:bg-amber-500 border-amber-200 text-amber-900 hover:text-slate-950 font-extrabold shadow-xs'
                        }`}
                      >
                        <span>Size {variant.size} ({variant.color})</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                            outOfStock
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {outOfStock ? 'Out of Stock' : `${variant.stock} left`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
