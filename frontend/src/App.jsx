import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Layouts
import { MainLayout } from './layouts/MainLayout';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { POS } from './pages/POS';
import { SalesHistory } from './pages/SalesHistory';
import { Returns } from './pages/Returns';
import { Products } from './pages/Products';
import { Categories } from './pages/Categories';
import { Brands } from './pages/Brands';
import { Inventory } from './pages/Inventory';
import { Purchases } from './pages/Purchases';
import { Suppliers } from './pages/Suppliers';
import { Customers } from './pages/Customers';
import { Expenses } from './pages/Expenses';
import { Reports } from './pages/Reports';
import { Users } from './pages/Users';
import { Settings } from './pages/Settings';
import { Backups } from './pages/Backups';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user } = useSelector((state) => state.auth);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/pos" replace />;
  }
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="pos" element={<POS />} />
          <Route path="sales" element={<SalesHistory />} />
          <Route path="returns" element={<Returns />} />
          <Route path="products" element={<Products />} />
          <Route path="categories" element={<Categories />} />
          <Route path="brands" element={<Brands />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="customers" element={<Customers />} />

          {/* Admin Restricted Routes */}
          <Route path="purchases" element={<ProtectedRoute adminOnly><Purchases /></ProtectedRoute>} />
          <Route path="suppliers" element={<ProtectedRoute adminOnly><Suppliers /></ProtectedRoute>} />
          <Route path="expenses" element={<ProtectedRoute adminOnly><Expenses /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
          <Route path="users" element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
          <Route path="backups" element={<ProtectedRoute adminOnly><Backups /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
