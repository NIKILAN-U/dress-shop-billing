import React, { useState, useEffect } from 'react';
import { getSalesReport, getProfitReport } from '../services/reportService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatCurrency } from '../utils/formatters';
import { useSelector } from 'react-redux';
import { Download, BarChart3, TrendingUp, DollarSign, Receipt } from 'lucide-react';
import * as XLSX from 'xlsx';

export const Reports = () => {
  const [activeTab, setActiveTab] = useState('sales'); // 'sales' | 'profit'
  const [salesReport, setSalesReport] = useState(null);
  const [profitReport, setProfitReport] = useState(null);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { settings } = useSelector((state) => state.settings);
  const symbol = settings?.currencySymbol || '₹';

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'sales') {
        const res = await getSalesReport({ startDate, endDate });
        setSalesReport(res);
      } else {
        const res = await getProfitReport({ startDate, endDate });
        setProfitReport(res.profitSummary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const exportToExcel = () => {
    if (activeTab === 'sales' && salesReport?.sales) {
      const dataToExport = salesReport.sales.map((s) => ({
        'Invoice Number': s.invoiceNumber,
        'Date': new Date(s.createdAt).toLocaleDateString(),
        'Customer': s.customerName,
        'Cashier': s.cashierName,
        'Payment Method': s.paymentMethod,
        'Subtotal': s.subtotal,
        'Discount': s.itemDiscountTotal + s.billDiscountTotal,
        'Tax': s.taxTotal,
        'Grand Total': s.grandTotal
      }));
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
      XLSX.writeFile(wb, `Sales_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-wide">Financial & Sales Analytics Reports</h1>
          <p className="text-xs text-slate-400">Generate itemized sales revenue reports and estimated net profit analysis</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export to Excel</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Tab Switcher */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex gap-2 bg-slate-800 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'sales' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Sales Revenue Report</span>
          </button>
          <button
            onClick={() => setActiveTab('profit')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'profit' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Estimated Net Profit Report</span>
          </button>
        </div>

        <form onSubmit={handleFilterSubmit} className="flex gap-2 w-full md:w-auto">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white outline-none"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-xs text-white outline-none"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded"
          >
            Apply Filter
          </button>
        </form>
      </div>

      {/* Report Content */}
      {loading ? (
        <LoadingSpinner label="Calculating financial metrics..." />
      ) : activeTab === 'sales' ? (
        <div className="space-y-6">
          {/* Summary KPI Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <div className="text-xs text-slate-400 font-semibold uppercase">Total Invoices</div>
              <div className="text-2xl font-bold text-white mt-1">{salesReport?.summary?.totalBills || 0}</div>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <div className="text-xs text-slate-400 font-semibold uppercase">Gross Sales Subtotal</div>
              <div className="text-2xl font-bold text-white mt-1">{formatCurrency(salesReport?.summary?.totalSubtotal, symbol)}</div>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <div className="text-xs text-slate-400 font-semibold uppercase">Total Discounts Given</div>
              <div className="text-2xl font-bold text-rose-400 mt-1">-{formatCurrency(salesReport?.summary?.totalDiscount, symbol)}</div>
            </div>
            <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
              <div className="text-xs text-slate-400 font-semibold uppercase">Net Sales Revenue</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">{formatCurrency(salesReport?.summary?.totalRevenue, symbol)}</div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 uppercase text-[10px] text-slate-400">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {salesReport?.sales?.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-bold text-indigo-400">{s.invoiceNumber}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-white font-medium">{s.customerName}</td>
                    <td className="py-3 px-4 text-slate-400">{s.cashierName || s.cashier?.name}</td>
                    <td className="py-3 px-4">{s.paymentMethod}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">{formatCurrency(s.grandTotal, symbol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
          <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-indigo-400" />
            <span>Estimated Profit & Loss Calculation Breakdown</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-300 font-semibold">Total Sales Revenue (+)</span>
              <span className="font-bold text-emerald-400 text-sm">{formatCurrency(profitReport?.salesRevenue, symbol)}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-300 font-semibold">Cost of Goods Sold (COGS) (-)</span>
              <span className="font-bold text-rose-400 text-sm">-{formatCurrency(profitReport?.costOfGoodsSold, symbol)}</span>
            </div>

            <div className="flex justify-between py-2 bg-slate-800/50 px-3 rounded text-indigo-300 font-bold">
              <span>Gross Profit (Sales - COGS)</span>
              <span>{formatCurrency(profitReport?.grossProfit, symbol)}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-300 font-semibold">Total Discounts Allowed (-)</span>
              <span className="font-bold text-slate-400">-{formatCurrency(profitReport?.totalDiscount, symbol)}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-800">
              <span className="text-slate-300 font-semibold">Total Operating Expenses (-)</span>
              <span className="font-bold text-rose-400">-{formatCurrency(profitReport?.totalExpenses, symbol)}</span>
            </div>

            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between mt-4">
              <span className="font-extrabold uppercase text-xs text-emerald-400">Estimated Net Profit</span>
              <span className="text-2xl font-black text-white">{formatCurrency(profitReport?.estimatedNetProfit, symbol)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
