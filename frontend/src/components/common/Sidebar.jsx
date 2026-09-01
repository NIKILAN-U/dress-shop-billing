import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard,
  ShoppingCart,
  History,
  RotateCcw,
  Package,
  Layers,
  Tag,
  Boxes,
  Truck,
  ShoppingBag,
  Users,
  Receipt,
  BarChart3,
  UserCheck,
  Settings,
  Database
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useSelector((state) => state.auth);
  const { theme } = useTheme();
  const isAdmin = user?.role === 'admin';
  const isDark = theme === 'dark';

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, role: 'all' },
    { label: 'POS Billing', path: '/pos', icon: ShoppingCart, role: 'all' },
    { label: 'Sales History', path: '/sales', icon: History, role: 'all' },
    { label: 'Returns', path: '/returns', icon: RotateCcw, role: 'all' },

    { header: 'Catalog & Stock' },
    { label: 'Products', path: '/products', icon: Package, role: 'all' },
    { label: 'Categories', path: '/categories', icon: Layers, role: 'all' },
    { label: 'Brands', path: '/brands', icon: Tag, role: 'all' },
    { label: 'Inventory', path: '/inventory', icon: Boxes, role: 'all' },

    { header: 'Purchases & Contacts' },
    { label: 'Purchases', path: '/purchases', icon: ShoppingBag, role: 'admin' },
    { label: 'Suppliers', path: '/suppliers', icon: Truck, role: 'admin' },
    { label: 'Customers', path: '/customers', icon: Users, role: 'all' },

    { header: 'Management' },
    { label: 'Expenses', path: '/expenses', icon: Receipt, role: 'admin' },
    { label: 'Reports', path: '/reports', icon: BarChart3, role: 'admin' },
    { label: 'Staff Users', path: '/users', icon: UserCheck, role: 'admin' },
    { label: 'Shop Settings', path: '/settings', icon: Settings, role: 'admin' },
    { label: 'Backups', path: '/backups', icon: Database, role: 'admin' }
  ];

  return (
    <aside
      className={`w-60 border-r flex flex-col justify-between overflow-y-auto shrink-0 select-none transition-colors ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}
    >
      <div className="py-4 px-3 space-y-1">
        {navItems.map((item, idx) => {
          if (item.header) {
            return (
              <div
                key={idx}
                className={`pt-4 pb-1 px-3 text-[11px] font-bold uppercase tracking-wider ${
                  isDark ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {item.header}
              </div>
            );
          }

          if (item.role === 'admin' && !isAdmin) return null;

          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : isDark
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-indigo-600'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div
        className={`p-3 m-3 rounded-xl border text-[11px] font-medium text-center ${
          isDark
            ? 'bg-slate-950/60 border-slate-800 text-slate-400'
            : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}
      >
        <span>Dress Shop POS v1.0 • Local Engine</span>
      </div>
    </aside>
  );
};
