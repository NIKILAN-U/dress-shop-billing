import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Percent, DollarSign, AlertCircle } from 'lucide-react';
import { useSelector } from 'react-redux';

export const DiscountModal = ({ isOpen, onClose, subtotal, currentDiscountType, currentDiscountValue, onApplyDiscount }) => {
  const { user } = useSelector((state) => state.auth);
  const { settings } = useSelector((state) => state.settings);

  const [type, setType] = useState(currentDiscountType || 'fixed');
  const [value, setValue] = useState(currentDiscountValue || 0);
  const [error, setError] = useState('');

  const maxCashierDiscount = settings?.maxCashierDiscountPercent || 10;
  const isCashier = user?.role === 'cashier';

  const handleSave = (e) => {
    e.preventDefault();
    setError('');

    const val = Number(value || 0);
    let calculatedPercentage = 0;

    if (type === 'percentage') {
      calculatedPercentage = val;
    } else {
      calculatedPercentage = (val / Math.max(1, subtotal)) * 100;
    }

    if (isCashier && calculatedPercentage > maxCashierDiscount) {
      setError(`Cashier discount cannot exceed ${maxCashierDiscount}%. (Entered: ${calculatedPercentage.toFixed(1)}%)`);
      return;
    }

    onApplyDiscount(type, val);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Apply Bill Discount" maxWidth="max-w-md">
      <form onSubmit={handleSave} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isCashier && (
          <div className="p-2.5 rounded bg-slate-900 border border-slate-700/80 text-[11px] text-amber-400">
            Note: As cashier, your max allowed bill discount is <strong>{maxCashierDiscount}%</strong>.
          </div>
        )}

        <div>
          <label className="block text-xs text-slate-300 font-medium mb-1.5">Discount Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('fixed')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                type === 'fixed'
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Fixed Amount (₹)</span>
            </button>

            <button
              type="button"
              onClick={() => setType('percentage')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                type === 'percentage'
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
              }`}
            >
              <Percent className="w-3.5 h-3.5" />
              <span>Percentage (%)</span>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-300 font-medium mb-1">
            Discount Value ({type === 'percentage' ? '%' : settings?.currencySymbol || '₹'})
          </label>
          <input
            type="number"
            min="0"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono text-sm outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
          >
            Apply Discount
          </button>
        </div>
      </form>
    </Modal>
  );
};
