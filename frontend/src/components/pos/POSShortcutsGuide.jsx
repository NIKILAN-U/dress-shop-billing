import React from 'react';
import { Modal } from '../common/Modal';

export const POSShortcutsGuide = ({ isOpen, onClose }) => {
  const shortcuts = [
    { key: 'F1', label: 'Start New Bill / Clear Cart' },
    { key: 'F2', label: 'Search Product Catalog' },
    { key: 'F4', label: 'Select or Add Customer' },
    { key: 'F8', label: 'Open Payment Modal' },
    { key: 'F9', label: 'Confirm Payment & Print Receipt' },
    { key: 'ESC', label: 'Close Active Modal or Clear Search' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts Reference" maxWidth="max-w-md">
      <div className="space-y-3">
        {shortcuts.map((sc) => (
          <div key={sc.key} className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-lg">
            <span className="text-xs text-slate-300 font-medium">{sc.label}</span>
            <kbd className="px-2.5 py-1 bg-slate-800 border border-indigo-500/40 rounded text-indigo-400 font-mono text-xs font-bold shadow-xs">
              {sc.key}
            </kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
};
