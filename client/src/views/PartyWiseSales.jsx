import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Store, Search, Filter, Plus, ChevronRight, X, Phone,
  Calendar, FileText, ArrowDownRight, CreditCard, Clock, CheckCircle
} from 'lucide-react';

export default function PartyWiseSales() {
  const [parties, setParties] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [routeFilter, setRouteFilter] = useState('');
  const [selectedParty, setSelectedParty] = useState(null);
  const [partyDetail, setPartyDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Party Form
  const [formData, setFormData] = useState({
    name: '', code: '', city: 'Kanpur', route: 'Civil Lines Beat',
    category: 'Retail Kirana', phone: '', address: '', creditLimit: 100000, openingBalance: 0
  });

  const fetchParties = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (cityFilter) params.append('city', cityFilter);
      if (routeFilter) params.append('route', routeFilter);

      const res = await api.getParties(params.toString());
      if (res.success) {
        setParties(res.data);
        setSummary(res.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParties();
  }, [search, cityFilter, routeFilter]);

  const openPartyDetail = async (party) => {
    setSelectedParty(party);
    setDetailLoading(true);
    try {
      const res = await api.getPartyById(party._id);
      if (res.success) {
        setPartyDetail(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateParty = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createParty(formData);
      if (res.success) {
        setShowAddModal(false);
        setFormData({
          name: '', code: '', city: 'Kanpur', route: 'Civil Lines Beat',
          category: 'Retail Kirana', phone: '', address: '', creditLimit: 100000, openingBalance: 0
        });
        fetchParties();
      }
    } catch (err) {
      alert(err.message || 'Error creating party');
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Party-Wise Sales & Retailer Directory
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Outlet sales ledgers, customer credit exposures, and full transactional payment records
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brandTeal-600 hover:bg-brandTeal-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Outlets</p>
          <p className="text-xl font-black text-slate-900 mt-0.5">{parties.length}</p>
          <p className="text-[10px] text-slate-400">Stores in directory</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Gross Sales</p>
          <p className="text-xl font-black text-brandTeal-700 mt-0.5">₹ {(summary.sales || 0).toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-400">{summary.bills || 0} Total Billed Invoices</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Market Recoveries</p>
          <p className="text-xl font-black text-emerald-700 mt-0.5">₹ {(summary.paid || 0).toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-emerald-600 font-semibold">Collections Recorded</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Receivables</p>
          <p className="text-xl font-black text-rose-600 mt-0.5">₹ {(summary.outstanding || 0).toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-rose-500">Unsettled balance</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by party name, code, phone or beat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
          />
        </div>

        <select
          value={routeFilter}
          onChange={(e) => setRouteFilter(e.target.value)}
          className="w-full sm:w-52 py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
        >
          <option value="">All Beats</option>
          <option value="Civil Lines Beat">Civil Lines Beat</option>
          <option value="Kidwai Nagar Beat">Kidwai Nagar Beat</option>
          <option value="Govind Nagar Beat">Govind Nagar Beat</option>
          <option value="Swaroop Nagar Beat">Swaroop Nagar Beat</option>
          <option value="Parade Wholesale Market">Parade Wholesale Market</option>
        </select>
      </div>

      {/* Parties Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Party Code</th>
                <th className="py-3 px-4">Party / Retailer Name</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">Assigned Beat</th>
                <th className="py-3 px-4 text-center">Bills</th>
                <th className="py-3 px-4 text-right">Total Sales</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Outstanding</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">Loading parties...</td>
                </tr>
              ) : parties.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-slate-400">No parties found.</td>
                </tr>
              ) : (
                parties.map((p, idx) => (
                  <tr
                    key={idx}
                    onClick={() => openPartyDetail(p)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-navy-800">
                      {p.code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[10px] text-slate-400">{p.category} • {p.phone || 'No Phone'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {p.city}
                    </td>
                    <td className="py-3 px-4 text-slate-600 text-[11px]">
                      {p.route}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                      {p.totalBills || 0}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹ {(p.totalSales || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      ₹ {(p.paidAmount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600">
                      ₹ {(p.outstanding || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brandTeal-600 hover:text-brandTeal-700">
                        Profile <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Profile Drawer for Selected Party */}
      {selectedParty && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-fade-in">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-brandTeal-700 uppercase tracking-wider font-mono">
                  {selectedParty.code} • {selectedParty.category}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">{selectedParty.name}</h3>
                <p className="text-xs text-slate-500">{selectedParty.address || 'Address not listed'} • {selectedParty.city}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedParty(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              
              {/* Financial Snapshot */}
              <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Total Billed:</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">₹ {(selectedParty.totalSales || 0).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Total Paid:</span>
                  <p className="text-sm font-bold text-emerald-700 mt-0.5">₹ {(selectedParty.paidAmount || 0).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Current Due:</span>
                  <p className="text-sm font-bold text-rose-600 mt-0.5">₹ {(selectedParty.outstanding || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>

              {detailLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs">Loading ledger history...</div>
              ) : (
                <>
                  {/* Complete Invoices History */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-brandTeal-600" />
                      <span>Sales Invoices History ({(partyDetail?.invoices || []).length})</span>
                    </h4>

                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Invoice No</th>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                            <th className="py-2 px-3 text-right">Pending</th>
                            <th className="py-2 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(partyDetail?.invoices || []).length === 0 ? (
                            <tr><td colSpan="5" className="p-3 text-center text-slate-400">No invoices recorded</td></tr>
                          ) : (
                            partyDetail.invoices.map((inv, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="py-2 px-3 font-mono font-bold text-navy-800">{inv.invoiceNo}</td>
                                <td className="py-2 px-3 text-slate-600">{new Date(inv.billDate).toLocaleDateString('en-IN')}</td>
                                <td className="py-2 px-3 text-right font-bold text-slate-900">₹ {(inv.grandTotal || 0).toLocaleString('en-IN')}</td>
                                <td className="py-2 px-3 text-right font-bold text-rose-600">₹ {(inv.pendingAmount || 0).toLocaleString('en-IN')}</td>
                                <td className="py-2 px-3 text-center">
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                    {inv.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Complete Payment Collections History */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Payment Collections Ledger ({(partyDetail?.payments || []).length})</span>
                    </h4>

                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="py-2 px-3">Receipt No</th>
                            <th className="py-2 px-3">Date</th>
                            <th className="py-2 px-3">Mode</th>
                            <th className="py-2 px-3 text-right">Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(partyDetail?.payments || []).length === 0 ? (
                            <tr><td colSpan="4" className="p-3 text-center text-slate-400">No collections recorded yet</td></tr>
                          ) : (
                            partyDetail.payments.map((p, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="py-2 px-3 font-mono font-bold text-emerald-800">{p.receiptNo}</td>
                                <td className="py-2 px-3 text-slate-600">{new Date(p.date).toLocaleDateString('en-IN')}</td>
                                <td className="py-2 px-3 text-slate-700 font-medium">{p.mode}</td>
                                <td className="py-2 px-3 text-right font-bold text-emerald-700">₹ {(p.amount || 0).toLocaleString('en-IN')}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedParty(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold"
              >
                Close Drawer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Add New Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Add New Retailer / Party</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleCreateParty} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Party / Store Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mahadev General Store"
                  value={formData.name}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Party Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. P115"
                    value={formData.code}
                    onChange={(e) => setFormData(p => ({ ...p, code: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg uppercase font-mono focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="10-digit phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assigned Beat</label>
                  <select
                    value={formData.route}
                    onChange={(e) => setFormData(p => ({ ...p, route: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                  >
                    <option value="Civil Lines Beat">Civil Lines Beat</option>
                    <option value="Kidwai Nagar Beat">Kidwai Nagar Beat</option>
                    <option value="Govind Nagar Beat">Govind Nagar Beat</option>
                    <option value="Swaroop Nagar Beat">Swaroop Nagar Beat</option>
                    <option value="Parade Wholesale Market">Parade Wholesale Market</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Credit Limit (₹)</label>
                  <input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData(p => ({ ...p, creditLimit: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Opening Due (₹)</label>
                  <input
                    type="number"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData(p => ({ ...p, openingBalance: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded-lg text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brandTeal-600 hover:bg-brandTeal-700 text-white rounded-lg font-bold"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

