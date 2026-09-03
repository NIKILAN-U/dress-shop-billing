import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '../services/reportService';
import { StatCard } from '../components/common/StatCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { formatCurrency } from '../utils/formatters';
import { useSelector } from 'react-redux';
import { useTheme } from '../context/ThemeContext';
import {
  TrendingUp,
  Receipt,
  DollarSign,
  Package,
  AlertTriangle,
  Banknote,
  QrCode,
  CreditCard,
  UserX
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useSelector((state) => state.settings);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await getDashboardStats();
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading live dashboard analytics..." />;

  const stats = data?.stats || {};
  const symbol = settings?.currencySymbol || '₹';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-xs text-slate-500 font-medium">Real-time shop sales, inventory stock levels & net profit analytics</p>
        </div>
        <div className="text-xs text-amber-700 bg-amber-50 px-3.5 py-1.5 rounded-xl border border-amber-200 font-bold">
          Offline Local POS Engine • Connected
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(stats.todaySalesTotal, symbol)}
          subtitle={`${stats.todayBillsCount || 0} Bills Generated Today`}
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Today's Profit"
          value={formatCurrency(stats.todayProfit, symbol)}
          subtitle="Sales - COGS - Expenses"
          icon={DollarSign}
          color="indigo"
        />
        <StatCard
          title="Total Products"
          value={stats.totalProductsCount || 0}
          subtitle={`${stats.totalStockCount || 0} Total Units in Stock`}
          icon={Package}
          color="purple"
        />
        <StatCard
          title="Low Stock Alert"
          value={stats.lowStockCount || 0}
          subtitle="Products below minimum threshold"
          icon={AlertTriangle}
          color="rose"
        />
      </div>

      {/* Payment Channel Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 border rounded-2xl flex items-center gap-3 transition-colors bg-white border-slate-200 shadow-xs">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-extrabold uppercase">Today's Cash</div>
            <div className="text-lg font-black text-slate-900">{formatCurrency(stats.todayCash, symbol)}</div>
          </div>
        </div>

        <div className="p-4 border rounded-2xl flex items-center gap-3 transition-colors bg-white border-slate-200 shadow-xs">
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-extrabold uppercase">Today's UPI</div>
            <div className="text-lg font-black text-slate-900">{formatCurrency(stats.todayUpi, symbol)}</div>
          </div>
        </div>

        <div className="p-4 border rounded-2xl flex items-center gap-3 transition-colors bg-white border-slate-200 shadow-xs">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-extrabold uppercase">Today's Card</div>
            <div className="text-lg font-black text-slate-900">{formatCurrency(stats.todayCard, symbol)}</div>
          </div>
        </div>

        <div className="p-4 border rounded-2xl flex items-center gap-3 transition-colors bg-white border-slate-200 shadow-xs">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-extrabold uppercase">Pending Due</div>
            <div className="text-lg font-black text-slate-900">{formatCurrency(stats.pendingCustomerPayments, symbol)}</div>
          </div>
        </div>
      </div>

      {/* Sales Trend Chart */}
      <div className="border rounded-2xl p-5 shadow-xs space-y-4 bg-white border-slate-200">
        <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Last 7 Days Revenue Trend</h2>
        <div className="h-64 w-full">
          {data?.salesTrend && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.salesTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', color: '#0f172a' }} />
                <Area type="monotone" dataKey="amount" stroke="#d97706" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bills */}
        <div className="border rounded-2xl p-5 space-y-3 bg-white border-slate-200 shadow-xs">
          <h2 className="text-sm font-extrabold flex items-center justify-between text-slate-900">
            <span>Recent Bills</span>
            <Receipt className="w-4 h-4 text-amber-600" />
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="uppercase text-[10px] font-bold bg-slate-100 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Invoice</th>
                  <th className="py-2 px-3">Customer</th>
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.recentBills?.map((bill) => (
                  <tr key={bill._id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-amber-700 font-mono">{bill.invoiceNumber}</td>
                    <td className="py-2 px-3 font-bold text-slate-900">{bill.customerName}</td>
                    <td className="py-2 px-3 text-slate-500 font-semibold">{bill.paymentMethod}</td>
                    <td className="py-2 px-3 text-right font-black text-emerald-600">
                      {formatCurrency(bill.grandTotal, symbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="border rounded-2xl p-5 space-y-3 bg-white border-slate-200 shadow-xs">
          <h2 className="text-sm font-extrabold flex items-center justify-between text-slate-900">
            <span>Low Stock Items Alert</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="uppercase text-[10px] font-bold bg-slate-100 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3">Product</th>
                  <th className="py-2 px-3">SKU</th>
                  <th className="py-2 px-3 text-center">Available</th>
                  <th className="py-2 px-3 text-center">Min Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.lowStockItems?.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-bold text-slate-900">{item.name}</td>
                    <td className="py-2 px-3 text-slate-500 font-mono font-bold">{item.sku}</td>
                    <td className="py-2 px-3 text-center font-black text-rose-600">{item.stock}</td>
                    <td className="py-2 px-3 text-center text-slate-500 font-bold">{item.minStockLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
