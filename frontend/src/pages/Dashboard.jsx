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
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-xs text-slate-500 font-medium">Real-time shop sales, inventory stock levels & net profit analytics</p>
        </div>
        <div className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-500/20 font-bold">
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
        <div className={`p-4 border rounded-2xl flex items-center gap-3 transition-colors ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Today's Cash</div>
            <div className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(stats.todayCash, symbol)}</div>
          </div>
        </div>

        <div className={`p-4 border rounded-2xl flex items-center gap-3 transition-colors ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
          <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Today's UPI</div>
            <div className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(stats.todayUpi, symbol)}</div>
          </div>
        </div>

        <div className={`p-4 border rounded-2xl flex items-center gap-3 transition-colors ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
          <div className="p-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Today's Card</div>
            <div className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(stats.todayCard, symbol)}</div>
          </div>
        </div>

        <div className={`p-4 border rounded-2xl flex items-center gap-3 transition-colors ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
          <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase">Pending Due</div>
            <div className="text-lg font-black text-slate-900 dark:text-white">{formatCurrency(stats.pendingCustomerPayments, symbol)}</div>
          </div>
        </div>
      </div>

      {/* Sales Trend Chart */}
      <div className={`border rounded-2xl p-5 shadow-sm space-y-4 transition-colors ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
        <h2 className="text-sm font-extrabold tracking-tight">Last 7 Days Revenue Trend</h2>
        <div className="h-64 w-full">
          {data?.salesTrend && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.salesTrend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="date" stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} />
                <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#475569' : '#cbd5e1', borderRadius: '8px', color: isDark ? '#fff' : '#0f172a' }} />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bills */}
        <div className={`border rounded-2xl p-5 space-y-3 transition-colors ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
          <h2 className="text-sm font-extrabold flex items-center justify-between">
            <span>Recent Bills</span>
            <Receipt className="w-4 h-4 text-indigo-500" />
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`uppercase text-[10px] font-bold ${isDark ? 'bg-slate-800/60 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                <tr>
                  <th className="py-2 px-3">Invoice</th>
                  <th className="py-2 px-3">Customer</th>
                  <th className="py-2 px-3">Method</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data?.recentBills?.map((bill) => (
                  <tr key={bill._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-bold text-indigo-600 dark:text-indigo-400">{bill.invoiceNumber}</td>
                    <td className="py-2 px-3 font-medium">{bill.customerName}</td>
                    <td className="py-2 px-3 text-slate-500">{bill.paymentMethod}</td>
                    <td className="py-2 px-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(bill.grandTotal, symbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className={`border rounded-2xl p-5 space-y-3 transition-colors ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/50'}`}>
          <h2 className="text-sm font-extrabold flex items-center justify-between">
            <span>Low Stock Items Alert</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className={`uppercase text-[10px] font-bold ${isDark ? 'bg-slate-800/60 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>
                <tr>
                  <th className="py-2 px-3">Product</th>
                  <th className="py-2 px-3">SKU</th>
                  <th className="py-2 px-3 text-center">Available</th>
                  <th className="py-2 px-3 text-center">Min Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data?.lowStockItems?.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-bold">{item.name}</td>
                    <td className="py-2 px-3 text-slate-500 font-mono">{item.sku}</td>
                    <td className="py-2 px-3 text-center font-black text-rose-600 dark:text-rose-400">{item.stock}</td>
                    <td className="py-2 px-3 text-center text-slate-500">{item.minStockLevel}</td>
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
