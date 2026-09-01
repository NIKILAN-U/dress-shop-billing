import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`rounded-2xl border shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 transition-colors ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-center justify-between px-5 py-4 border-b sticky top-0 z-10 ${
            isDark ? 'border-slate-800 bg-slate-900/90' : 'border-slate-100 bg-white/90'
          }`}
        >
          <h2 className="text-base font-extrabold tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
};
