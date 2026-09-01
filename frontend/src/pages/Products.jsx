import React, { useState, useEffect } from 'react';
import { getProducts, deleteProduct } from '../services/productService';
import { getCategories } from '../services/categoryService';
import { ProductFormModal } from './ProductFormModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatCurrency } from '../utils/formatters';
import { useSelector } from 'react-redux';
import { Plus, Search, Edit3, Trash2, Package } from 'lucide-react';

export const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [productToEdit, setProductToEdit] = useState(null);

  const { user } = useSelector((state) => state.auth);
  const { settings } = useSelector((state) => state.settings);
  const isAdmin = user?.role === 'admin';
  const symbol = settings?.currencySymbol || '₹';

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        getProducts({ search, category: selectedCategory }),
        getCategories()
      ]);
      setProducts(pRes.products || []);
      setCategories(cRes.categories || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Disable product "${name}"?`)) return;
    try {
      await deleteProduct(id);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to disable product');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Product Catalog & Inventory</h1>
          <p className="text-xs text-slate-400">Manage dress shop products, pricing, SKUs, sizes & barcodes</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setProductToEdit(null);
              setShowModal(true);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product name, SKU or barcode..."
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
          >
            Filter
          </button>
        </form>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full sm:w-48 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white outline-none"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Product List Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <LoadingSpinner label="Loading products catalog..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 uppercase text-[10px] text-slate-400">
                <tr>
                  <th className="py-3 px-4">Product Name & SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Gender</th>
                  <th className="py-3 px-4 text-center">Prices (Selling / MRP)</th>
                  <th className="py-3 px-4">Variants (Size / Color / Barcode / Stock)</th>
                  {isAdmin && <th className="py-3 px-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {products.map((p) => {
                  const totalUnits = p.variants.reduce((sum, v) => sum + v.stock, 0);
                  const isLow = totalUnits <= p.minStockLevel;

                  return (
                    <tr key={p._id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-xs">{p.name}</div>
                        <div className="text-[11px] text-indigo-400 font-mono mt-0.5">{p.sku}</div>
                      </td>
                      <td className="py-3.5 px-4">{p.category?.name || 'General'}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                          {p.gender}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-emerald-400">{formatCurrency(p.sellingPrice, symbol)}</div>
                        <div className="text-[10px] text-slate-500 line-through">MRP: {formatCurrency(p.mrp, symbol)}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {p.variants.map((v) => (
                            <div
                              key={v.barcode}
                              className={`px-2 py-1 rounded text-[11px] border font-mono flex items-center gap-1.5 ${
                                v.stock <= 0
                                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                                  : 'bg-slate-800 border-slate-700 text-slate-300'
                              }`}
                            >
                              <span>{v.size}</span>
                              <span className="text-slate-500">({v.color})</span>
                              <span className="font-bold text-indigo-400">{v.barcode}</span>
                              <span className={`px-1 rounded font-bold ${v.stock <= 0 ? 'bg-rose-600 text-white' : 'bg-slate-900 text-emerald-400'}`}>
                                {v.stock}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setProductToEdit(p);
                                setShowModal(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p._id, p.name)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductFormModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        productToEdit={productToEdit}
        onSaved={fetchData}
      />
    </div>
  );
};
