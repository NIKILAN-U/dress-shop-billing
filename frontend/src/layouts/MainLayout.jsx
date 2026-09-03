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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
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
