import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { useTheme } from '../../context/ThemeContext';
import { LogOut, User, ShoppingBag, Sun, Moon, Command, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar = ({ onOpenShortcuts }) => {
  const { user } = useSelector((state) => state.auth);
  const { settings } = useSelector((state) => state.settings);
  const { theme, toggleTheme } = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const isDark = theme === 'dark';

  return (
    <header
      className={`h-16 px-6 flex items-center justify-between sticky top-0 z-30 transition-colors border-b ${
        isDark
          ? 'bg-slate-900/90 text-white border-slate-800'
          : 'bg-white text-slate-800 border-slate-200 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <ShoppingBag className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg leading-none tracking-tight">
            {settings?.shopName || 'ELEGANCE DRESS SHOP'}
          </h1>
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold">
            {settings?.tagline || 'POS & Inventory Management'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Brightness / Light Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer border ${
            isDark
              ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-400/30'
              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
          }`}
          title="Toggle Light / Dark Brightness Theme"
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-600" />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition border ${
              isDark
                ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title="Keyboard Shortcuts (F1, F2, F4, F8, F9)"
          >
            <Command className="w-3.5 h-3.5 text-indigo-500" />
            <span>Shortcuts</span>
            <kbd className={`px-1.5 py-0.5 text-[10px] font-mono rounded border ${isDark ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-white border-slate-300 text-slate-600'}`}>
              F1-F9
            </kbd>
          </button>
        )}

        <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border ${isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'}`}>
          <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
            <User className="w-4 h-4" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
              <span>{user?.name}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full uppercase font-black tracking-wider ${
                user?.role === 'admin'
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
              }`}>
                {user?.role}
              </span>
            </div>
            <div className="text-[10px] text-slate-400">@{user?.username}</div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
