import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { getCustomers, createCustomer } from '../../services/customerService';
import { Search, UserPlus, Phone, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const CustomerSelectModal = ({ isOpen, onClose, onSelectCustomer }) => {
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [newCustomer, setNewCustomer] = useState({ name: '', mobile: '', email: '', address: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCustomers('');
    }
  }, [isOpen]);

  const fetchCustomers = async (queryStr) => {
    setLoading(true);
    try {
      const data = await getCustomers({ search: queryStr });
      setCustomers(data.customers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!newCustomer.name || !newCustomer.mobile) {
      setFormError('Customer name and mobile number are required');
      return;
    }
    try {
      const res = await createCustomer(newCustomer);
      onSelectCustomer(res.customer);
      setShowAddForm(false);
      onClose();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create customer');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select or Add Customer" maxWidth="max-w-xl">
      <div className="space-y-4">
        {!showAddForm ? (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    fetchCustomers(e.target.value);
                  }}
                  placeholder="Search customer name or mobile number..."
                  className={`w-full pl-10 pr-4 py-2 border rounded-xl text-xs font-medium outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Customer</span>
              </button>
            </div>

            <button
              onClick={() => {
                onSelectCustomer(null);
                onClose();
              }}
              className={`w-full py-2.5 px-4 border rounded-xl text-xs font-bold flex items-center justify-between transition cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-200'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
              }`}
            >
              <span>Walk-in Customer (Default)</span>
              <Check className="w-4 h-4 text-emerald-500" />
            </button>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {loading ? (
                <div className="text-center py-6 text-slate-400 text-xs font-semibold">Loading customer directory...</div>
              ) : (
                customers.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => {
                      onSelectCustomer(c);
                      onClose();
                    }}
                    className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer transition ${
                      isDark
                        ? 'bg-slate-900/60 border-slate-800 hover:border-indigo-500/50'
                        : 'bg-white border-slate-200 hover:border-indigo-500 shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-white text-xs">{c.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-indigo-500" />
                        <span>{c.mobile}</span>
                      </div>
                    </div>
                    <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-extrabold">Select</span>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <form onSubmit={handleCreateCustomer} className="space-y-3">
            {formError && (
              <div className="p-2.5 rounded bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold">
                {formError}
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Customer Name *</label>
              <input
                type="text"
                required
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-xl text-xs font-medium outline-none ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mobile Number *</label>
              <input
                type="text"
                required
                value={newCustomer.mobile}
                onChange={(e) => setNewCustomer({ ...newCustomer, mobile: e.target.value })}
                className={`w-full px-3 py-2 border rounded-xl text-xs font-medium outline-none ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                value={newCustomer.email}
                onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                className={`w-full px-3 py-2 border rounded-xl text-xs font-medium outline-none ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Address</label>
              <textarea
                rows={2}
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                className={`w-full px-3 py-2 border rounded-xl text-xs font-medium outline-none ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              ></textarea>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Back to Search
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-extrabold"
              >
                Save Customer
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
