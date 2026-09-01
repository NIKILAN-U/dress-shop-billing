import React, { useState, useEffect } from 'react';
import { getCustomers, createCustomer, updateCustomer } from '../services/customerService';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Plus, Search, Edit3, UserCheck } from 'lucide-react';
import { useSelector } from 'react-redux';
import { formatCurrency } from '../utils/formatters';

export const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [formData, setFormData] = useState({ name: '', mobile: '', email: '', address: '', gstNumber: '' });
  const [error, setError] = useState('');

  const { settings } = useSelector((state) => state.settings);
  const symbol = settings?.currencySymbol || '₹';

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await getCustomers({ search });
      setCustomers(data.customers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchList();
  };

  const handleOpenModal = (item = null) => {
    setError('');
    if (item) {
      setEditItem(item);
      setFormData({
        name: item.name,
        mobile: item.mobile,
        email: item.email || '',
        address: item.address || '',
        gstNumber: item.gstNumber || ''
      });
    } else {
      setEditItem(null);
      setFormData({ name: '', mobile: '', email: '', address: '', gstNumber: '' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editItem) {
        await updateCustomer(editItem._id, formData);
      } else {
        await createCustomer(formData);
      }
      setShowModal(false);
      fetchList();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save customer');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Customer Directory</h1>
          <p className="text-xs text-slate-400">View registered shop customers, mobile numbers & total purchase history</p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-600/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex gap-2">
        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-80">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer name or mobile..."
              className="w-full pl-9 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
          >
            Search
          </button>
        </form>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <LoadingSpinner label="Loading customer directory..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 uppercase text-[10px] text-slate-400">
                <tr>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Mobile Number</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4 text-right">Total Purchases</th>
                  <th className="py-3 px-4 text-center">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {customers.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-white">{c.name}</td>
                    <td className="py-3 px-4 font-mono text-indigo-400">{c.mobile}</td>
                    <td className="py-3 px-4 text-slate-400">{c.email || '-'}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      {formatCurrency(c.totalPurchases, symbol)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenModal(c)}
                        className="p-1.5 text-slate-400 hover:text-indigo-400 rounded"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
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
        title={editItem ? 'Edit Customer' : 'Add Customer'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="p-2.5 bg-rose-500/20 text-rose-300 text-xs rounded">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Customer Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number *</label>
            <input
              type="text"
              required
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
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
              Save Customer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
