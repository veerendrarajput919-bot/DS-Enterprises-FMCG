import React, { useState } from 'react';
import { Lock, User, ShieldCheck, AlertCircle, ArrowRight, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginView() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-navy-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Brand Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 px-8 py-8 text-white text-center border-b border-navy-700/50">
            <div className="inline-flex p-3 bg-white/10 backdrop-blur-md rounded-2xl mb-3 shadow-inner ring-1 ring-white/20">
              <Building2 className="w-8 h-8 text-teal-400" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">DS ENTERPRISES</h1>
            <p className="text-xs text-slate-300 mt-1 uppercase tracking-wider font-semibold">
              Sales Analytics & Distribution Management System
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2.5 text-rose-700 text-xs animate-shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Username or Email
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full text-xs font-medium pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy-800 focus:border-navy-800 focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs font-medium pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-navy-800 focus:border-navy-800 focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center space-x-2 text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-300 text-navy-800 focus:ring-navy-800"
                />
                <span className="font-medium">Remember session</span>
              </label>
              <span className="text-slate-400 hover:text-slate-600 cursor-pointer">
                Enterprise Secure Access
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center space-x-2 py-3 px-4 bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold rounded-xl shadow-lg shadow-navy-900/20 transition-all hover:shadow-navy-900/30 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Footer note */}
          <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-500 font-medium flex items-center justify-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Role-Based Access Control • 256-bit Encrypted Session</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

