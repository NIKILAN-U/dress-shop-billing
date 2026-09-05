import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ReceiptContent } from '../print/ThermalReceipt';
import { printElementSilently } from '../../utils/silentPrint';
import { Printer, CheckCircle2 } from 'lucide-react';

/**
 * Visible, on-screen confirmation of the bill that was just billed — stays
 * open until the cashier or admin explicitly closes it, rather than
 * vanishing the instant the sale completes. The actual printer output comes
 * from the hidden #printable-receipt node (ThermalReceipt); this shows the
 * same content so there's a real on-screen record even if printing is slow,
 * fails, or the printer is off.
 */
export const ReceiptPreviewModal = ({ isOpen, onClose, sale, settings }) => {
  const [printing, setPrinting] = useState(false);

  if (!sale) return null;

  const handlePrintAgain = async () => {
    setPrinting(true);
    try {
      await printElementSilently('printable-receipt', settings?.receiptPrinterName);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Sale Completed — ${sale.invoiceNumber}`} maxWidth="max-w-sm">
      <div className="space-y-4">
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Sale saved. Review the bill below, then print or close when done.</span>
        </div>

        <div className="border border-slate-200 rounded-xl bg-white p-3 max-h-[50vh] overflow-y-auto">
          <div className="text-black font-mono text-xs select-text">
            <ReceiptContent sale={sale} settings={settings} />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePrintAgain}
            disabled={printing}
            className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>{printing ? 'Printing…' : 'Print Bill'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-extrabold cursor-pointer"
          >
            Done — Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
