import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Menu, Bell, Search, ShieldCheck, LogOut, User, 
  Building2, Calendar, Clock 
} from 'lucide-react';

export default function TopNav({ onToggleSidebar, activeModuleTitle }) {
  const { user, logout, isAdmin } = useAuth();
  const today = new Date().toLocaleDateString('en-IN', { 
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' 
  });

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 shadow-sm">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Hamburger & Current View Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none transition-colors"
            title="Toggle Navigation Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 hidden sm:inline">Module /</span>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              {activeModuleTitle}
            </h1>
          </div>
        </div>

        {/* Center: Search Bar & Global Indicators */}
        <div className="hidden md:flex items-center gap-3 flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search invoices, parties, SKUs, routes..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brandTeal-500/20 focus:border-brandTeal-600 transition-all"
            />
          </div>
        </div>

        {/* Right: Mode Badge, Date, User Profile & Logout */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          
          {/* Admin Mode Indicator */}
          {isAdmin ? (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200/80 shadow-xs">
              <span className="text-sm">👑</span>
              <span>Admin Mode</span>
            </div>
          ) : (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/70">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{user?.role || 'Staff Account'}</span>
            </div>
          )}

          {/* Current Date */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 px-2 py-1 bg-slate-50 border border-slate-200/60 rounded-md">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{today}</span>
          </div>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-navy-800 to-brandTeal-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
                {user?.name || 'User'}
              </p>
              <p className="text-[10px] text-slate-500 leading-tight">
                {user?.role || 'Operator'}
              </p>
            </div>

            {/* Logout Action */}
            <button
              type="button"
              onClick={logout}
              className="p-1.5 ml-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Sign Out / Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>
    </header>
  );
}

