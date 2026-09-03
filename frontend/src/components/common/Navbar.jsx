import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { useTheme } from '../../context/ThemeContext';
import { LogOut, User, ShoppingBag, Sun, Moon, Command, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Navbar = ({ onOpenShortcuts }) => {
  const { user } = useSelector((state) => state.auth);
  const { settings } = useSelector((state) => state.settings);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="h-16 px-6 flex items-center justify-between sticky top-0 z-30 bg-white text-slate-800 border-b border-slate-200 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 text-lg">
          A
        </div>
        <div>
          <h1 className="font-extrabold text-lg leading-none tracking-tight text-slate-900">
            {settings?.shopName || 'AURA TEXTILES'}
          </h1>
          <span className="text-xs text-amber-600 font-bold">
            {settings?.tagline || 'AURA — THE CLOTHING BRAND (Retail & Wholesale)'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition border bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
            title="Keyboard Shortcuts (F1, F2, F4, F8, F9)"
          >
            <Command className="w-3.5 h-3.5 text-amber-600" />
            <span>Shortcuts</span>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded border bg-white border-slate-300 text-slate-600">
              F1-F9
            </kbd>
          </button>
        )}

        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border bg-slate-50 border-slate-200">
          <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
            <User className="w-4 h-4" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-xs font-bold leading-tight flex items-center gap-1.5 text-slate-900">
              <span>{user?.name}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full uppercase font-black tracking-wider ${
                user?.role === 'admin'
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {user?.role}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium">@{user?.username}</div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
