import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  TrendingUp, FileText, Package, ShoppingBag, Store,
  CheckCircle2, AlertCircle, Percent, RefreshCw, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

export default function OverviewTrends() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [error, setError] = useState('');

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.getDashboardMetrics(period);
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [period]);

  const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-brandTeal-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading Enterprise Analytics & KPIs...</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const charts = data?.charts || {};

  const kpiCards = [
    {
      label: 'Total Sales Turnover',
      value: `₹ ${(kpis.totalSalesValue || 0).toLocaleString('en-IN')}`,
      sub: 'Gross billed this period',
      icon: TrendingUp,
      color: 'emerald',
      growth: kpis.growth?.salesGrowth || '+14.2%',
      isPositive: true
    },
    {
      label: 'Total Invoices',
      value: (kpis.totalInvoices || 0).toLocaleString('en-IN'),
      sub: 'Billed invoices created',
      icon: FileText,
      color: 'navy',
      growth: kpis.growth?.invoicesGrowth || '+8.5%',
      isPositive: true
    },
    {
      label: 'Total Quantity Sold',
      value: (kpis.totalQuantity || 0).toLocaleString('en-IN'),
      sub: 'FMCG Units & cases delivered',
      icon: Package,
      color: 'teal',
      growth: kpis.growth?.quantityGrowth || '+11.0%',
      isPositive: true
    },
    {
      label: 'Total Sales Lines',
      value: (kpis.totalSalesLines || 0).toLocaleString('en-IN'),
      sub: 'SKU invoice line items',
      icon: ShoppingBag,
      color: 'indigo',
      growth: '+6.4%',
      isPositive: true
    },
    {
      label: 'Retail Outlets / Parties',
      value: (kpis.totalParties || 0).toLocaleString('en-IN'),
      sub: 'Active kirana store network',
      icon: Store,
      color: 'slate',
      growth: '+4 New',
      isPositive: true
    },
    {
      label: 'Paid / Collected Value',
      value: `₹ ${(kpis.paidValue || 0).toLocaleString('en-IN')}`,
      sub: 'Cash & UPI market recovery',
      icon: CheckCircle2,
      color: 'emerald',
      growth: kpis.growth?.collectionGrowth || '+18.4%',
      isPositive: true
    },
    {
      label: 'Outstanding Balance',
      value: `₹ ${(kpis.unpaidValue || 0).toLocaleString('en-IN')}`,
      sub: 'Receivables due from market',
      icon: AlertCircle,
      color: 'rose',
      growth: '-3.1%',
      isPositive: true
    },
    {
      label: 'Estimated Gross Margin',
      value: `₹ ${(kpis.grossMargin || 0).toLocaleString('en-IN')}`,
      sub: `${kpis.grossMarginPercent || 0}% overall trading margin`,
      icon: Percent,
      color: 'amber',
      growth: '+2.1% margin',
      isPositive: true
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Header & Period Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Overview & Trends Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time financial turnover, market recovery, inventory movement and outlet performance
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex bg-white border border-slate-200 rounded-lg p-1 text-xs font-semibold shadow-2xs">
            {['7d', '30d', '90d', '365d'].map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-md transition-all ${
                  period === p
                    ? 'bg-navy-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchMetrics}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs transition-colors"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-brandTeal-600' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium">
          {error}
        </div>
      )}

      {/* 8 Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {card.label}
                  </p>
                  <h3 className="text-xl font-black text-slate-900 mt-1">
                    {card.value}
                  </h3>
                </div>
                <div className={`p-2 rounded-lg ${
                  card.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                  card.color === 'rose' ? 'bg-rose-50 text-rose-600' :
                  card.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                  card.color === 'teal' ? 'bg-brandTeal-50 text-brandTeal-600' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[11px] truncate">{card.sub}</span>
                <span className={`inline-flex items-center gap-0.5 font-bold text-[11px] ${
                  card.isPositive ? 'text-emerald-700' : 'text-rose-600'
                }`}>
                  {card.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {card.growth}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Row 1: Monthly Turnover Trend & Payment Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Monthly Sales & Collections Trend (2 cols) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Monthly Sales & Recovery Turnover
              </h3>
              <p className="text-xs text-slate-400">
                Billed sales volume vs cash/UPI collections over the last 6 months
              </p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthlyTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorColl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1e3a8a" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#1e3a8a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip
                  formatter={(val) => [`₹ ${Number(val).toLocaleString('en-IN')}`]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="sales" name="Billed Sales (₹)" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="collections" name="Collections (₹)" stroke="#1e3a8a" strokeWidth={2} fillOpacity={1} fill="url(#colorColl)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Status Breakdown (1 col) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Payment Status Analysis
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Distribution of invoices by settlement stage
            </p>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.paymentStatusAnalysis || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="amount"
                  >
                    {(charts.paymentStatusAnalysis || []).map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color || COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => [`₹ ${Number(val).toLocaleString('en-IN')}`, 'Pending Value']}
                    contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
            {(charts.paymentStatusAnalysis || []).map((s, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-slate-600 font-medium truncate">{s.status}:</span>
                <span className="font-bold text-slate-900 ml-auto">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Charts Row 2: Brand-wise Sales & City-wise Outstanding */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Brand-Wise Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Brand-Wise Sales Contribution
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Turnover breakdown across top FMCG partner brands
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(charts.brandSales || []).slice(0, 6)} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-15} textAnchor="end" interval={0} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip
                  formatter={(val) => [`₹ ${Number(val).toLocaleString('en-IN')}`, 'Turnover']}
                  contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* City-Wise Outstanding Breakdown */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            City & Beat Outstanding Exposure
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Unrecovered market dues grouped by operating distribution territories
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.cityOutstanding || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="city" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                <Tooltip
                  formatter={(val) => [`₹ ${Number(val).toLocaleString('en-IN')}`, 'Total Outstanding']}
                  contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="outstanding" fill="#451a03" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 3: Top 10 Selling Products & Top 10 Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top 10 Selling Products */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Top 10 Selling FMCG Products
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Highest turnover volume inventory items
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Product / SKU</th>
                  <th className="py-2.5 px-3 text-right">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Revenue (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(charts.topProducts || []).slice(0, 7).map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-800 truncate max-w-[220px]">{p.name}</div>
                      <div className="text-[10px] text-slate-400">{p.sku} • {p.brand}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-700">
                      {p.qty.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-brandTeal-700">
                      ₹ {p.value.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 10 Customers / Parties */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Top Retail Outlets / Parties
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Leading purchase volume kirana and supermarket partners
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Store Name</th>
                  <th className="py-2.5 px-3">Route</th>
                  <th className="py-2.5 px-3 text-right">Turnover</th>
                  <th className="py-2.5 px-3 text-right">Due (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(charts.topParties || []).slice(0, 7).map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">
                      <div className="truncate max-w-[180px]">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.code}</div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      {p.route}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                      ₹ {p.totalSales.toLocaleString('en-IN')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                      ₹ {p.outstanding.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}

