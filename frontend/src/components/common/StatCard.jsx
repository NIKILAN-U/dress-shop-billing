import React from 'react';
import { useTheme } from '../../context/ThemeContext';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'indigo' }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const colorMap = {
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
  };

  return (
    <div
      className={`border rounded-2xl p-5 shadow-sm flex items-center justify-between transition-colors ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-slate-200/50'
      }`}
    >
      <div>
        <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">{title}</div>
        <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{value}</div>
        {subtitle && <div className="text-[11px] text-slate-500 font-medium mt-1">{subtitle}</div>}
      </div>
      {Icon && (
        <div className={`p-3 rounded-2xl border ${colorMap[color] || colorMap.indigo}`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
};
