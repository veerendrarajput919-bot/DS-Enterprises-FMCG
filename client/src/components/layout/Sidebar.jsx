import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  BarChart3, LineChart, Store, MapPin, Layers, FileSpreadsheet,
  Receipt, Clock, WalletCards, Package, ShoppingCart, ClipboardList,
  Boxes, Truck, Users, ShieldCheck, UploadCloud, Settings, ChevronRight
} from 'lucide-react';

export default function Sidebar({ activeModule, onSelectModule, isCollapsed }) {
  const { user, isAdmin, hasPermission } = useAuth();

  const navCategories = [
    {
      category: 'Sales & Analytics',
      items: [
        { id: 'overview-trends', title: '1. Overview & Trends', icon: BarChart3, badge: 'Live' },
        { id: 'sales-analysis', title: '2. Sales Analysis', icon: LineChart, perm: 'canViewAnalytics' },
        { id: 'party-wise', title: '3. Party-Wise Sales', icon: Store, perm: 'canViewAnalytics' },
        { id: 'route-beat', title: '4. Route & Beat Analysis', icon: MapPin, perm: 'canViewAnalytics' },
        { id: 'item-brand-matrix', title: '5. Item & Brand Matrix', icon: Layers, perm: 'canViewAnalytics' },
        { id: 'sales-reports', title: '6. Sales Reports', icon: FileSpreadsheet, perm: 'canExportReports' }
      ]
    },
    {
      category: 'Receivables & Collections',
      items: [
        { id: 'bill-management', title: '7. Bill Management', icon: Receipt, perm: 'canViewOutstanding' },
        { id: 'outstanding', title: '8. Outstanding & Receivables', icon: Clock, perm: 'canViewOutstanding', badge: 'Aging' },
        { id: 'payment-collections', title: '9. Payment Collections', icon: WalletCards, perm: 'canCollectPayments' }
      ]
    },
    {
      category: 'Inventory & Field Sales',
      items: [
        { id: 'ims-stock', title: '10. IMS Stock & Products', icon: Package, perm: 'canManageProducts' },
        { id: 'order-punching', title: '11. Order Punching', icon: ShoppingCart, perm: 'canPunchOrders', badge: 'Beat' },
        { id: 'order-reports', title: '12. Order Reports', icon: ClipboardList, perm: 'canPunchOrders' },
        { id: 'stock-management', title: '13. Stock Management', icon: Boxes, perm: 'canAdjustStock' },
        { id: 'purchase-management', title: '14. Purchase Management', icon: Truck, perm: 'canManageProducts' }
      ]
    },
    {
      category: 'Administration',
      items: [
        { id: 'user-management', title: '15. User Management', icon: Users, perm: 'canManageStaff', adminOnly: true },
        { id: 'role-permissions', title: '16. Role & Permission Management', icon: ShieldCheck, perm: 'canManageStaff', adminOnly: true },
        { id: 'data-import-export', title: '17. Data Import & Export', icon: UploadCloud, perm: 'canImportData', badge: 'Excel/CSV' },
        { id: 'settings', title: '18. Settings', icon: Settings, adminOnly: true }
      ]
    }
  ];

  return (
    <aside
      className={`fixed lg:static top-0 left-0 h-screen z-40 bg-navy-900 text-slate-100 flex flex-col border-r border-navy-800 transition-all duration-300 ease-in-out select-none ${
        isCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-navy-800 bg-navy-950/40">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brandTeal-500 to-navy-800 flex items-center justify-center font-black text-white text-base shadow-md flex-shrink-0">
            DS
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <h2 className="text-sm font-black text-white tracking-wide truncate">
                DS ENTERPRISES
              </h2>
              <p className="text-[10px] text-slate-400 font-medium truncate">
                FMCG Distribution System
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Scrollable Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navCategories.map((cat, idx) => (
          <div key={idx} className="space-y-1">
            {!isCollapsed ? (
              <h3 className="px-3 text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                {cat.category}
              </h3>
            ) : (
              <div className="w-6 h-0.5 bg-navy-800 mx-auto my-2 rounded-full" />
            )}

            {cat.items.map(item => {
              // Permission check
              if (item.adminOnly && !isAdmin) return null;
              if (item.perm && !hasPermission(item.perm)) return null;

              const Icon = item.icon;
              const isActive = activeModule === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectModule(item.id)}
                  title={isCollapsed ? item.title : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group relative ${
                    isActive
                      ? 'bg-brandTeal-600 text-white font-semibold shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-navy-800/70'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 transition-transform ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-brandTeal-300'}`} />
                  
                  {!isCollapsed && (
                    <>
                      <span className="truncate flex-1 text-left">{item.title}</span>
                      {item.badge && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          isActive 
                            ? 'bg-brandTeal-800 text-brandTeal-100' 
                            : 'bg-navy-800 text-slate-400 group-hover:text-slate-200'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Sidebar Footer User Info */}
      {!isCollapsed ? (
        <div className="p-3 border-t border-navy-800 bg-navy-950/30">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="truncate">{user?.role || 'Staff Account'}</span>
            <span className="inline-block w-2 h-2 rounded-full bg-brandTeal-400" />
          </div>
        </div>
      ) : null}
    </aside>
  );
}

