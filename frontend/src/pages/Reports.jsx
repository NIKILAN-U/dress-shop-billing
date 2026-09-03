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
          <h1 className="text-xl font-extrabold text-slate-900 tracking-wide">Financial & Sales Analytics Reports</h1>
          <p className="text-xs text-slate-500 font-medium">Generate itemized sales revenue reports and estimated net profit analysis</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 transition shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export to Excel</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Tab Switcher */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-full md:w-auto border border-slate-200">
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'sales' ? 'bg-amber-500 text-slate-950 shadow-xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Sales Revenue Report</span>
          </button>
          <button
            onClick={() => setActiveTab('profit')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === 'profit' ? 'bg-amber-500 text-slate-950 shadow-xs font-extrabold' : 'text-slate-600 hover:text-slate-900'
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
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold outline-none focus:border-amber-500 shadow-xs"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold outline-none focus:border-amber-500 shadow-xs"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl shadow-xs cursor-pointer"
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
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">Total Invoices</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{salesReport?.summary?.totalBills || 0}</div>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">Gross Sales Subtotal</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{formatCurrency(salesReport?.summary?.totalSubtotal, symbol)}</div>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">Total Discounts Given</div>
              <div className="text-2xl font-black text-rose-600 mt-1">-{formatCurrency(salesReport?.summary?.totalDiscount, symbol)}</div>
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <div className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">Net Sales Revenue</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(salesReport?.summary?.totalRevenue, symbol)}</div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] text-slate-500 font-extrabold">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesReport?.sales?.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-extrabold text-amber-800">{s.invoiceNumber}</td>
                    <td className="py-3 px-4 text-slate-500 font-semibold">{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-slate-900 font-extrabold">{s.customerName}</td>
                    <td className="py-3 px-4 text-slate-500 font-semibold">{s.cashierName || s.cashier?.name}</td>
                    <td className="py-3 px-4 text-slate-700 font-semibold">{s.paymentMethod}</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-600">{formatCurrency(s.grandTotal, symbol)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
          <h2 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-amber-600" />
            <span>Estimated Profit & Loss Calculation Breakdown</span>
          </h2>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-700 font-bold">Total Sales Revenue (+)</span>
              <span className="font-black text-emerald-600 text-sm">{formatCurrency(profitReport?.salesRevenue, symbol)}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-700 font-bold">Cost of Goods Sold (COGS) (-)</span>
              <span className="font-black text-rose-600 text-sm">-{formatCurrency(profitReport?.costOfGoodsSold, symbol)}</span>
            </div>

            <div className="flex justify-between py-2 bg-amber-50 border border-amber-200 px-3 rounded-xl text-amber-900 font-black">
              <span>Gross Profit (Sales - COGS)</span>
              <span>{formatCurrency(profitReport?.grossProfit, symbol)}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-700 font-bold">Total Discounts Allowed (-)</span>
              <span className="font-extrabold text-slate-500">-{formatCurrency(profitReport?.totalDiscount, symbol)}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-700 font-bold">Total Operating Expenses (-)</span>
              <span className="font-black text-rose-600">-{formatCurrency(profitReport?.totalExpenses, symbol)}</span>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between mt-4">
              <span className="font-black uppercase text-xs text-emerald-800">Estimated Net Profit</span>
              <span className="text-2xl font-black text-slate-900">{formatCurrency(profitReport?.estimatedNetProfit, symbol)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
