import React from 'react';
import { Modal } from '../common/Modal';
import { Command } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const POSShortcutsGuide = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const shortcuts = [
    { key: 'F1', label: 'Clear Cart / Start New Bill' },
    { key: 'F2', label: 'Open Product Search Modal' },
    { key: 'F4', label: 'Select / Change Customer' },
    { key: 'F8', label: 'Open Payment Modal' },
    { key: 'F9', label: 'Instant Cash Checkout & Print' },
    { key: 'ESC', label: 'Close Active Modal / Dialog' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="POS Keyboard Shortcuts Guide" maxWidth="max-w-md">
      <div className="space-y-3">
        {shortcuts.map((s) => (
          <div
            key={s.key}
            className={`p-3 border rounded-xl flex items-center justify-between transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{s.label}</span>
            <kbd className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-mono text-xs font-bold shadow-xs">
              {s.key}
            </kbd>
          </div>
        ))}
      </div>
    </Modal>
  );
};
