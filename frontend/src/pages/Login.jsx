import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearAuthError } from '../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Lock, User, AlertCircle } from 'lucide-react';

export const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearAuthError());
    const result = await dispatch(login({ username, password }));
    if (login.fulfilled.match(result)) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl"></div>

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl shadow-indigo-600/40">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">ELEGANCE DRESS SHOP</h1>
          <p className="text-xs text-slate-400 font-medium">Billing & Inventory Management Software</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username / Mobile</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username (e.g., admin or cashier)"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700/80 rounded-xl text-white text-xs outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700/80 rounded-xl text-white text-xs outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 text-[11px] text-slate-400 space-y-0.5">
            <div className="font-semibold text-indigo-400">Demo Accounts:</div>
            <div>Admin: <code className="text-white">admin</code> / <code className="text-white">admin123</code></div>
            <div>Cashier: <code className="text-white">cashier</code> / <code className="text-white">cashier123</code></div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'LOGIN TO POS'}
          </button>
        </form>
      </div>
    </div>
  );
};
