import React, { useRef, useEffect, useState } from 'react';
import { Barcode, Search } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const BarcodeScannerInput = ({ onBarcodeScan, onOpenSearch }) => {
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputVal.trim()) {
        onBarcodeScan(inputVal.trim());
        setInputVal('');
      }
    }
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Barcode className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-600" />
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Scan Barcode or type SKU / Barcode number (Press Enter)"
          className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 text-sm font-mono placeholder:text-slate-400 font-bold shadow-xs outline-none transition bg-white border-amber-500/40 text-slate-900 focus:border-amber-600 shadow-amber-100"
        />
      </div>
      <button
        onClick={onOpenSearch}
        className="px-4 py-3 rounded-2xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs"
        title="Search Products (F2)"
      >
        <Search className="w-4 h-4 text-amber-600" />
        <span className="hidden sm:inline">Search Product</span>
        <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded border bg-slate-100 border-slate-300 text-slate-600">
          F2
        </kbd>
      </button>
    </div>
  );
};
