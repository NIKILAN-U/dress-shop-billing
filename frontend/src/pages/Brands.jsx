import React, { useState, useEffect } from 'react';
import { getBrands, createBrand, updateBrand, deleteBrand } from '../services/brandService';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Plus, Edit3, Trash2, Tag } from 'lucide-react';
import { useSelector } from 'react-redux';

export const Brands = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await getBrands();
      setBrands(data.brands || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (item = null) => {
    setError('');
    if (item) {
      setEditItem(item);
      setName(item.name);
      setDescription(item.description || '');
    } else {
      setEditItem(null);
      setName('');
      setDescription('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editItem) {
        await updateBrand(editItem._id, { name, description });
      } else {
        await createBrand({ name, description });
      }
      setShowModal(false);
      fetchList();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save brand');
    }
  };

  const handleDelete = async (id, brandName) => {
    if (!window.confirm(`Disable brand "${brandName}"?`)) return;
    try {
      await deleteBrand(id);
      fetchList();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to disable brand');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Brand Management</h1>
          <p className="text-xs text-slate-400">Manage apparel brands (Raymond, Manyavar, FabIndia, Allen Solly, etc.)</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Brand</span>
          </button>
        )}
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <LoadingSpinner label="Loading brands..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 uppercase text-[10px] text-slate-400">
                <tr>
                  <th className="py-3 px-4">Brand Name</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  {isAdmin && <th className="py-3 px-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {brands.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-white">{b.name}</td>
                    <td className="py-3 px-4 text-slate-400">{b.description || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          b.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenModal(b)}
                            className="p-1.5 text-slate-400 hover:text-indigo-400 rounded"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(b._id, b.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? 'Edit Brand' : 'Add Brand'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="p-2.5 bg-rose-500/20 text-rose-300 text-xs rounded">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Brand Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none"
            ></textarea>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold"
            >
              Save Brand
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
