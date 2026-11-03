import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  FileSpreadsheet, Download, FileText, Calendar, Filter,
  CheckCircle, ArrowDownToLine, RefreshCw, Layers
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function SalesReports() {
  const [reportType, setReportType] = useState('daily-sales');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const reportTypes = [
    { id: 'daily-sales', label: '1. Daily Sales Report', desc: 'Billed invoices and daily revenue summary' },
    { id: 'party-wise', label: '2. Party-wise Sales Report', desc: 'Customer purchase history & outstanding balance' },
    { id: 'brand-wise', label: '3. Brand-wise Sales Report', desc: 'FMCG brand volume, turnover, and margins' },
    { id: 'stock', label: '4. Stock & Valuation Report', desc: 'Inventory quantities, purchase valuation & alerts' },
    { id: 'outstanding', label: '5. Outstanding Receivables Report', desc: 'Pending market dues & customer credit aging' },
    { id: 'collections', label: '6. Payment Collection Report', desc: 'Cash, UPI & Bank recovery receipts ledger' },
    { id: 'route-performance', label: '7. Route Performance Report', desc: 'Territory turnover and recovery efficiency' }
  ];

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.getReportData(reportType);
      if (res.success) {
        setReportData(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const exportExcel = () => {
    if (!reportData?.data || reportData.data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(reportData.data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `${reportType}_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPDF = () => {
    if (!reportData?.data || reportData.data.length === 0) return;
    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text(`DS Enterprises — ${reportData.title}`, 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 22);

    const headers = Object.keys(reportData.data[0] || {});
    const rows = reportData.data.map(item => headers.map(h => item[h]));

    doc.autoTable({
      head: [headers.map(h => h.toUpperCase())],
      body: rows,
      startY: 28,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 }
    });

    doc.save(`${reportType}_report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const headers = reportData?.data?.length > 0 ? Object.keys(reportData.data[0]) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Comprehensive Reports & Export Hub
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Downloadable executive audit statements, party ledgers, stock registers, and territory performances
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Excel</span>
          </button>
          
          <button
            type="button"
            onClick={exportPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-navy-800 hover:bg-navy-900 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Report Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {reportTypes.map(rt => {
          const isSelected = reportType === rt.id;
          return (
            <button
              key={rt.id}
              type="button"
              onClick={() => setReportType(rt.id)}
              className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-brandTeal-50/70 border-brandTeal-600 ring-2 ring-brandTeal-600/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div>
                <p className={`text-xs font-bold ${isSelected ? 'text-brandTeal-900' : 'text-slate-800'}`}>
                  {rt.label}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {rt.desc}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-semibold">
                <span className={isSelected ? 'text-brandTeal-700' : 'text-slate-400'}>
                  {isSelected ? '✓ Active Report' : 'Select'}
                </span>
                <span className="text-slate-300">XLSX • PDF</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Report Preview Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {reportData?.title || 'Report Statement'}
            </h3>
            <p className="text-xs text-slate-400">
              Total Records: {reportData?.totalRecords || 0}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchReport}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 sticky top-0 z-10">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="py-3 px-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={headers.length || 5} className="py-12 text-center text-slate-400">
                    Generating report statements...
                  </td>
                </tr>
              ) : (reportData?.data || []).length === 0 ? (
                <tr>
                  <td colSpan={headers.length || 5} className="py-12 text-center text-slate-400">
                    No data records found for this report.
                  </td>
                </tr>
              ) : (
                reportData.data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    {headers.map((h, i) => (
                      <td key={i} className="py-2.5 px-4 whitespace-nowrap text-slate-700 font-medium">
                        {typeof row[h] === 'number' && h.toLowerCase().includes('amount') || h.toLowerCase().includes('total') || h.toLowerCase().includes('sales') || h.toLowerCase().includes('valuation')
                          ? `₹ ${row[h].toLocaleString('en-IN')}`
                          : String(row[h] !== undefined && row[h] !== null ? row[h] : '—')}
                      </td>
                    ))}
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

