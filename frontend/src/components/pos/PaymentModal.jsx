import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { CreditCard, Banknote, QrCode, Building, Layers, CheckCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { useTheme } from '../../context/ThemeContext';

export const PaymentModal = ({ isOpen, onClose, grandTotal, onConfirmPayment, loading, settings }) => {
  const [method, setMethod] = useState('Cash');
  const [mixedSplits, setMixedSplits] = useState({
    Cash: 0,
    UPI: 0,
    Card: 0,
    BankTransfer: 0
  });
  const [error, setError] = useState('');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (isOpen) {
      setMethod('Cash');
      setMixedSplits({
        Cash: grandTotal,
        UPI: 0,
        Card: 0,
        BankTransfer: 0
      });
      setError('');
    }
  }, [isOpen, grandTotal]);

  const currencySymbol = settings?.currencySymbol || '₹';

  const handleMixedChange = (channel, val) => {
    setMixedSplits({
      ...mixedSplits,
      [channel]: Math.max(0, Number(val || 0))
    });
  };

  const handleConfirm = () => {
    setError('');

    if (method !== 'Mixed') {
      onConfirmPayment({
        paymentMethod: method,
        payments: [{ method, amount: grandTotal }]
      });
    } else {
      const splitTotal =
        Number(mixedSplits.Cash) +
        Number(mixedSplits.UPI) +
        Number(mixedSplits.Card) +
        Number(mixedSplits.BankTransfer);

      if (Math.abs(splitTotal - grandTotal) > 0.5) {
        setError(
          `Mixed payments total (${formatCurrency(splitTotal, currencySymbol)}) must equal Grand Total (${formatCurrency(grandTotal, currencySymbol)})`
        );
        return;
      }

      const activePayments = Object.entries(mixedSplits)
        .filter(([_, amt]) => amt > 0)
        .map(([m, amt]) => ({ method: m, amount: amt }));

      onConfirmPayment({
        paymentMethod: 'Mixed',
        payments: activePayments
      });
    }
  };

  const paymentButtons = [
    { id: 'Cash', label: 'CASH', icon: Banknote, color: 'emerald' },
    { id: 'UPI', label: 'UPI / QR', icon: QrCode, color: 'indigo' },
    { id: 'Card', label: 'CARD', icon: CreditCard, color: 'purple' },
    { id: 'BankTransfer', label: 'BANK TRANSFER', icon: Building, color: 'sky' },
    { id: 'Mixed', label: 'MIXED PAYMENT', icon: Layers, color: 'amber' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Payment & Generate Bill" maxWidth="max-w-lg">
      <div className="space-y-5">
        <div className={`p-4 border rounded-2xl text-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
          <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Grand Total Amount Due</div>
          <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(grandTotal, currencySymbol)}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-2">Select Payment Method</label>
          <div className="grid grid-cols-2 gap-2">
            {paymentButtons.map((btn) => {
              const Icon = btn.icon;
              const active = method === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => setMethod(btn.id)}
                  className={`p-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer ${
                    active
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                      : isDark
                      ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{btn.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {method === 'Mixed' && (
          <div className={`p-4 border rounded-2xl space-y-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="text-xs font-extrabold text-amber-600 dark:text-amber-400">Mixed Payment Split Breakdown</div>
            {['Cash', 'UPI', 'Card', 'BankTransfer'].map((channel) => (
              <div key={channel} className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-bold">{channel} ({currencySymbol})</span>
                <input
                  type="number"
                  min="0"
                  value={mixedSplits[channel]}
                  onChange={(e) => handleMixedChange(channel, e.target.value)}
                  className={`w-32 px-3 py-1.5 border rounded-xl text-right font-mono font-bold outline-none ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{loading ? 'Processing...' : 'CONFIRM & PRINT BILL (F9)'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
