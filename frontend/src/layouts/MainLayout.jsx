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
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  // Global POS Keyboard Shortcuts listener. Ctrl+Shift+N mirrors F1 as a
  // fallback for keyboards where bare F-keys are remapped to hardware
  // functions (volume/brightness) unless Fn Lock is enabled.
  useEffect(() => {
    const handleGlobalShortcuts = (e) => {
      if (e.key === 'F1' || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'n')) {
        e.preventDefault();
        navigate('/pos');
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [navigate]);

  // Electron's File menu "New Billing Sale" (Ctrl+N) sends this over IPC —
  // nothing was listening for it, so the accelerator silently did nothing.
  useEffect(() => {
    if (!window.electronAPI?.onMenuTrigger) return;
    window.electronAPI.onMenuTrigger('menu:new-sale', () => navigate('/pos'));
  }, [navigate]);

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      <Navbar onOpenShortcuts={() => setShowShortcuts(true)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <Outlet />
        </main>
      </div>

      <POSShortcutsGuide isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
};
