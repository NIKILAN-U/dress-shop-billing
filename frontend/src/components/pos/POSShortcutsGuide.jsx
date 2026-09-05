import React from 'react';
import { Modal } from '../common/Modal';
import { Command } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const POSShortcutsGuide = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const shortcuts = [
    { key: 'F1', alt: 'Ctrl+Shift+N', label: 'Clear Cart / Start New Bill' },
    { key: 'F2', alt: 'Ctrl+Shift+S', label: 'Open Product Search Modal' },
    { key: 'F3', alt: 'Ctrl+Shift+H', label: 'Hold Current Cart' },
    { key: 'F4', alt: 'Ctrl+Shift+C', label: 'Select / Change Customer' },
    { key: 'F8', alt: 'Ctrl+Shift+Enter', label: 'Open Payment Modal' },
    { key: 'F9', alt: 'Ctrl+Shift+Q', label: 'Instant Cash Checkout & Print' },
    { key: 'F10', alt: 'Ctrl+Shift+U', label: 'Instant UPI Checkout & Print' },
    { key: 'ESC', label: 'Close Active Modal / Dialog' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="POS Keyboard Shortcuts Guide" maxWidth="max-w-md">
      <p className={`text-[11px] mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        If the F-key doesn't respond, your keyboard may have Fn Lock off (F-keys are mapped to
        volume/brightness instead) — use the alternate combination shown instead.
      </p>
      <div className="space-y-3">
        {shortcuts.map((s) => (
          <div
            key={s.key}
            className={`p-3 border rounded-xl flex items-center justify-between transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{s.label}</span>
            <div className="flex items-center gap-1.5">
              <kbd className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg font-mono text-xs font-bold shadow-xs">
                {s.key}
              </kbd>
              {s.alt && (
                <>
                  <span className="text-[10px] text-slate-400">or</span>
                  <kbd className="px-2.5 py-1 bg-slate-600 text-white rounded-lg font-mono text-xs font-bold shadow-xs whitespace-nowrap">
                    {s.alt}
                  </kbd>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};
