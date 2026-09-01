import React, { useState, useEffect } from 'react';
import { getSales, cancelSale } from '../services/posService';
import { Modal } from '../components/common/Modal';
import { ThermalReceipt } from '../components/print/ThermalReceipt';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { useSelector } from 'react-redux';
import { Search, Printer, Ban, Eye, FileText } from 'lucide-react';

export const SalesHistory = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [printSale, setPrintSale] = useState(null);

  const { user } = useSelector((state) => state.auth);
  const { settings } = useSelector((state) => state.settings);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const data = await getSales({ search });
      setSales(data.sales || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchSales();
  };

  const handleCancelSale = async (saleId) => {
    if (!window.confirm('Are you sure you want to cancel this invoice? Stock will be restored.')) return;
    try {
      await cancelSale(saleId);
      fetchSales();
      setShowDetailModal(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel sale');
    }
  };

  const handleReprint = (sale) => {
    setPrintSale(sale);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const symbol = settings?.currencySymbol || '₹';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Sales Billing History</h1>
          <p className="text-xs text-slate-400">Search past bills, reprint receipts, or process voids</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Invoice #, Customer or Mobile..."
              className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white outline-none focus:border-indigo-500 w-64"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
          >
            Search
          </button>
        </form>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
          <LoadingSpinner label="Loading sales history..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 uppercase text-[10px] text-slate-400">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {sales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-indigo-400">{sale.invoiceNumber}</td>
                    <td className="py-3 px-4 text-slate-400">{formatDateTime(sale.createdAt)}</td>
                    <td className="py-3 px-4 font-medium text-white">{sale.customerName}</td>
                    <td className="py-3 px-4 text-slate-400">{sale.cashierName || sale.cashier?.name}</td>
                    <td className="py-3 px-4">{sale.paymentMethod}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      {formatCurrency(sale.grandTotal, symbol)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          sale.status === 'Completed'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : sale.status === 'Cancelled'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {sale.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedSale(sale);
                            setShowDetailModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg"
                          title="View Invoice Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReprint(sale)}
                          className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg"
                          title="Reprint Thermal Bill"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Invoice Details — ${selectedSale.invoiceNumber}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900 border border-slate-800 rounded-lg">
              <div>Customer: <strong className="text-white">{selectedSale.customerName}</strong></div>
              <div>Date: <strong className="text-white">{formatDateTime(selectedSale.createdAt)}</strong></div>
              <div>Cashier: <strong className="text-white">{selectedSale.cashierName}</strong></div>
              <div>Payment: <strong className="text-white">{selectedSale.paymentMethod}</strong></div>
            </div>

            <div className="border border-slate-800 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800 text-slate-400 uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Item</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Price</th>
                    <th className="py-2 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {selectedSale.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-medium text-white">{item.productName} ({item.size}/{item.color})</td>
                      <td className="py-2 px-3 text-center">{item.quantity}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(item.unitPrice, symbol)}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-400">
                        {formatCurrency(item.totalAmount, symbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="text-sm font-bold text-white">
                Grand Total: <span className="text-emerald-400">{formatCurrency(selectedSale.grandTotal, symbol)}</span>
              </div>
              <div className="flex gap-2">
                {isAdmin && selectedSale.status !== 'Cancelled' && (
                  <button
                    onClick={() => handleCancelSale(selectedSale._id)}
                    className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Void Sale</span>
                  </button>
                )}
                <button
                  onClick={() => handleReprint(selectedSale)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      <ThermalReceipt sale={printSale} settings={settings} />
    </div>
  );
};
