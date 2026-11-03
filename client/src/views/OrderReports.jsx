import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Download,
  Filter,
  Eye,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  Printer,
  XCircle,
  Building2,
  PackageCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { invoiceAPI } from '../services/api';

export default function OrderReports() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [summary, setSummary] = useState({ totalAmount: 0, totalPaid: 0, totalPending: 0, totalQty: 0 });

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = { limit: 100 };
      if (statusFilter !== 'All') params.status = statusFilter;
      if (search) params.search = search;

      const res = await invoiceAPI.getAll(params);
      setInvoices(res.data || []);
      if (res.summary) setSummary(res.summary);
    } catch (err) {
      setError('Failed to fetch orders: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOrders();
  };

  // Export to Excel
  const exportToExcel = () => {
    if (!invoices.length) return;
    const rows = invoices.map(inv => ({
      'Invoice No': inv.invoiceNo,
      'Date': new Date(inv.billDate).toLocaleDateString(),
      'Due Date': new Date(inv.dueDate).toLocaleDateString(),
      'Party Code': inv.partyCode,
      'Customer Name': inv.partyName,
      'City': inv.city,
      'Route / Beat': inv.route,
      'Total Qty': inv.totalQuantity,
      'Grand Total': inv.grandTotal,
      'Paid Amount': inv.paidAmount,
      'Pending Balance': inv.pendingAmount,
      'Status': inv.status,
      'Sales Executive': inv.salesPerson || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Orders');
    XLSX.writeFile(wb, `Sales_Orders_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to PDF
  const exportToPDF = () => {
    if (!invoices.length) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Sales Order & Billing Report', 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated on: ${new Date().toLocaleString()} | DS Enterprises`, 14, 22);

    const headers = [['Inv #', 'Date', 'Customer', 'Route', 'Qty', 'Total (₹)', 'Paid (₹)', 'Pending (₹)', 'Status']];
    const data = invoices.map(inv => [
      inv.invoiceNo,
      new Date(inv.billDate).toLocaleDateString(),
      inv.partyName,
      inv.route,
      inv.totalQuantity,
      `₹${inv.grandTotal?.toLocaleString()}`,
      `₹${inv.paidAmount?.toLocaleString()}`,
      `₹${inv.pendingAmount?.toLocaleString()}`,
      inv.status
    ]);

    doc.autoTable({
      head: headers,
      body: data,
      startY: 28,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] }
    });

    doc.save(`Sales_Orders_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-navy-50 text-navy-700 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Order Reports & Lifecycle</h1>
            <p className="text-xs text-slate-500">Track booked orders, fulfillment status, line quantities and dispatch details</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={exportToExcel}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
          >
            <Download className="w-4 h-4" />
            <span>Excel Export</span>
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
          >
            <Download className="w-4 h-4" />
            <span>PDF Export</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Total Bookings</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-navy-900">{invoices.length} Orders</span>
            <span className="text-xs font-bold text-slate-600 font-mono">{summary.totalQty} Units</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Total Value</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-slate-900">₹{summary.totalAmount?.toLocaleString()}</span>
            <span className="text-xs text-teal-600 font-semibold">Gross</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Settled Amount</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-emerald-700">₹{summary.totalPaid?.toLocaleString()}</span>
            <span className="text-xs text-emerald-600 font-semibold">Realized</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Pending Receivables</span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-amber-700">₹{summary.totalPending?.toLocaleString()}</span>
            <span className="text-xs text-amber-600 font-semibold">Balance</span>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Invoice #, Customer Name, Route or Party Code..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
        </form>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
          {['All', 'Pending', 'Partial', 'Paid'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-4 border-navy-700 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading orders list...
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No orders matching the criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Bill Date</th>
                  <th className="py-3 px-4">Customer / Outlet</th>
                  <th className="py-3 px-4">Route</th>
                  <th className="py-3 px-4 text-center">Items (Qty)</th>
                  <th className="py-3 px-4 text-right">Total (₹)</th>
                  <th className="py-3 px-4 text-right">Paid (₹)</th>
                  <th className="py-3 px-4 text-right">Balance (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-navy-800">
                      {inv.invoiceNo}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(inv.billDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{inv.partyName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{inv.partyCode} • {inv.city}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {inv.route || 'General Beat'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-slate-700">{inv.items?.length || 0}</span>
                      <span className="text-[11px] text-slate-400 block">({inv.totalQuantity} units)</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{inv.grandTotal?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-700">
                      ₹{inv.paidAmount?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-700">
                      ₹{inv.pendingAmount?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                          inv.status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'Partial'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedInvoice(inv)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-navy-700 bg-navy-50 hover:bg-navy-100 rounded transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 animate-fadeIn my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-navy-50 text-navy-800 rounded-lg">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Order Details: {selectedInvoice.invoiceNo}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Booked on {new Date(selectedInvoice.billDate).toLocaleString()} by {selectedInvoice.salesPerson || 'Sales Team'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Outlet Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-b border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Customer:</span>
                <span className="font-bold text-slate-800">{selectedInvoice.partyName}</span>
                <span className="text-[11px] text-slate-500 font-mono block">Code: {selectedInvoice.partyCode}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Route / Territory:</span>
                <span className="font-semibold text-slate-700">{selectedInvoice.route}</span>
                <span className="text-[11px] text-slate-500 block">City: {selectedInvoice.city}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Due Date:</span>
                <span className="font-semibold text-slate-700">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Status:</span>
                <span className="font-bold text-navy-800">{selectedInvoice.status}</span>
              </div>
            </div>

            {/* Line Items */}
            <div className="py-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Order Items ({selectedInvoice.items?.length || 0})
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Item / Brand</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Rate</th>
                      <th className="py-2 px-3 text-center">GST</th>
                      <th className="py-2 px-3 text-right">Taxable</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.items?.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3">
                          <span className="font-semibold text-slate-800">{it.productName}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">{it.brand} • {it.sku}</span>
                        </td>
                        <td className="py-2 px-3 text-center font-bold">{it.qty} {it.unit || 'PCS'}</td>
                        <td className="py-2 px-3 text-right font-medium">₹{it.rate}</td>
                        <td className="py-2 px-3 text-center text-slate-500">{it.gstRate}%</td>
                        <td className="py-2 px-3 text-right font-medium">₹{it.amount?.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">₹{it.total?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 p-4 rounded-xl border border-slate-200 gap-4 text-xs">
              <div className="text-slate-500">
                <span className="font-semibold text-slate-700">Notes / Remarks: </span>
                {selectedInvoice.notes || 'Standard dispatch order'}
              </div>
              <div className="w-full md:w-64 space-y-1.5">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-semibold">₹{selectedInvoice.subtotal?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>GST Amount:</span>
                  <span className="font-semibold">₹{selectedInvoice.taxAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-extrabold text-slate-900 text-sm pt-1 border-t border-slate-200">
                  <span>Grand Total:</span>
                  <span className="text-navy-900">₹{selectedInvoice.grandTotal?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Paid:</span>
                  <span>₹{selectedInvoice.paidAmount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-amber-700 font-bold">
                  <span>Pending Due:</span>
                  <span>₹{selectedInvoice.pendingAmount?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

