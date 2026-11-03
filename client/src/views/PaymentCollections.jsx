import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  WalletCards, Plus, Search, CheckCircle, CreditCard,
  DollarSign, Receipt, Printer, X, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function PaymentCollections() {
  const [payments, setPayments] = useState([]);
  const [parties, setParties] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState('All');

  // Form State
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [partyInvoices, setPartyInvoices] = useState([]);
  const [formData, setFormData] = useState({
    partyId: '',
    invoiceId: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    mode: 'Cash',
    referenceNo: '',
    notes: '',
    collectedBy: 'Rahul Sharma'
  });

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (modeFilter !== 'All') params.append('mode', modeFilter);

      const [pRes, prtRes] = await Promise.all([
        api.getPayments(params.toString()),
        api.getParties('limit=100')
      ]);

      if (pRes.success) {
        setPayments(pRes.data);
        setSummary(pRes.summary);
      }
      if (prtRes.success) setParties(prtRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [search, modeFilter]);

  // When party changes in modal, load that party's pending invoices
  const handlePartySelect = async (partyId) => {
    setSelectedPartyId(partyId);
    setFormData(prev => ({ ...prev, partyId, invoiceId: '' }));

    if (partyId) {
      try {
        const res = await api.getInvoices(`partyId=${partyId}&status=Pending`);
        if (res.success) {
          setPartyInvoices(res.data || []);
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      setPartyInvoices([]);
    }
  };

  const handleInvoiceSelect = (invId) => {
    const inv = partyInvoices.find(i => i._id === invId);
    setFormData(prev => ({
      ...prev,
      invoiceId: invId,
      amount: inv ? String(inv.pendingAmount) : prev.amount
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.partyId || !formData.amount) return;

    try {
      const res = await api.createPayment(formData);
      if (res.success) {
        setShowModal(false);
        setFormData({
          partyId: '',
          invoiceId: '',
          amount: '',
          date: new Date().toISOString().slice(0, 10),
          mode: 'Cash',
          referenceNo: '',
          notes: '',
          collectedBy: 'Rahul Sharma'
        });
        fetchPayments();
      }
    } catch (err) {
      alert(err.message || 'Payment recording failed');
    }
  };

  const exportExcel = () => {
    const data = payments.map(p => ({
      'Receipt No': p.receiptNo,
      'Date': new Date(p.date).toLocaleDateString('en-IN'),
      'Customer / Party': p.partyName,
      'Party Code': p.partyCode,
      'Linked Invoice': p.invoiceNo || 'Lump Sum Settlement',
      'Amount Collected (₹)': p.amount,
      'Payment Mode': p.mode,
      'Reference / UTR No': p.referenceNo || 'N/A',
      'Collected By': p.collectedBy,
      'Notes': p.notes
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Collections Ledger');
    XLSX.writeFile(wb, `Collections_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Payment Collections & Recovery Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cash, UPI & Bank settlements with automated customer ledger and invoice balance deduction
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brandTeal-600 hover:bg-brandTeal-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Collection</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Collected</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">₹ {(summary.totalCollected || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-emerald-600 font-semibold">Cash & Digital Market Recovery</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Receipts Issued</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{summary.totalReceipts || 0}</p>
          <p className="text-xs text-slate-400">Formal collection acknowledgments</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Average Ticket</p>
          <p className="text-2xl font-black text-brandTeal-700 mt-1">
            ₹ {summary.totalReceipts > 0 ? Math.round(summary.totalCollected / summary.totalReceipts).toLocaleString('en-IN') : 0}
          </p>
          <p className="text-xs text-slate-400">Per collection receipt</p>
        </div>
      </div>

      {/* Search & Filter Row */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by receipt no, customer name, or transaction UTR..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
          />
        </div>

        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="w-full sm:w-48 py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
        >
          <option value="All">All Modes</option>
          <option value="Cash">Cash</option>
          <option value="UPI">UPI</option>
          <option value="Bank Transfer">Bank Transfer</option>
          <option value="Cheque">Cheque</option>
        </select>
      </div>

      {/* Collections Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Receipt No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Linked Invoice</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Ref / UTR</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4">Collected By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="8" className="py-8 text-center text-slate-400">Loading collections...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan="8" className="py-8 text-center text-slate-400">No collections found.</td></tr>
              ) : (
                payments.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-brandTeal-800">
                      {p.receiptNo}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {new Date(p.date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.partyName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{p.partyCode}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {p.invoiceNo || <span className="text-slate-400 italic">Lump-Sum</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.mode === 'UPI' ? 'bg-sky-100 text-sky-800' :
                        p.mode === 'Cash' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {p.mode}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {p.referenceNo || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                      ₹ {(p.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {p.collectedBy}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Collection Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Record Payment Collection</h3>
                <p className="text-xs text-slate-500">Auto-updates customer ledger and invoice balance</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
              
              {/* Select Customer */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Customer / Party *</label>
                <select
                  required
                  value={formData.partyId}
                  onChange={(e) => handlePartySelect(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-semibold focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                >
                  <option value="">-- Choose Store --</option>
                  {parties.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.code}) — Due: ₹{(p.outstanding || 0).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Linked Invoice Optional */}
              {partyInvoices.length > 0 && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Link to Pending Invoice (Optional)</label>
                  <select
                    value={formData.invoiceId}
                    onChange={(e) => handleInvoiceSelect(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500 font-mono"
                  >
                    <option value="">Lump-sum account settlement</option>
                    {partyInvoices.map(inv => (
                      <option key={inv._id} value={inv._id}>
                        {inv.invoiceNo} (Due: ₹{inv.pendingAmount.toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 5000"
                    value={formData.amount}
                    onChange={(e) => setFormData(p => ({ ...p, amount: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm font-bold focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Collection Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData(p => ({ ...p, date: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Mode *</label>
                  <select
                    value={formData.mode}
                    onChange={(e) => setFormData(p => ({ ...p, mode: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg font-semibold focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                  >
                    <option value="Cash">💵 Cash</option>
                    <option value="UPI">📱 UPI (GooglePay / PhonePe)</option>
                    <option value="Bank Transfer">🏦 Bank Transfer (NEFT)</option>
                    <option value="Cheque">📑 Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ref / UTR Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 12-digit UTR"
                    value={formData.referenceNo}
                    onChange={(e) => setFormData(p => ({ ...p, referenceNo: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. Beat collection by Rahul"
                  value={formData.notes}
                  onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded-lg text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                >
                  ✓ Record & Generate Receipt
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

