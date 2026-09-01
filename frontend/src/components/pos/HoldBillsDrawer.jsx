import React from 'react';
import { X, PlayCircle, Trash2, Clock } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useTheme } from '../../context/ThemeContext';

export const HoldBillsDrawer = ({ isOpen, onClose, heldBills, onResume, onDelete, settings }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!isOpen) return null;

  const currencySymbol = settings?.currencySymbol || '₹';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
      <div className={`w-full max-w-md h-full flex flex-col shadow-2xl transition-colors ${isDark ? 'bg-slate-900 border-l border-slate-800 text-white' : 'bg-white text-slate-900'}`}>
        <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-white'}`}>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="text-sm font-extrabold">Held Bills Queue ({heldBills.length})</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {heldBills.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">No bills currently held.</div>
          ) : (
            heldBills.map((bill) => {
              const totalItems = bill.cart.reduce((sum, item) => sum + item.quantity, 0);
              const totalAmt = bill.cart.reduce((sum, item) => sum + item.totalAmount, 0);

              return (
                <div
                  key={bill.id}
                  className={`p-4 border rounded-2xl space-y-3 transition-colors ${isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-slate-50 border-slate-200'}`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{bill.customer?.name || 'Walk-in Customer'}</span>
                    <span className="text-[10px] text-slate-500">{formatDateTime(bill.timestamp)}</span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between font-semibold">
                    <span>{totalItems} Total Items</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(totalAmt, currencySymbol)}</span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        onResume(bill.id);
                        onClose();
                      }}
                      className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <PlayCircle className="w-4 h-4" />
                      <span>Resume Bill</span>
                    </button>

                    <button
                      onClick={() => onDelete(bill.id)}
                      className="p-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 rounded-xl cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
