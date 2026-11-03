import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Layers, Search, Filter, TrendingUp, DollarSign, Package,
  AlertTriangle, CheckCircle, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ItemBrandMatrix() {
  const [matrix, setMatrix] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [brandFilter, setBrandFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  const fetchMatrix = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (brandFilter) params.append('brand', brandFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (search) params.append('search', search);

      const [mRes, bRes, cRes] = await Promise.all([
        api.getItemBrandMatrix(params.toString()),
        api.getBrands(),
        api.getCategories()
      ]);

      if (mRes.success) setMatrix(mRes.data);
      if (bRes.success) setBrands(bRes.data);
      if (cRes.success) setCategories(cRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, [brandFilter, categoryFilter, search]);

  const exportExcel = () => {
    const data = matrix.map(m => ({
      'SKU': m.sku,
      'Product Name': m.name,
      'Brand': m.brand,
      'Category': m.category,
      'Units Sold': m.totalQuantitySold,
      'Sales Turnover (₹)': m.totalSalesValue,
      'Cost / Purchase Value (₹)': m.purchaseValue,
      'Profit Margin (₹)': m.profitMargin,
      'Margin %': `${m.marginPercent}%`,
      'Current Stock': m.currentStock,
      'Stock Status': m.stockStatus
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Item & Brand Matrix');
    XLSX.writeFile(wb, `Item_Brand_Matrix_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const totals = matrix.reduce((acc, m) => ({
    revenue: acc.revenue + (m.totalSalesValue || 0),
    cost: acc.cost + (m.purchaseValue || 0),
    profit: acc.profit + (m.profitMargin || 0),
    units: acc.units + (m.totalQuantitySold || 0)
  }), { revenue: 0, cost: 0, profit: 0, units: 0 });

  const overallMargin = totals.revenue > 0 ? ((totals.profit / totals.revenue) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Item & Brand Matrix Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Product SKU performance, gross profitability margins, and inventory health tracking
          </p>
        </div>

        <button
          type="button"
          onClick={exportExcel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Revenue</p>
          <p className="text-xl font-black text-brandTeal-700 mt-0.5">₹ {totals.revenue.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-400">{totals.units.toLocaleString('en-IN')} Units Sold</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Purchase Cost</p>
          <p className="text-xl font-black text-slate-800 mt-0.5">₹ {totals.cost.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-400">Inventory acquisition value</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Gross Profit</p>
          <p className="text-xl font-black text-emerald-700 mt-0.5">₹ {totals.profit.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-emerald-600 font-bold">Trading Margin Gain</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Overall Margin</p>
          <p className="text-xl font-black text-amber-600 mt-0.5">{overallMargin}%</p>
          <p className="text-[10px] text-slate-400">{matrix.length} Active SKUs</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search SKU or product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
          />
        </div>

        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
        >
          <option value="">All Brands</option>
          {brands.map(b => (
            <option key={b._id} value={b.name}>{b.name}</option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c._id} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">SKU / Item</th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Units Sold</th>
                <th className="py-3 px-4 text-right">Turnover</th>
                <th className="py-3 px-4 text-right">Cost Value</th>
                <th className="py-3 px-4 text-right">Profit (₹)</th>
                <th className="py-3 px-4 text-right">Margin %</th>
                <th className="py-3 px-4 text-center">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="9" className="py-8 text-center text-slate-400">Loading matrix data...</td></tr>
              ) : matrix.length === 0 ? (
                <tr><td colSpan="9" className="py-8 text-center text-slate-400">No products found.</td></tr>
              ) : (
                matrix.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.sku}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {p.brand}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {p.category}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      {p.totalQuantitySold.toLocaleString('en-IN')} {p.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹ {p.totalSalesValue.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      ₹ {p.purchaseValue.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      ₹ {p.profitMargin.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-amber-600">
                      {p.marginPercent}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.stockStatus === 'Low Stock'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {p.currentStock} {p.unit}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

