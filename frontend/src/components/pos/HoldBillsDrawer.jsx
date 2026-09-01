import React from 'react';
import { Modal } from '../common/Modal';
import { Play, Trash2, Clock } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const HoldBillsDrawer = ({ isOpen, onClose, heldBills, onResume, onDelete, settings }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Held Bills (${heldBills.length})`} maxWidth="max-w-xl">
      {heldBills.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs">No held bills currently in memory.</div>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {heldBills.map((bill) => {
            const billTotal = bill.cart.reduce((s, i) => s + i.totalAmount, 0);
            return (
              <div
                key={bill.id}
                className="p-4 bg-slate-900 border border-slate-700/80 rounded-xl flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{new Date(bill.timestamp).toLocaleTimeString()}</span>
                    <span className="text-slate-300 font-bold">• {bill.cart.length} items</span>
                  </div>
                  <div className="font-bold text-white text-sm mt-1">
                    {formatCurrency(billTotal, settings?.currencySymbol)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Customer: {bill.customer?.name || 'Walk-in'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onResume(bill.id);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Resume</span>
                  </button>

                  <button
                    onClick={() => onDelete(bill.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                    title="Delete Held Cart"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};
