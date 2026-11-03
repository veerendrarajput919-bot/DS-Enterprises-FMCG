import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Receipt, Search, Filter, AlertTriangle, CheckCircle,
  Clock, DollarSign, Eye, Printer, X
} from 'lucide-react';

export default function BillManagement() {
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [payModalInvoice, setPayModalInvoice] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('Cash');
  const [payRef, setPayRef] = useState('');

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'All') params.append('status', statusFilter);
      if (overdueOnly) params.append('overdueOnly', 'true');

      const res = await api.getInvoices(params.toString());
      if (res.success) {
        setInvoices(res.data);
        setSummary(res.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [search, statusFilter, overdueOnly]);

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!payModalInvoice || !payAmount) return;

    try {
      const res = await api.payInvoice(payModalInvoice._id, {
        amount: Number(payAmount),
        mode: payMode,
        referenceNo: payRef
      });

      if (res.success) {
        setPayModalInvoice(null);
        setPayAmount('');
        setPayRef('');
        fetchInvoices();
      }
    } catch (err) {
      alert(err.message || 'Payment recording failed');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Bill & Invoice Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Full billing lifecycle, partial payment settlements, due dates, and overdue debt recovery
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
              overdueOnly
                ? 'bg-rose-600 text-white shadow-rose-200'
                : 'bg-white border border-rose-300 text-rose-700 hover:bg-rose-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{overdueOnly ? '✓ Viewing Overdue Only' : 'Filter Overdue Invoices'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Invoices</p>
          <p className="text-xl font-black text-slate-900 mt-0.5">{invoices.length}</p>
          <p className="text-[10px] text-slate-400">{summary.totalQty || 0} Total Units</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Gross Billed</p>
          <p className="text-xl font-black text-brandTeal-700 mt-0.5">₹ {(summary.totalAmount || 0).toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-400">Total invoice value</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Paid / Cleared</p>
          <p className="text-xl font-black text-emerald-700 mt-0.5">₹ {(summary.totalPaid || 0).toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-emerald-600 font-semibold">Settled</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Pending Due</p>
          <p className="text-xl font-black text-rose-600 mt-0.5">₹ {(summary.totalPending || 0).toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-rose-500 font-medium">To be collected</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by invoice number, customer name or party code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-48 py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending (Unpaid)</option>
          <option value="Partial">Partial (Partly Paid)</option>
          <option value="Paid">Paid (Fully Cleared)</option>
          <option value="Overdue">Overdue Bills</option>
        </select>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Bill Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4 text-right">Invoice (₹)</th>
                <th className="py-3 px-4 text-right">Paid (₹)</th>
                <th className="py-3 px-4 text-right">Pending (₹)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="9" className="py-8 text-center text-slate-400">Loading bills...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan="9" className="py-8 text-center text-slate-400">No invoices found.</td></tr>
              ) : (
                invoices.map((inv, idx) => {
                  const isOver = inv.status !== 'Paid' && new Date(inv.dueDate) < new Date();
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-navy-800">
                        {inv.invoiceNo}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(inv.billDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${isOver ? 'text-rose-600' : 'text-slate-600'}`}>
                          {new Date(inv.dueDate).toLocaleDateString('en-IN')}
                          {isOver && <span className="ml-1 text-[9px] font-bold px-1 bg-rose-100 text-rose-700 rounded">DUE</span>}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{inv.partyName}</div>
                        <div className="text-[10px] text-slate-400">{inv.partyCode} • {inv.city}</div>
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
                          isOver ? 'bg-rose-100 text-rose-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {isOver ? 'Overdue' : inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {inv.pendingAmount > 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPayModalInvoice(inv);
                              setPayAmount(String(inv.pendingAmount));
                            }}
                            className="px-2.5 py-1 bg-brandTeal-50 hover:bg-brandTeal-100 text-brandTeal-700 rounded-md font-bold text-[11px] border border-brandTeal-200 transition-colors"
                          >
                            Pay Bill
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-emerald-600">✓ Settled</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pay Invoice Modal */}
      {payModalInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-fade-in">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Record Bill Settlement</h3>
                <p className="text-xs text-slate-500">{payModalInvoice.invoiceNo} • {payModalInvoice.partyName}</p>
              </div>
              <button onClick={() => setPayModalInvoice(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handlePaySubmit} className="p-4 space-y-3 text-xs">
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
                <span className="text-[11px] text-amber-800 font-medium">Pending Due Amount:</span>
                <p className="text-base font-black text-amber-900">₹ {payModalInvoice.pendingAmount.toLocaleString('en-IN')}</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  required
                  max={payModalInvoice.pendingAmount}
                  min="1"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Mode *</label>
                <select
                  value={payMode}
                  onChange={(e) => setPayMode(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-semibold focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                >
                  <option value="Cash">💵 Cash</option>
                  <option value="UPI">📱 UPI (GooglePay / PhonePe / Paytm)</option>
                  <option value="Bank Transfer">🏦 Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="Cheque">📑 Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Transaction Ref / Cheque No</label>
                <input
                  type="text"
                  placeholder="e.g. UTR / Ref No"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayModalInvoice(null)}
                  className="px-3 py-1.5 bg-slate-100 rounded-lg text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Confirm & Clear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

