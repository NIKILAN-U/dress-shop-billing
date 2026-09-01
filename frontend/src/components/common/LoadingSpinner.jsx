import React from 'react';

export const LoadingSpinner = ({ label = 'Loading data...' }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
    <div className="w-8 h-8 border-3 border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
    <span className="text-xs font-medium">{label}</span>
  </div>
);
