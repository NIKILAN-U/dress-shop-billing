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
          <h1 className="text-xl font-extrabold text-slate-900 tracking-wide">Sales Billing History</h1>
          <p className="text-xs text-slate-500 font-medium">Search past bills, reprint receipts, or process voids</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Invoice #, Customer or Mobile..."
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold outline-none focus:border-amber-500 w-64 shadow-xs"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
          >
            Search
          </button>
        </form>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <LoadingSpinner label="Loading sales history..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] text-slate-500 font-extrabold">
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
              <tbody className="divide-y divide-slate-100">
                {sales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-mono font-extrabold text-amber-800">{sale.invoiceNumber}</td>
                    <td className="py-3 px-4 text-slate-500 font-semibold">{formatDateTime(sale.createdAt)}</td>
                    <td className="py-3 px-4 font-extrabold text-slate-900">{sale.customerName}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{sale.cashierName || sale.cashier?.name}</td>
                    <td className="py-3 px-4 text-slate-700 font-semibold">{sale.paymentMethod}</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-600">
                      {formatCurrency(sale.grandTotal, symbol)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          sale.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : sale.status === 'Cancelled'
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-amber-100 text-amber-900 border border-amber-200'
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
                          className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded-lg transition"
                          title="View Invoice Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleReprint(sale)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
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
          <div className="space-y-4 text-xs text-slate-700">
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium">
              <div>Customer: <strong className="text-slate-900 font-extrabold">{selectedSale.customerName}</strong></div>
              <div>Date: <strong className="text-slate-900 font-extrabold">{formatDateTime(selectedSale.createdAt)}</strong></div>
              <div>Cashier: <strong className="text-slate-900 font-extrabold">{selectedSale.cashierName}</strong></div>
              <div>Payment: <strong className="text-slate-900 font-extrabold">{selectedSale.paymentMethod}</strong></div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Price</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedSale.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-extrabold text-slate-900">{item.productName} ({item.size}/{item.color})</td>
                      <td className="py-2.5 px-3 text-center font-bold">{item.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-semibold">{formatCurrency(item.unitPrice, symbol)}</td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-600">
                        {formatCurrency(item.totalAmount, symbol)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="text-sm font-extrabold text-slate-900">
                Grand Total: <span className="text-emerald-600 font-black">{formatCurrency(selectedSale.grandTotal, symbol)}</span>
              </div>
              <div className="flex gap-2">
                {isAdmin && selectedSale.status !== 'Cancelled' && (
                  <button
                    onClick={() => handleCancelSale(selectedSale._id)}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Void Sale</span>
                  </button>
                )}
                <button
                  onClick={() => handleReprint(selectedSale)}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-1 shadow-md shadow-amber-500/20 cursor-pointer"
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
