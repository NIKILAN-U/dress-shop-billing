import React, { useState, useEffect } from 'react';
import { getPurchases } from '../services/purchaseService';
import { PurchaseFormModal } from './PurchaseFormModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { useSelector } from 'react-redux';
import { Plus, ShoppingBag, Eye } from 'lucide-react';

export const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const { settings } = useSelector((state) => state.settings);
  const symbol = settings?.currencySymbol || '₹';

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const data = await getPurchases();
      setPurchases(data.purchases || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Purchase Management</h1>
          <p className="text-xs text-slate-400">Record inventory intake from suppliers with automatic stock increase</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-600/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Invoice</span>
        </button>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <LoadingSpinner label="Loading purchase records..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 uppercase text-[10px] text-slate-400">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Purchase Date</th>
                  <th className="py-3 px-4 text-center">Items Purchased</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {purchases.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-indigo-400">{p.invoiceNumber}</td>
                    <td className="py-3 px-4 font-medium text-white">{p.supplierName || p.supplier?.name}</td>
                    <td className="py-3 px-4 text-slate-400">{formatDateTime(p.purchaseDate)}</td>
                    <td className="py-3 px-4 text-center font-bold">{p.items.length} Items</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      {formatCurrency(p.grandTotal, symbol)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.paymentStatus === 'Paid'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : p.paymentStatus === 'Partial'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {p.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PurchaseFormModal isOpen={showModal} onClose={() => setShowModal(false)} onSaved={fetchList} />
    </div>
  );
};
