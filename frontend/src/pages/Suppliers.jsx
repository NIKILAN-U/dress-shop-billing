import React, { useState, useEffect } from 'react';
import { getSuppliers, createSupplier, updateSupplier } from '../services/supplierService';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Plus, Edit3, Truck } from 'lucide-react';
import { useSelector } from 'react-redux';
import { formatCurrency } from '../utils/formatters';

export const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', gstNumber: '', notes: '' });
  const [error, setError] = useState('');

  const { user } = useSelector((state) => state.auth);
  const { settings } = useSelector((state) => state.settings);
  const isAdmin = user?.role === 'admin';
  const symbol = settings?.currencySymbol || '₹';

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await getSuppliers();
      setSuppliers(data.suppliers || []);
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
      setFormData({
        name: item.name,
        phone: item.phone,
        email: item.email || '',
        address: item.address || '',
        gstNumber: item.gstNumber || '',
        notes: item.notes || ''
      });
    } else {
      setEditItem(null);
      setFormData({ name: '', phone: '', email: '', address: '', gstNumber: '', notes: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editItem) {
        await updateSupplier(editItem._id, formData);
      } else {
        await createSupplier(formData);
      }
      setShowModal(false);
      fetchList();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save supplier');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Supplier Directory</h1>
          <p className="text-xs text-slate-400">Manage textile suppliers, phone contacts, GST numbers & balances</p>
        </div>

        {isAdmin && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
        )}
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <LoadingSpinner label="Loading suppliers directory..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 uppercase text-[10px] text-slate-400">
                <tr>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Phone / Email</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4">GSTIN</th>
                  <th className="py-3 px-4 text-right">Current Balance</th>
                  {isAdmin && <th className="py-3 px-4 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {suppliers.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-white">{s.name}</td>
                    <td className="py-3 px-4">
                      <div>{s.phone}</div>
                      <div className="text-[11px] text-slate-400">{s.email || '-'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{s.address || '-'}</td>
                    <td className="py-3 px-4 font-mono text-indigo-400">{s.gstNumber || '-'}</td>
                    <td className="py-3 px-4 text-right font-bold text-amber-400">
                      {formatCurrency(s.currentBalance, symbol)}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenModal(s)}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 rounded"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
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
        title={editItem ? 'Edit Supplier' : 'Add Supplier'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="p-2.5 bg-rose-500/20 text-rose-300 text-xs rounded">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Supplier Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number *</label>
            <input
              type="text"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">GSTIN Number</label>
            <input
              type="text"
              value={formData.gstNumber}
              onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Address</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
              Save Supplier
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
