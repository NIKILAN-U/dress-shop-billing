import React, { useState, useEffect } from 'react';
import { getStockSummary, getStockTransactions, adjustStock } from '../services/inventoryService';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { useSelector } from 'react-redux';
import { Boxes, History, Edit, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const Inventory = () => {
  const [tab, setTab] = useState('summary'); // 'summary' | 'ledger'
  const [stockList, setStockList] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Manual Adjustment Modal State
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState(null);
  const [newStockVal, setNewStockVal] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const { user } = useSelector((state) => state.auth);
  const { settings } = useSelector((state) => state.settings);
  const isAdmin = user?.role === 'admin';
  const symbol = settings?.currencySymbol || '₹';

  useEffect(() => {
    if (tab === 'summary') {
      fetchSummary();
    } else {
      fetchLedger();
    }
  }, [tab]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const data = await getStockSummary();
      setStockList(data.stock || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const data = await getStockTransactions();
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdjustModal = (item) => {
    setSelectedStockItem(item);
    setNewStockVal(item.stock);
    setNotes('');
    setError('');
    setShowAdjustModal(true);
  };

  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await adjustStock({
        productId: selectedStockItem.productId,
        barcode: selectedStockItem.barcode,
        newStock: Number(newStockVal),
        notes
      });
      setShowAdjustModal(false);
      fetchSummary();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to adjust stock');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-wide">Stock & Inventory Ledger</h1>
          <p className="text-xs text-slate-500 font-medium">Track variant stock counts and historical stock transactions audit ledger</p>
        </div>

        <div className="flex gap-2 bg-slate-100 border border-slate-200 p-1 rounded-xl">
          <button
            onClick={() => setTab('summary')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              tab === 'summary' ? 'bg-amber-500 text-slate-950 shadow-xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Live Stock Summary</span>
          </button>
          <button
            onClick={() => setTab('ledger')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              tab === 'ledger' ? 'bg-amber-500 text-slate-950 shadow-xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Stock Transaction Ledger</span>
          </button>
        </div>
      </div>

      {tab === 'summary' ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          {loading ? (
            <LoadingSpinner label="Loading stock summary..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] text-slate-500 font-extrabold">
                  <tr>
                    <th className="py-3 px-4">Product Name & SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Size & Color</th>
                    <th className="py-3 px-4 font-mono">Barcode</th>
                    <th className="py-3 px-4 text-center">Available Stock</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    {isAdmin && <th className="py-3 px-4 text-center">Adjust</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockList.map((item) => (
                    <tr key={item.barcode} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-extrabold text-slate-900 text-xs">{item.productName}</div>
                        <div className="text-[11px] text-slate-500 font-mono font-bold">{item.sku}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold">{item.category}</td>
                      <td className="py-3 px-4 text-center font-semibold">
                        {item.size} / <span className="text-slate-500">{item.color}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-extrabold text-amber-800">{item.barcode}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-black ${
                            item.isLowStock
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {item.stock} Units
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-black text-emerald-600">
                        {formatCurrency(item.sellingPrice, symbol)}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleOpenAdjustModal(item)}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Adjust
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
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          {loading ? (
            <LoadingSpinner label="Loading audit ledger..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] text-slate-500 font-extrabold">
                  <tr>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Size/Color</th>
                    <th className="py-3 px-4">Transaction Type</th>
                    <th className="py-3 px-4 text-center">Qty Change</th>
                    <th className="py-3 px-4 text-center">Previous -&gt; New</th>
                    <th className="py-3 px-4">Ref Document #</th>
                    <th className="py-3 px-4">Performed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => {
                    const isPositive = tx.quantity > 0;
                    return (
                      <tr key={tx._id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-500 font-semibold">{formatDateTime(tx.createdAt)}</td>
                        <td className="py-3 px-4 font-extrabold text-slate-900">{tx.productName}</td>
                        <td className="py-3 px-4 text-slate-500 font-semibold">{tx.size} / {tx.color}</td>
                        <td className="py-3 px-4 font-bold text-amber-800">{tx.type}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`font-black flex items-center justify-center gap-0.5 ${
                              isPositive ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            <span>{isPositive ? `+${tx.quantity}` : tx.quantity}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500 font-semibold">
                          {tx.previousStock} -&gt; <strong className="text-slate-900 font-black">{tx.newStock}</strong>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-700">{tx.referenceDocNumber || '-'}</td>
                        <td className="py-3 px-4 text-slate-500 font-semibold">{tx.performedBy?.name || 'System'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Adjust Stock Modal */}
      {selectedStockItem && (
        <Modal
          isOpen={showAdjustModal}
          onClose={() => setShowAdjustModal(false)}
          title={`Manual Stock Adjustment — ${selectedStockItem.productName}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveAdjustment} className="space-y-4">
            {error && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">{error}</div>}

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div>Size: <strong className="text-slate-900">{selectedStockItem.size}</strong> | Color: <strong className="text-slate-900">{selectedStockItem.color}</strong></div>
              <div>Barcode: <code className="text-amber-800 font-mono font-bold">{selectedStockItem.barcode}</code></div>
              <div>Current Available Stock: <strong className="text-emerald-600 font-extrabold">{selectedStockItem.stock}</strong></div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target New Stock Level *</label>
              <input
                type="number"
                min="0"
                required
                value={newStockVal}
                onChange={(e) => setNewStockVal(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs outline-none font-extrabold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Adjustment Reason / Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Physical count correction, damaged item, etc."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold"
              >
                Save Adjustment
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
