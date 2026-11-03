import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckSquare,
  Square,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Layers
} from 'lucide-react';
import { userAPI } from '../services/api';

const MODULE_PERMISSIONS = [
  {
    category: 'Sales & Analytics',
    description: 'Access to sales dashboards, trends, customer metrics and sales reports',
    actions: [
      { key: 'sales.view', label: 'View Sales Dashboards & Trends' },
      { key: 'sales.export', label: 'Export Sales Excel / PDF Reports' },
      { key: 'party.view', label: 'View Party & Outlet Directory' },
      { key: 'party.manage', label: 'Create & Edit Customer Records' },
      { key: 'routes.manage', label: 'Manage Beat Routes & SO Assignment' }
    ]
  },
  {
    category: 'Receivables & Billing',
    description: 'Invoice generation, overdue management and payment collection recording',
    actions: [
      { key: 'invoices.view', label: 'View Invoices & Outstanding Bills' },
      { key: 'invoices.create', label: 'Punch Sales Invoices / Orders' },
      { key: 'payments.collect', label: 'Record Payment Collections & Issue Receipts' },
      { key: 'payments.view', label: 'View Collection History & Ledgers' },
      { key: 'aging.view', label: 'View Aging Analysis & Send Reminders' }
    ]
  },
  {
    category: 'Inventory & Procurement',
    description: 'Product catalog, stock ledger, stock adjustments and purchase inwards',
    actions: [
      { key: 'products.view', label: 'View Stock Catalog & Matrix' },
      { key: 'products.manage', label: 'Add / Edit Product Details & Prices' },
      { key: 'stock.adjust', label: 'Perform Stock In / Out Adjustments' },
      { key: 'purchases.manage', label: 'Record Supplier Purchases & Inward Bills' }
    ]
  },
  {
    category: 'System & Administration',
    description: 'Global system configuration, user accounts, and data migration',
    actions: [
      { key: 'users.manage', label: 'Create, Edit & Disable Staff Accounts' },
      { key: 'roles.manage', label: 'Configure Role Permissions' },
      { key: 'import.execute', label: 'Run Bulk Excel / CSV Data Import' },
      { key: 'settings.manage', label: 'Modify Company Profile & Tax Settings' }
    ]
  }
];

export default function RolePermissionManagement() {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('Sales Executive');
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await userAPI.getRoles();
      const list = res.data || [];
      setRoles(list);
      if (list.length > 0) {
        const found = list.find(r => r.name === selectedRole) || list[0];
        setSelectedRole(found.name);
        setPermissions(found.permissions || {});
      }
    } catch (err) {
      setError('Failed to fetch role permissions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (roleName) => {
    setSelectedRole(roleName);
    const found = roles.find(r => r.name === roleName);
    if (found) {
      setPermissions(found.permissions || {});
    }
  };

  const togglePermission = (permKey) => {
    setPermissions(prev => ({
      ...prev,
      [permKey]: !prev[permKey]
    }));
  };

  const toggleCategory = (actions, selectAll) => {
    const updated = { ...permissions };
    actions.forEach(a => {
      updated[a.key] = selectAll;
    });
    setPermissions(updated);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMsg(null);
      await userAPI.updateRolePermissions(selectedRole, permissions);
      setSuccessMsg(`Permissions for role "${selectedRole}" updated successfully!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      setError('Error saving permissions: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-navy-50 text-navy-700 rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Role & Permission Matrix</h1>
            <p className="text-xs text-slate-500">Fine-grained operational access control for sales, billing, warehouse & administration</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-navy-800 hover:bg-navy-900 rounded-lg transition-colors shadow-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Role Permissions'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-emerald-800 text-sm animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Role Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {[
          'Super Admin',
          'Administrator',
          'Sales Manager',
          'Sales Executive',
          'Accountant',
          'Inventory Manager'
        ].map((role) => (
          <button
            key={role}
            onClick={() => handleRoleChange(role)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-2 ${
              selectedRole === role
                ? 'bg-navy-900 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${selectedRole === role ? 'text-teal-400' : 'text-slate-400'}`} />
            <span>{role}</span>
          </button>
        ))}
      </div>

      {/* Permission Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {MODULE_PERMISSIONS.map((cat, idx) => {
          const allActive = cat.actions.every(a => permissions[a.key]);
          return (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div>
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{cat.category}</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">{cat.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.actions, !allActive)}
                    className="text-[11px] font-semibold text-navy-700 hover:underline"
                  >
                    {allActive ? 'Uncheck All' : 'Select All'}
                  </button>
                </div>

                <div className="p-4 divide-y divide-slate-100">
                  {cat.actions.map((act) => {
                    const isChecked = !!permissions[act.key];
                    return (
                      <div
                        key={act.key}
                        onClick={() => togglePermission(act.key)}
                        className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 px-2 rounded-lg transition-colors"
                      >
                        <div className="pr-3">
                          <span className="text-xs font-semibold text-slate-800 block">{act.label}</span>
                          <span className="text-[10px] font-mono text-slate-400">{act.key}</span>
                        </div>
                        <div>
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-navy-700" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-[11px] text-slate-500 text-right">
                {cat.actions.filter(a => permissions[a.key]).length} of {cat.actions.length} enabled
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Save Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div className="text-xs text-slate-600">
          Editing permissions for <span className="font-bold text-navy-900">{selectedRole}</span>. Changes take effect on next login.
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-1.5 px-6 py-2.5 text-xs font-bold text-white bg-navy-800 hover:bg-navy-900 rounded-lg transition-colors shadow-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Apply & Save Permissions'}</span>
        </button>
      </div>
    </div>
  );
}

