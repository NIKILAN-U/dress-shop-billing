import React, { useState, useEffect } from 'react';
import { getExpenses, createExpense, deleteExpense } from '../services/expenseService';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useSelector } from 'react-redux';
import { Plus, Trash2, Receipt } from 'lucide-react';

export const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalExpense, setTotalExpense] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Electricity',
    amount: 0,
    paymentMethod: 'Cash',
    description: ''
  });
  const [error, setError] = useState('');

  const { settings } = useSelector((state) => state.settings);
  const symbol = settings?.currencySymbol || '₹';

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await getExpenses();
      setExpenses(data.expenses || []);
      setTotalExpense(data.totalExpense || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await createExpense(formData);
      setShowModal(false);
      setFormData({ title: '', category: 'Electricity', amount: 0, paymentMethod: 'Cash', description: '' });
      fetchList();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record expense');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense record?')) return;
    try {
      await deleteExpense(id);
      fetchList();
    } catch (err) {
      alert('Failed to delete expense');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Expense Management</h1>
          <p className="text-xs text-slate-400">Record shop operating expenses (Electricity, Rent, Salary, Transport)</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-600/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record Expense</span>
        </button>
      </div>

      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-semibold uppercase">Total Operating Expenses</div>
            <div className="text-2xl font-black text-rose-400">{formatCurrency(totalExpense, symbol)}</div>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <LoadingSpinner label="Loading expense records..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 uppercase text-[10px] text-slate-400">
                <tr>
                  <th className="py-3 px-4">Title & Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {expenses.map((e) => (
                  <tr key={e._id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{e.title}</div>
                      <div className="text-[11px] text-slate-400">{e.description || '-'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-semibold text-[10px]">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{formatDate(e.date)}</td>
                    <td className="py-3 px-4">{e.paymentMethod}</td>
                    <td className="py-3 px-4 text-right font-bold text-rose-400">
                      {formatCurrency(e.amount, symbol)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleDelete(e._id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record New Expense" maxWidth="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="p-2.5 bg-rose-500/20 text-rose-300 text-xs rounded">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Expense Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Shop Monthly Electricity Bill"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none"
              >
                <option value="Electricity">Electricity</option>
                <option value="Rent">Rent</option>
                <option value="Salary">Salary</option>
                <option value="Transport">Transport</option>
                <option value="Packaging">Packaging</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Amount (₹) *</label>
              <input
                type="number"
                min="0"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Method</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none"
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="BankTransfer">Bank Transfer</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Notes</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none"
            ></textarea>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-extrabold"
            >
              Save Expense
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
