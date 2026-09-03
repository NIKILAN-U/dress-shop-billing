import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'indigo' }) => {
  const colorMap = {
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200'
  };

  return (
    <div className="border rounded-2xl p-5 shadow-xs flex items-center justify-between bg-white border-slate-200">
      <div>
        <div className="text-[11px] font-extrabold text-slate-400 tracking-wider uppercase">{title}</div>
        <div className="text-2xl font-black text-slate-900 mt-1">{value}</div>
        {subtitle && <div className="text-[11px] text-slate-500 font-semibold mt-1">{subtitle}</div>}
      </div>
      {Icon && (
        <div className={`p-3 rounded-2xl border ${colorMap[color] || colorMap.indigo}`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
};
