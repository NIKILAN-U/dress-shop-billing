import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../services/settingService';
import { useDispatch, useSelector } from 'react-redux';
import { setSettings } from '../store/slices/settingSlice';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Settings as SettingsIcon, Check, Save } from 'lucide-react';

export const Settings = () => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    shopName: '',
    tagline: '',
    address: '',
    phone: '',
    email: '',
    gstNumber: '',
    invoicePrefix: '',
    currencySymbol: '₹',
    enableGst: true,
    defaultGstRate: 5,
    receiptWidth: '80mm',
    lowStockThreshold: 5,
    maxCashierDiscountPercent: 10
  });

  useEffect(() => {
    fetchSettingsData();
  }, []);

  const fetchSettingsData = async () => {
    setLoading(true);
    try {
      const res = await getSettings();
      if (res.settings) {
        setFormData(res.settings);
        dispatch(setSettings(res.settings));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await updateSettings(formData);
      dispatch(setSettings(res.settings));
      setMessage('Shop settings saved successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading shop configuration settings..." />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white tracking-wide">Shop & POS System Settings</h1>
        <p className="text-xs text-slate-400">Configure receipt headers, GST tax calculation, thermal paper width & cashier discount limits</p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2 font-medium">
          <Check className="w-4 h-4" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        {/* Shop Branding Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            Shop Branding & Contact Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Shop Name *</label>
              <input
                type="text"
                required
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Tagline</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">GSTIN Number</label>
              <input
                type="text"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Shop Address (Printed on Receipts)</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs outline-none focus:border-indigo-500"
            ></textarea>
          </div>
        </div>

        {/* Invoice & Printer Settings Section */}
        <div className="space-y-4 pt-2">
          <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            Invoice & Thermal Printer Settings
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Invoice Number Prefix</label>
              <input
                type="text"
                value={formData.invoicePrefix}
                onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Receipt Thermal Paper Width</label>
              <select
                value={formData.receiptWidth}
                onChange={(e) => setFormData({ ...formData, receiptWidth: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs outline-none"
              >
                <option value="80mm">80mm Standard Thermal Receipt</option>
                <option value="58mm">58mm Compact Thermal Receipt</option>
                <option value="A4">A4 Full Page Tax Invoice</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={formData.currencySymbol}
                onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs outline-none font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-white">Enable GST Tax Billing</div>
                <div className="text-[10px] text-slate-400">Calculate CGST/SGST on POS sales</div>
              </div>
              <input
                type="checkbox"
                checked={formData.enableGst}
                onChange={(e) => setFormData({ ...formData, enableGst: e.target.checked })}
                className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Default GST Rate (%)</label>
              <input
                type="number"
                min="0"
                value={formData.defaultGstRate}
                onChange={(e) => setFormData({ ...formData, defaultGstRate: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Max Cashier Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.maxCashierDiscountPercent}
                onChange={(e) => setFormData({ ...formData, maxCashierDiscountPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs outline-none font-bold text-amber-400"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'SAVE CONFIGURATION SETTINGS'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
