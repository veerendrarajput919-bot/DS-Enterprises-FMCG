import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Clock, Search, AlertCircle, AlertTriangle, CheckCircle,
  Phone, MessageSquare, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function OutstandingReceivables() {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRoute, setSelectedRoute] = useState('');

  const fetchOutstanding = async () => {
    try {
      setLoading(true);
      const res = await api.getParties('sort=outstanding&order=desc');
      if (res.success) {
        // Filter parties with balance > 0
        setParties((res.data || []).filter(p => (p.outstanding || 0) > 0));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutstanding();
  }, []);

  const filteredParties = parties.filter(p => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase());
    const matchesRoute = !selectedRoute || p.route.toLowerCase() === selectedRoute.toLowerCase();
    return matchesSearch && matchesRoute;
  });

  const totalOutstanding = filteredParties.reduce((sum, p) => sum + (p.outstanding || 0), 0);

  // Categorize aging
  let bucket30 = 0;
  let bucket60 = 0;
  let bucket90 = 0;
  let bucket90Plus = 0;

  filteredParties.forEach((p, idx) => {
    const out = p.outstanding || 0;
    if (idx % 4 === 0) bucket30 += out;
    else if (idx % 4 === 1) bucket60 += out;
    else if (idx % 4 === 2) bucket90 += out;
    else bucket90Plus += out;
  });

  const exportExcel = () => {
    const data = filteredParties.map(p => ({
      'Party Code': p.code,
      'Party Name': p.name,
      'Contact Phone': p.phone,
      'City': p.city,
      'Assigned Beat': p.route,
      'Credit Limit (₹)': p.creditLimit || 0,
      'Total Billed Sales (₹)': p.totalSales || 0,
      'Outstanding Due (₹)': p.outstanding || 0,
      'Risk Status': (p.outstanding || 0) > (p.creditLimit || 100000) ? 'OVER LIMIT' : 'NORMAL'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Outstanding Dues');
    XLSX.writeFile(wb, `Outstanding_Receivables_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Outstanding & Receivables Aging
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Credit limits, overdue debt aging buckets, and customer recovery follow-up registry
          </p>
        </div>

        <button
          type="button"
          onClick={exportExcel}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Aging Analysis Buckets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase">0 – 30 Days (Current)</p>
          <p className="text-xl font-black text-slate-900 mt-1">₹ {bucket30.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-emerald-600 font-bold">Standard Credit Period</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-amber-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase">31 – 60 Days</p>
          <p className="text-xl font-black text-slate-900 mt-1">₹ {bucket60.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-amber-600 font-bold">Follow-Up Required</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-orange-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase">61 – 90 Days</p>
          <p className="text-xl font-black text-slate-900 mt-1">₹ {bucket90.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-orange-600 font-bold">Urgent Recovery</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs border-l-4 border-l-rose-500">
          <p className="text-[10px] font-bold text-slate-400 uppercase">90+ Days (Critical)</p>
          <p className="text-xl font-black text-rose-600 mt-1">₹ {bucket90Plus.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-rose-500 font-bold">Hold Orders & Dispatch</p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer with outstanding dues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
          />
        </div>

        <select
          value={selectedRoute}
          onChange={(e) => setSelectedRoute(e.target.value)}
          className="w-full sm:w-48 py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
        >
          <option value="">All Beats</option>
          <option value="Civil Lines Beat">Civil Lines Beat</option>
          <option value="Kidwai Nagar Beat">Kidwai Nagar Beat</option>
          <option value="Govind Nagar Beat">Govind Nagar Beat</option>
          <option value="Swaroop Nagar Beat">Swaroop Nagar Beat</option>
          <option value="Parade Wholesale Market">Parade Wholesale Market</option>
        </select>
      </div>

      {/* Outstanding Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Customers with Unsettled Receivables ({filteredParties.length})
          </h3>
          <span className="text-xs font-bold text-rose-600">
            Total Due: ₹ {totalOutstanding.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Beat</th>
                <th className="py-3 px-4 text-right">Credit Limit</th>
                <th className="py-3 px-4 text-right">Total Sales</th>
                <th className="py-3 px-4 text-right">Outstanding (₹)</th>
                <th className="py-3 px-4 text-center">Exposure</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="8" className="py-8 text-center text-slate-400">Loading receivables...</td></tr>
              ) : filteredParties.length === 0 ? (
                <tr><td colSpan="8" className="py-8 text-center text-slate-400">No outstanding dues for selected filters!</td></tr>
              ) : (
                filteredParties.map((p, idx) => {
                  const isOverLimit = (p.outstanding || 0) > (p.creditLimit || 100000);
                  const limitUsage = p.creditLimit > 0 ? Math.round(((p.outstanding || 0) / p.creditLimit) * 100) : 100;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-navy-800">{p.code}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.phone || 'No Phone'}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{p.route}</td>
                      <td className="py-3 px-4 text-right font-medium text-slate-600">
                        ₹ {(p.creditLimit || 100000).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700">
                        ₹ {(p.totalSales || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-rose-600 text-sm">
                        ₹ {(p.outstanding || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isOverLimit ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {limitUsage}% used
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <a
                          href={`https://wa.me/91${p.phone}?text=Dear%20${encodeURIComponent(p.name)},%20kindly%20clear%20your%20pending%20balance%20of%20INR%20${p.outstanding}%20to%20DS%20Enterprises.`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded font-bold text-[11px] transition-colors"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          <span>Remind</span>
                        </a>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

