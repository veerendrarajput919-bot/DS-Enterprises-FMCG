import React, { useState, useEffect } from 'react';
import {
  Boxes,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Search,
  Filter,
  Download,
  PlusCircle,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { productAPI } from '../services/api';

export default function StockManagement() {
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form for stock adjustment
  const [adjustForm, setAdjustForm] = useState({
    productId: '',
    type: 'IN',
    qty: 1,
    remarks: 'Physical stock verification',
    referenceNo: ''
  });

  useEffect(() => {
    loadData();
  }, [typeFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { limit: 100 };
      if (typeFilter !== 'All') params.type = typeFilter;
      if (search) params.search = search;

      const [txRes, prodRes] = await Promise.all([
        productAPI.getStockTransactions(params),
        productAPI.getAll({ limit: 200 })
      ]);

      setTransactions(txRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      setError('Failed to load stock movements: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustForm.productId || !adjustForm.qty) return;

    try {
      setSubmitting(true);
      await productAPI.adjustStock(adjustForm.productId, {
        type: adjustForm.type,
        qty: Number(adjustForm.qty),
        remarks: adjustForm.remarks,
        referenceNo: adjustForm.referenceNo || `ADJ-${Date.now().toString().slice(-4)}`
      });

      setShowAdjustModal(false);
      setAdjustForm({
        productId: '',
        type: 'IN',
        qty: 1,
        remarks: 'Physical stock verification',
        referenceNo: ''
      });
      loadData();
    } catch (err) {
      alert('Error updating stock: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    if (!transactions.length) return;
    const rows = transactions.map(t => ({
      'Date & Time': new Date(t.createdAt).toLocaleString(),
      'Type': t.type,
      'Product Name': t.productName,
      'SKU': t.sku,
      'Qty': t.qty,
      'Prev Stock': t.prevStock,
      'New Stock': t.newStock,
      'Reference #': t.referenceNo || 'N/A',
      'Remarks': t.remarks,
      'Performed By': t.performedBy || 'Admin'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Ledger');
    XLSX.writeFile(wb, `Stock_Movement_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Metrics
  const inCount = transactions.filter(t => t.type === 'IN').reduce((acc, t) => acc + (t.qty || 0), 0);
  const outCount = transactions.filter(t => t.type === 'OUT').reduce((acc, t) => acc + (t.qty || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-navy-50 text-navy-700 rounded-lg">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Stock Movement & Ledger</h1>
            <p className="text-xs text-slate-500">Real-time inward/outward tracking, inventory reconciliation & audit trail</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAdjustModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-white bg-navy-700 hover:bg-navy-800 rounded-lg transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Stock In / Out Entry</span>
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
          >
            <Download className="w-4 h-4" />
            <span>Export Ledger</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Total Log Entries</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-navy-900">{transactions.length} Records</span>
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-emerald-600 font-semibold uppercase tracking-wider block">Total Inward (Stock In)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-emerald-700">+{inCount.toLocaleString()}</span>
            <span className="text-xs text-slate-500">Units</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-red-600 font-semibold uppercase tracking-wider block">Total Outward (Stock Out)</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-red-700">-{outCount.toLocaleString()}</span>
            <span className="text-xs text-slate-500">Units</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Active Products in System</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-slate-800">{products.length} SKUs</span>
            <span className="text-xs text-teal-600 font-semibold">Active</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadData()}
            placeholder="Search by product, SKU, reference invoice number..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
        </div>

        <div className="flex items-center space-x-2">
          {['All', 'IN', 'OUT', 'ADJUSTMENT'].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                typeFilter === type
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type === 'IN' ? '↓ Inward Only' : type === 'OUT' ? '↑ Outward Only' : type}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-4 border-navy-700 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading stock movements...
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No stock transactions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Product Details</th>
                  <th className="py-3 px-4 text-center">Movement Qty</th>
                  <th className="py-3 px-4 text-center">Prev Stock</th>
                  <th className="py-3 px-4 text-center">New Stock</th>
                  <th className="py-3 px-4">Reference / Invoice #</th>
                  <th className="py-3 px-4">Remarks / Notes</th>
                  <th className="py-3 px-4">Done By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-[11px] font-bold ${
                          tx.type === 'IN'
                            ? 'bg-emerald-100 text-emerald-800'
                            : tx.type === 'OUT'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {tx.type === 'IN' ? (
                          <>
                            <ArrowDownLeft className="w-3.5 h-3.5 mr-0.5" />
                            <span>INWARD</span>
                          </>
                        ) : tx.type === 'OUT' ? (
                          <>
                            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                            <span>OUTWARD</span>
                          </>
                        ) : (
                          <span>ADJUST</span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{tx.productName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{tx.sku}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`font-extrabold ${
                          tx.type === 'IN' ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {tx.type === 'IN' ? `+${tx.qty}` : `-${tx.qty}`}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-slate-500 font-medium">{tx.prevStock}</td>
                    <td className="py-3 px-4 text-center font-bold text-slate-900">{tx.newStock}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {tx.referenceNo || 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={tx.remarks}>
                      {tx.remarks || 'Stock movement'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      {tx.performedBy || 'Admin'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Record Stock Adjustment</h3>
              <button
                onClick={() => setShowAdjustModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Select Product / SKU <span className="text-red-500">*</span>
                </label>
                <select
                  value={adjustForm.productId}
                  onChange={(e) => setAdjustForm({ ...adjustForm, productId: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-navy-600"
                >
                  <option value="">-- Choose Item --</option>
                  {products.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name} [{p.sku}] - Current Stock: {p.currentStock} {p.unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Movement Type
                  </label>
                  <select
                    value={adjustForm.type}
                    onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-navy-600"
                  >
                    <option value="IN">Inward (Add Stock)</option>
                    <option value="OUT">Outward (Deduct Stock)</option>
                    <option value="ADJUSTMENT">Physical Audit Correction</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Quantity (Units) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={adjustForm.qty}
                    onChange={(e) => setAdjustForm({ ...adjustForm, qty: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-navy-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Reference / GRN / Invoice No
                </label>
                <input
                  type="text"
                  placeholder="e.g. GRN-0987 or AUDIT-2026"
                  value={adjustForm.referenceNo}
                  onChange={(e) => setAdjustForm({ ...adjustForm, referenceNo: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-navy-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Remarks / Audit Justification
                </label>
                <textarea
                  rows="2"
                  value={adjustForm.remarks}
                  onChange={(e) => setAdjustForm({ ...adjustForm, remarks: e.target.value })}
                  placeholder="Reason for stock movement..."
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-navy-600"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-navy-700 hover:bg-navy-800 rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Save Stock Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

