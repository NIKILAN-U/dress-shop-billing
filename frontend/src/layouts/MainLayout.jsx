import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Sidebar } from '../components/common/Sidebar';
import { POSShortcutsGuide } from '../components/pos/POSShortcutsGuide';
import { useDispatch } from 'react-redux';
import { fetchSettings } from '../store/slices/settingSlice';
import { useTheme } from '../context/ThemeContext';

export const MainLayout = () => {
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  // Global POS Keyboard Shortcuts listener
  useEffect(() => {
    const handleGlobalShortcuts = (e) => {
      if (e.key === 'F1') {
        e.preventDefault();
        navigate('/pos');
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [navigate]);

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <Navbar onOpenShortcuts={() => setShowShortcuts(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className={`flex-1 overflow-y-auto p-6 transition-colors ${isDark ? 'bg-slate-950/60' : 'bg-slate-50'}`}>
          <Outlet />
        </main>
      </div>

      <POSShortcutsGuide isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
};
