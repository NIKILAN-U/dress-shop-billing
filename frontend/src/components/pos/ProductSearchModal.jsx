import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { getProducts } from '../../services/productService';
import { Search, Tag, Package, Check } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

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
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Type Product Name, SKU, Category or Barcode..."
            className="w-full pl-11 pr-4 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-sm outline-none focus:border-indigo-500"
          />
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Searching products...</div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">No matching products found.</div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {products.map((product) => (
              <div
                key={product._id}
                className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{product.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-800 text-indigo-400 border border-slate-700">
                      {product.sku}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300">
                      {product.category?.name || 'General'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-3">
                    <span>Price: <strong className="text-emerald-400">{formatCurrency(product.sellingPrice, settings?.currencySymbol)}</strong></span>
                    <span>MRP: <span className="line-through text-slate-500">{formatCurrency(product.mrp, settings?.currencySymbol)}</span></span>
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
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                          outOfStock
                            ? 'bg-slate-800/40 border-slate-700/40 text-slate-600 cursor-not-allowed'
                            : 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600 hover:text-white'
                        }`}
                      >
                        <span>Size {variant.size} ({variant.color})</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] ${outOfStock ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-emerald-400'}`}>
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
