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
          <h1 className="text-xl font-bold text-white tracking-wide">Stock & Inventory Ledger</h1>
          <p className="text-xs text-slate-400">Track variant stock counts and historical stock transactions audit ledger</p>
        </div>

        <div className="flex gap-2 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setTab('summary')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              tab === 'summary' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Live Stock Summary</span>
          </button>
          <button
            onClick={() => setTab('ledger')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              tab === 'ledger' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Stock Transaction Ledger</span>
          </button>
        </div>
      </div>

      {tab === 'summary' ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          {loading ? (
            <LoadingSpinner label="Loading stock summary..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 uppercase text-[10px] text-slate-400">
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
                <tbody className="divide-y divide-slate-800">
                  {stockList.map((item) => (
                    <tr key={item.barcode} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-xs">{item.productName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{item.sku}</div>
                      </td>
                      <td className="py-3 px-4">{item.category}</td>
                      <td className="py-3 px-4 text-center font-medium">
                        {item.size} / <span className="text-slate-400">{item.color}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-indigo-400">{item.barcode}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            item.isLowStock
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {item.stock} Units
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-400">
                        {formatCurrency(item.sellingPrice, symbol)}
                      </td>
                      {isAdmin && (
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleOpenAdjustModal(item)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium"
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
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          {loading ? (
            <LoadingSpinner label="Loading audit ledger..." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/80 uppercase text-[10px] text-slate-400">
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
                <tbody className="divide-y divide-slate-800">
                  {transactions.map((tx) => {
                    const isPositive = tx.quantity > 0;
                    return (
                      <tr key={tx._id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 text-slate-400">{formatDateTime(tx.createdAt)}</td>
                        <td className="py-3 px-4 font-semibold text-white">{tx.productName}</td>
                        <td className="py-3 px-4 text-slate-400">{tx.size} / {tx.color}</td>
                        <td className="py-3 px-4 font-bold text-indigo-400">{tx.type}</td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`font-bold flex items-center justify-center gap-0.5 ${
                              isPositive ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            <span>{isPositive ? `+${tx.quantity}` : tx.quantity}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-slate-400">
                          {tx.previousStock} -&gt; <strong className="text-white">{tx.newStock}</strong>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-300">{tx.referenceDocNumber || '-'}</td>
                        <td className="py-3 px-4 text-slate-400">{tx.performedBy?.name || 'System'}</td>
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
            {error && <div className="p-2.5 bg-rose-500/20 text-rose-300 text-xs rounded">{error}</div>}

            <div className="p-3 bg-slate-900 rounded border border-slate-800 text-xs space-y-1">
              <div>Size: <strong className="text-white">{selectedStockItem.size}</strong> | Color: <strong className="text-white">{selectedStockItem.color}</strong></div>
              <div>Barcode: <code className="text-indigo-400 font-mono">{selectedStockItem.barcode}</code></div>
              <div>Current Available Stock: <strong className="text-emerald-400">{selectedStockItem.stock}</strong></div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target New Stock Level *</label>
              <input
                type="number"
                min="0"
                required
                value={newStockVal}
                onChange={(e) => setNewStockVal(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Adjustment Reason / Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Physical count correction, damaged item, etc."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded text-white text-xs outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold"
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
