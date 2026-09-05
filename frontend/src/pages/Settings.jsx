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
    receiptPrinterName: '',
    labelPrinterName: '',
    lowStockThreshold: 5,
    maxCashierDiscountPercent: 10
  });

  // Windows-installed printers, so the receipt printer (e.g. TVS RP 3200
  // Lite) and label printer (e.g. TVS LP 46 Lite) can each be targeted by
  // name instead of both fighting over one OS "default" printer.
  const [availablePrinters, setAvailablePrinters] = useState([]);

  useEffect(() => {
    fetchSettingsData();
    if (window.electronAPI?.getPrinters) {
      window.electronAPI.getPrinters().then((list) => setAvailablePrinters(list || []));
    }
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
        <h1 className="text-xl font-extrabold text-slate-900 tracking-wide">Shop & POS System Settings</h1>
        <p className="text-xs text-slate-500 font-medium">Configure receipt headers, GST tax calculation, thermal paper width & cashier discount limits</p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-bold">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        {/* Shop Branding Section */}
        <div className="space-y-4">
          <h2 className="text-sm font-extrabold text-amber-700 uppercase tracking-wider border-b border-slate-100 pb-2">
            Shop Branding & Contact Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Shop Name *</label>
              <input
                type="text"
                required
                value={formData.shopName}
                onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tagline</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN Number</label>
              <input
                type="text"
                value={formData.gstNumber}
                onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs outline-none focus:border-amber-500 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Shop Address (Printed on Receipts)</label>
            <textarea
              rows={2}
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold outline-none focus:border-amber-500"
            ></textarea>
          </div>
        </div>

        {/* Invoice & Printer Settings Section */}
        <div className="space-y-4 pt-2">
          <h2 className="text-sm font-extrabold text-amber-700 uppercase tracking-wider border-b border-slate-100 pb-2">
            Invoice & Thermal Printer Settings
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Number Prefix</label>
              <input
                type="text"
                value={formData.invoicePrefix}
                onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold text-xs outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Receipt Thermal Paper Width</label>
              <select
                value={formData.receiptWidth}
                onChange={(e) => setFormData({ ...formData, receiptWidth: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold outline-none"
              >
                <option value="80mm">80mm Standard Thermal Receipt</option>
                <option value="58mm">58mm Compact Thermal Receipt</option>
                <option value="A4">A4 Full Page Tax Invoice</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={formData.currencySymbol}
                onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs outline-none font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Receipt Printer (e.g. TVS RP 3200 Lite)</label>
              <select
                value={formData.receiptPrinterName || ''}
                onChange={(e) => setFormData({ ...formData, receiptPrinterName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold outline-none"
              >
                <option value="">Use OS Default Printer</option>
                {availablePrinters.map((p) => (
                  <option key={p.name} value={p.name}>{p.displayName || p.name}</option>
                ))}
              </select>
              {availablePrinters.length === 0 && (
                <p className="text-[10px] text-slate-400 mt-1">No printers detected — will use whatever Windows prints to by default.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Barcode Label Printer (e.g. TVS LP 46 Lite)</label>
              <select
                value={formData.labelPrinterName || ''}
                onChange={(e) => setFormData({ ...formData, labelPrinterName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-semibold outline-none"
              >
                <option value="">Use OS Default Printer</option>
                {availablePrinters.map((p) => (
                  <option key={p.name} value={p.name}>{p.displayName || p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-extrabold text-slate-900">Enable GST Tax Billing</div>
                <div className="text-[10px] text-slate-500 font-medium">Calculate CGST/SGST on POS sales</div>
              </div>
              <input
                type="checkbox"
                checked={formData.enableGst}
                onChange={(e) => setFormData({ ...formData, enableGst: e.target.checked })}
                className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Default GST Rate (%)</label>
              <input
                type="number"
                min="0"
                value={formData.defaultGstRate}
                onChange={(e) => setFormData({ ...formData, defaultGstRate: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs font-bold outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Max Cashier Discount (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.maxCashierDiscountPercent}
                onChange={(e) => setFormData({ ...formData, maxCashierDiscountPercent: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs outline-none font-extrabold text-amber-700"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'SAVE CONFIGURATION SETTINGS'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
