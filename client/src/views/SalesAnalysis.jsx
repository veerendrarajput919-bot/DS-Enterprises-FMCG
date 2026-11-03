import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  Search, Filter, RotateCcw, Download, FileText,
  Calendar, MapPin, Tag, CreditCard, ChevronDown, CheckCircle
} from 'lucide-react';

export default function SalesAnalysis() {
  const [filters, setFilters] = useState({
    quickPeriod: 'This Month',
    fromDate: '',
    toDate: '',
    city: '',
    cityMain: '',
    route: '',
    beat: '',
    category: '',
    subCategory: '',
    brand: '',
    invoiceNo: '',
    status: 'All',
    search: '',
    page: 1,
    limit: 50
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const quickFilterOptions = [
    'Today', 'Yesterday', 'Last 7 Days', 'This Month', 'Last Month',
    '3 Months', '6 Months', '365 Days', 'All Time', 'Custom Range'
  ];

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await api.filterSales(filters);
      if (res.success) {
        setResult(res);
      }
    } catch (err) {
      console.error('Filter error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [filters.quickPeriod, filters.page]);

  const handleApply = (e) => {
    if (e) e.preventDefault();
    fetchSales();
  };

  const handleReset = () => {
    setFilters({
      quickPeriod: 'This Month',
      fromDate: '',
      toDate: '',
      city: '',
      cityMain: '',
      route: '',
      beat: '',
      category: '',
      subCategory: '',
      brand: '',
      invoiceNo: '',
      status: 'All',
      search: '',
      page: 1,
      limit: 50
    });
  };

  // Export to Excel using SheetJS
  const exportToExcel = () => {
    const data = (result?.data || []).map(inv => ({
      'Invoice No': inv.invoiceNo,
      'Date': new Date(inv.billDate).toLocaleDateString('en-IN'),
      'Customer / Party': inv.partyName,
      'Party Code': inv.partyCode,
      'City': inv.city,
      'Route': inv.route,
      'Total Qty': inv.totalQuantity || 0,
      'Grand Total (₹)': inv.grandTotal || 0,
      'Paid Amount (₹)': inv.paidAmount || 0,
      'Pending Amount (₹)': inv.pendingAmount || 0,
      'Payment Status': inv.status,
      'Sales Officer': inv.salesPerson
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Analysis');
    XLSX.writeFile(wb, `Sales_Analysis_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Export to PDF using jsPDF + AutoTable
  const exportToPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('DS Enterprises — Sales Analysis & Billed Turnover Report', 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')} | Period: ${filters.quickPeriod}`, 14, 22);

    const tableRows = (result?.data || []).map(inv => [
      inv.invoiceNo,
      new Date(inv.billDate).toLocaleDateString('en-IN'),
      inv.partyName,
      inv.city,
      inv.route,
      inv.totalQuantity || 0,
      `₹ ${(inv.grandTotal || 0).toLocaleString('en-IN')}`,
      `₹ ${(inv.paidAmount || 0).toLocaleString('en-IN')}`,
      `₹ ${(inv.pendingAmount || 0).toLocaleString('en-IN')}`,
      inv.status
    ]);

    doc.autoTable({
      head: [['Invoice No', 'Date', 'Customer', 'City', 'Route', 'Qty', 'Total (₹)', 'Paid (₹)', 'Pending (₹)', 'Status']],
      body: tableRows,
      startY: 28,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14, right: 14 }
    });

    doc.save(`Sales_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const summary = result?.summary || {};

  return (
    <div className="space-y-5 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Sales Analysis & Filtering Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Multi-dimensional drill-down by date ranges, geographic territories, product brands, and settlement status
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportToExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
          
          <button
            type="button"
            onClick={exportToPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 hover:bg-navy-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Quick Date Filters Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-bold text-slate-400 whitespace-nowrap pl-1">Quick Period:</span>
        <div className="flex items-center gap-1.5 flex-nowrap">
          {quickFilterOptions.map(qp => (
            <button
              key={qp}
              type="button"
              onClick={() => setFilters(prev => ({ ...prev, quickPeriod: qp, page: 1 }))}
              className={`px-2.5 py-1 text-xs rounded-md font-semibold whitespace-nowrap transition-all ${
                filters.quickPeriod === qp
                  ? 'bg-brandTeal-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {qp}
            </button>
          ))}
        </div>
      </div>

      {/* Multi-Dimensional Filter Panel */}
      <form onSubmit={handleApply} className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* From Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">From Date</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => setFilters(prev => ({ ...prev, fromDate: e.target.value, quickPeriod: 'Custom Range' }))}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">To Date</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => setFilters(prev => ({ ...prev, toDate: e.target.value, quickPeriod: 'Custom Range' }))}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">City / Region</label>
            <input
              type="text"
              placeholder="e.g. Kanpur"
              value={filters.city}
              onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
            />
          </div>

          {/* Route / Beat */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Route / Beat</label>
            <select
              value={filters.route}
              onChange={(e) => setFilters(prev => ({ ...prev, route: e.target.value }))}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
            >
              <option value="">All Beats</option>
              <option value="Civil Lines Beat">Civil Lines Beat</option>
              <option value="Kidwai Nagar Beat">Kidwai Nagar Beat</option>
              <option value="Govind Nagar Beat">Govind Nagar Beat</option>
              <option value="Swaroop Nagar Beat">Swaroop Nagar Beat</option>
              <option value="Parade Wholesale Market">Parade Wholesale Market</option>
            </select>
          </div>

          {/* Brand */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">FMCG Brand</label>
            <select
              value={filters.brand}
              onChange={(e) => setFilters(prev => ({ ...prev, brand: e.target.value }))}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
            >
              <option value="">All Brands</option>
              <option value="ITC Limited">ITC Limited</option>
              <option value="Fortune (Adani Wilmar)">Fortune (Adani)</option>
              <option value="Hindustan Unilever">Hindustan Unilever</option>
              <option value="Nestle India">Nestle India</option>
              <option value="Britannia">Britannia</option>
              <option value="Amul (GCMMF)">Amul (GCMMF)</option>
              <option value="Dabur India">Dabur India</option>
            </select>
          </div>

          {/* Payment Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

        </div>

        {/* Search Row & Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by customer name, party code, invoice number, or product item..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brandTeal-600 hover:bg-brandTeal-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Apply Filters</span>
            </button>
          </div>
        </div>
      </form>

      {/* Dynamic Filter KPI Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="border-r border-slate-100 pr-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Filtered Turnover</p>
          <p className="text-lg font-black text-brandTeal-700 mt-0.5">
            ₹ {(summary.totalSales || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-400">{summary.totalInvoices || 0} Invoices</p>
        </div>

        <div className="border-r border-slate-100 pr-3 pl-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Recovered Amount</p>
          <p className="text-lg font-black text-emerald-700 mt-0.5">
            ₹ {(summary.totalPaid || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-emerald-700 font-semibold">
            {summary.totalSales > 0 ? Math.round((summary.totalPaid / summary.totalSales) * 100) : 0}% Recovered
          </p>
        </div>

        <div className="border-r border-slate-100 pr-3 pl-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Pending Due</p>
          <p className="text-lg font-black text-rose-600 mt-0.5">
            ₹ {(summary.totalOutstanding || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-rose-500">Market Receivables</p>
        </div>

        <div className="pl-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Units Dispatched</p>
          <p className="text-lg font-black text-slate-800 mt-0.5">
            {(summary.totalQuantity || 0).toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-slate-400">{summary.totalLines || 0} SKU Lines</p>
        </div>
      </div>

      {/* Sales Invoices Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Filtered Invoices Ledger ({result?.pagination?.total || 0})
          </h3>
          <span className="text-xs text-slate-400">
            Page {result?.pagination?.page || 1} of {result?.pagination?.pages || 1}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Route / Beat</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Invoice Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Pending</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400 font-medium">
                    Applying filters...
                  </td>
                </tr>
              ) : (result?.data || []).length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400 font-medium">
                    No invoices match the specified filter criteria.
                  </td>
                </tr>
              ) : (
                result?.data.map((inv, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-navy-800">
                      {inv.invoiceNo}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {new Date(inv.billDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{inv.partyName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{inv.partyCode} • {inv.city}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      {inv.route}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                      {inv.items ? inv.items.length : 0}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹ {(inv.grandTotal || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      ₹ {(inv.paidAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600">
                      ₹ {(inv.pendingAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                        inv.status === 'Partial' ? 'bg-amber-100 text-amber-800' :
                        inv.status === 'Overdue' ? 'bg-rose-100 text-rose-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {result?.pagination?.pages > 1 && (
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button
              disabled={filters.page <= 1}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
              className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-semibold disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-xs text-slate-600">
              Page {filters.page} of {result.pagination.pages}
            </span>
            <button
              disabled={filters.page >= result.pagination.pages}
              onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
              className="px-3 py-1 bg-white border border-slate-200 rounded text-xs font-semibold disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

