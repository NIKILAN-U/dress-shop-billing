import React, { useState, useEffect } from 'react';
import { getReturns, createReturn } from '../services/returnService';
import { getSales } from '../services/posService';
import { Modal } from '../components/common/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { useSelector } from 'react-redux';
import { RotateCcw, Plus, Search, CheckCircle } from 'lucide-react';

export const Returns = () => {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Return Form State
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [foundSale, setFoundSale] = useState(null);
  const [returnQuantities, setReturnQuantities] = useState({});
  const [refundMethod, setRefundMethod] = useState('Cash');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const { settings } = useSelector((state) => state.settings);
  const symbol = settings?.currencySymbol || '₹';

  useEffect(() => {
    fetchReturnsList();
  }, []);

  const fetchReturnsList = async () => {
    setLoading(true);
    try {
      const data = await getReturns();
      setReturns(data.returns || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchInvoice = async (e) => {
    e.preventDefault();
    setError('');
    setFoundSale(null);
    try {
      const data = await getSales({ search: invoiceSearch.trim() });
      if (data.sales && data.sales.length > 0) {
        setFoundSale(data.sales[0]);
        const initialQty = {};
        data.sales[0].items.forEach((item) => {
          initialQty[item.variantBarcode] = 0;
        });
        setReturnQuantities(initialQty);
      } else {
        setError(`No invoice found matching "${invoiceSearch}"`);
      }
    } catch (err) {
      setError('Error finding invoice');
    }
  };

  const handleQtyChange = (barcode, val, maxVal) => {
    const num = Math.min(maxVal, Math.max(0, Number(val || 0)));
    setReturnQuantities({
      ...returnQuantities,
      [barcode]: num
    });
  };

  const handleProcessReturn = async () => {
    if (!foundSale) return;
    setError('');

    const itemsToReturn = [];
    foundSale.items.forEach((item) => {
      const qty = returnQuantities[item.variantBarcode] || 0;
      if (qty > 0) {
        itemsToReturn.push({
          product: item.product,
          variantBarcode: item.variantBarcode,
          quantity: qty,
          refundUnitPrice: item.unitPrice
        });
      }
    });

    if (itemsToReturn.length === 0) {
      setError('Please select at least 1 item quantity to return');
      return;
    }

    try {
      await createReturn({
        saleId: foundSale._id,
        items: itemsToReturn,
        refundMethod,
        reason
      });
      setShowModal(false);
      fetchReturnsList();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process return');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-wide">Customer Sales Returns</h1>
          <p className="text-xs text-slate-500 font-medium">Process sales returns & auto-restock inventory</p>
        </div>

        <button
          onClick={() => {
            setFoundSale(null);
            setInvoiceSearch('');
            setError('');
            setShowModal(true);
          }}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-2 transition shadow-md shadow-amber-500/20 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>New Sales Return</span>
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <LoadingSpinner label="Loading returns ledger..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] text-slate-500 font-extrabold">
                <tr>
                  <th className="py-3 px-4">Return #</th>
                  <th className="py-3 px-4">Original Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Processed Date</th>
                  <th className="py-3 px-4">Refund Method</th>
                  <th className="py-3 px-4 text-right">Refund Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returns.map((ret) => (
                  <tr key={ret._id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-extrabold text-amber-800">{ret.returnNumber}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{ret.originalInvoiceNumber}</td>
                    <td className="py-3 px-4 font-extrabold text-slate-900">{ret.customerName || 'Walk-in Customer'}</td>
                    <td className="py-3 px-4 text-slate-500 font-semibold">{formatDateTime(ret.createdAt)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{ret.refundMethod}</td>
                    <td className="py-3 px-4 text-right font-black text-rose-600">
                      {formatCurrency(ret.totalRefundAmount, symbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Return Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Process Customer Return" maxWidth="max-w-2xl">
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">
              {error}
            </div>
          )}

          {!foundSale ? (
            <form onSubmit={handleSearchInvoice} className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">Search Original Sales Invoice #</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  placeholder="e.g. AURA-2026-001001"
                  className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-mono font-bold outline-none focus:border-amber-500 shadow-xs"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-xl shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  Find Invoice
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <div className="font-extrabold text-slate-900">Invoice: {foundSale.invoiceNumber}</div>
                <div className="text-slate-600 font-semibold">Customer: {foundSale.customerName}</div>
                <div className="text-slate-500 font-medium">Purchased Date: {formatDateTime(foundSale.createdAt)}</div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700">Select Item Quantities to Return:</div>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Item</th>
                        <th className="py-2.5 px-3 text-center">Purchased</th>
                        <th className="py-2.5 px-3 text-center">Return Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {foundSale.items.map((item) => (
                        <tr key={item.variantBarcode} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 text-slate-900 font-extrabold">
                            {item.productName} ({item.size}/{item.color})
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500 font-bold">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max={item.quantity}
                              value={returnQuantities[item.variantBarcode] || 0}
                              onChange={(e) => handleQtyChange(item.variantBarcode, e.target.value, item.quantity)}
                              className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center text-slate-900 font-extrabold outline-none focus:border-amber-500 shadow-xs"
                            />
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                            {formatCurrency(item.unitPrice, symbol)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Refund Method</label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold outline-none focus:border-amber-500"
                  >
                    <option value="Cash">Cash Refund</option>
                    <option value="UPI">UPI Transfer</option>
                    <option value="StoreCredit">Store Credit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Return Reason</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Size mismatch, Defect, etc."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setFoundSale(null)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-xl font-bold"
                >
                  Back
                </button>
                <button
                  onClick={handleProcessReturn}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>CONFIRM RETURN & RESTOCK</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
