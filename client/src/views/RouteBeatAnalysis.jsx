import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  MapPin, Users, CheckCircle, XCircle, Clock, Calendar,
  TrendingUp, BarChart2, UserCheck, MessageSquare, AlertTriangle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function RouteBeatAnalysis() {
  const [routes, setRoutes] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [visits, setVisits] = useState([]);
  const [visitSummary, setVisitSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState('All');
  const [selectedStaff, setSelectedStaff] = useState({});

  // Visit status logging modal
  const [loggingVisit, setLoggingVisit] = useState(null);
  const [visitForm, setVisitForm] = useState({
    status: 'Visited',
    outcome: 'Order Placed',
    remarks: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rRes, sRes, vRes] = await Promise.all([
        api.getRoutes(),
        api.getStaff(),
        api.getVisits(selectedRoute !== 'All' ? `route=${selectedRoute}` : '')
      ]);

      if (rRes.success) setRoutes(rRes.data);
      if (sRes.success) setStaffList(sRes.data);
      if (vRes.success) {
        setVisits(vRes.data);
        setVisitSummary(vRes.summary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedRoute]);

  const handleAssignStaff = async (routeId, staffName) => {
    try {
      const res = await api.assignStaff(routeId, staffName);
      if (res.success) {
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRecordVisitSubmit = async (e) => {
    e.preventDefault();
    if (!loggingVisit) return;

    try {
      const res = await api.recordVisit({
        partyId: loggingVisit.party,
        status: visitForm.status,
        outcome: visitForm.outcome,
        remarks: visitForm.remarks
      });

      if (res.success) {
        setLoggingVisit(null);
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Route & Beat Territory Analysis
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Geographic field beat performance, sales representative assignments, and daily retailer visit logs
          </p>
        </div>

        <select
          value={selectedRoute}
          onChange={(e) => setSelectedRoute(e.target.value)}
          className="py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
        >
          <option value="All">All Operating Beats</option>
          {routes.map(r => (
            <option key={r.id} value={r.name}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* KPI Cards: Daily Visit Progress */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned Stores</p>
          <p className="text-xl font-black text-slate-900 mt-1">{visitSummary.total || 0}</p>
          <p className="text-xs text-slate-400">Scheduled for today</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-emerald-600 uppercase">Stores Visited</p>
          <p className="text-xl font-black text-emerald-700 mt-1">{visitSummary.visitedCount || 0}</p>
          <p className="text-xs text-emerald-600 font-semibold">{visitSummary.coveragePercent || 0}% Coverage</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-rose-500 uppercase">Not Visited / Closed</p>
          <p className="text-xl font-black text-rose-600 mt-1">{visitSummary.notVisitedCount || 0}</p>
          <p className="text-xs text-slate-400">Stores skipped/closed</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-bold text-amber-500 uppercase">Pending Visits</p>
          <p className="text-xl font-black text-amber-600 mt-1">{visitSummary.pendingCount || 0}</p>
          <p className="text-xs text-slate-400">Awaiting field check-in</p>
        </div>
      </div>

      {/* Route Performance Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          Route-Wise Sales Turnover Comparison
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Gross billing volume vs market outstanding dues across sales territories
        </p>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={routes} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${v/1000}k`} />
              <Tooltip
                formatter={(val) => [`₹ ${Number(val).toLocaleString('en-IN')}`]}
                contentStyle={{ backgroundColor: '#0f172a', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
              />
              <Bar dataKey="totalSales" name="Sales (₹)" fill="#0d9488" radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalOutstanding" name="Outstanding Due (₹)" fill="#e11d48" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Routes Directory & Representative Assignment */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Field Beats & Sales Representative Assignments
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Route Name / Code</th>
                <th className="py-3 px-4">Operating City</th>
                <th className="py-3 px-4 text-center">Stores</th>
                <th className="py-3 px-4 text-right">Turnover (₹)</th>
                <th className="py-3 px-4 text-right">Outstanding (₹)</th>
                <th className="py-3 px-4">Assigned Sales Officer</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {routes.map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{r.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{r.code}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {r.city}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-slate-700">
                    {r.partyCount || 0}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-brandTeal-700">
                    ₹ {(r.totalSales || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-rose-600">
                    ₹ {(r.totalOutstanding || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                      <UserCheck className="w-3.5 h-3.5 text-brandTeal-600" />
                      {r.assignedStaffName || 'Unassigned'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <select
                      value={r.assignedStaffName || ''}
                      onChange={(e) => handleAssignStaff(r.id, e.target.value)}
                      className="py-1 px-2 border border-slate-200 rounded text-[11px] font-medium bg-white focus:outline-none"
                    >
                      <option value="">Reassign SO</option>
                      {staffList.map(s => (
                        <option key={s.id || s._id} value={s.name}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Visit Tracking Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Today's Field Store Visit Log
            </h3>
            <p className="text-xs text-slate-400">
              Interactive Visited / Not Visited action toggle with reason logging
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Retail Outlet</th>
                <th className="py-3 px-4">Beat</th>
                <th className="py-3 px-4">Representative</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Visit Outcome</th>
                <th className="py-3 px-4">Remarks</th>
                <th className="py-3 px-4 text-center">Log Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visits.map((v, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {v.partyName}
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-[11px]">
                    {v.route}
                  </td>
                  <td className="py-3 px-4 text-slate-700">
                    {v.staffName}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      v.status === 'Visited' ? 'bg-emerald-100 text-emerald-800' :
                      v.status === 'Not Visited' ? 'bg-rose-100 text-rose-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {v.status === 'Visited' ? <CheckCircle className="w-3 h-3 text-emerald-600" /> :
                       v.status === 'Not Visited' ? <XCircle className="w-3 h-3 text-rose-600" /> :
                       <Clock className="w-3 h-3 text-slate-500" />}
                      {v.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {v.outcome || '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-500 italic max-w-xs truncate">
                    {v.remarks || 'No remarks recorded'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setLoggingVisit(v);
                        setVisitForm({
                          status: v.status === 'Visited' ? 'Visited' : 'Not Visited',
                          outcome: v.outcome || 'Order Placed',
                          remarks: v.remarks || ''
                        });
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-[11px] transition-colors"
                    >
                      Update Status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Visit Status Modal */}
      {loggingVisit && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Record Store Visit Entry</h3>
                <p className="text-xs text-slate-500">{loggingVisit.partyName} ({loggingVisit.route})</p>
              </div>
              <button onClick={() => setLoggingVisit(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleRecordVisitSubmit} className="p-4 space-y-4 text-xs">
              
              {/* Choose Status: Visited / Not Visited Toggle */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[10px]">Choose Visit Status *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVisitForm(p => ({ ...p, status: 'Visited', outcome: 'Order Placed' }))}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      visitForm.status === 'Visited'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>✓ Visited (विज़िट की)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisitForm(p => ({ ...p, status: 'Not Visited', outcome: 'Store Closed' }))}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      visitForm.status === 'Not Visited'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>✕ Not Visited (विज़िट नहीं)</span>
                  </button>
                </div>
              </div>

              {/* Outcome Reason */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Outcome / Reason *</label>
                <select
                  value={visitForm.outcome}
                  onChange={(e) => setVisitForm(p => ({ ...p, outcome: e.target.value }))}
                  className="w-full p-2 border border-slate-200 rounded-lg font-medium text-xs focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                >
                  {visitForm.status === 'Visited' ? (
                    <>
                      <option value="Order Placed">📦 Order Placed (ऑर्डर लिया)</option>
                      <option value="Payment Collected">💵 Payment Collected (पेमेंट कलेक्ट किया)</option>
                      <option value="Stock Sufficient">✅ Stock Sufficient (स्टॉक पर्याप्त है)</option>
                      <option value="Follow Up Required">⏱️ Follow Up Required (बाद में आना)</option>
                    </>
                  ) : (
                    <>
                      <option value="Store Closed">🚪 Store Closed (दुकान बंद थी)</option>
                      <option value="Owner Not Available">👤 Owner Not Available (मालिक नहीं मिला)</option>
                      <option value="Payment Deferred">⏳ Payment Deferred (पेमेंट आगे बढ़ाई)</option>
                    </>
                  )}
                </select>
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks / Note</label>
                <textarea
                  rows="3"
                  placeholder="Additional field notes..."
                  value={visitForm.remarks}
                  onChange={(e) => setVisitForm(p => ({ ...p, remarks: e.target.value }))}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLoggingVisit(null)}
                  className="px-3 py-1.5 bg-slate-100 rounded-lg text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brandTeal-600 hover:bg-brandTeal-700 text-white rounded-lg font-bold"
                >
                  Save Visit Status
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

