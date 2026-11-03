import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Download,
  Database,
  Layers,
  Settings,
  XCircle,
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { api } from '../services/api';

const IMPORT_MODULES = [
  { id: 'Sales GST Data', name: '1. Sales GST Data', desc: 'Item-level sales bills, GST tax breakdown & party mapping' },
  { id: 'Sales Summary', name: '2. Sales Summary', desc: 'Invoice level grand totals, payment status & collections' },
  { id: 'Stock Summary', name: '3. Stock Summary', desc: 'Product master, SKU, brand, stock balance & selling rates' },
  { id: 'Party / Route Mapping', name: '4. Party / Route Mapping', desc: 'Retailer outlets, beat routes, credit limits & balances' },
  { id: 'Staff Route Mapping', name: '5. Staff Route Mapping (Optional)', desc: 'Field sales reps, route assignments & monthly targets' }
];

export default function DataImportExport() {
  const [selectedModule, setSelectedModule] = useState('Sales GST Data');
  const [processingMode, setProcessingMode] = useState('Insert New & Update Existing');
  const [recalculateTotals, setRecalculateTotals] = useState(true);
  const [clearBlankFields, setClearBlankFields] = useState(false);

  // File upload & preview state
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [processing, setProcessing] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);

  // Download Sample Template for selected module
  const downloadSampleTemplate = () => {
    let headers = [];
    let sampleData = [];

    if (selectedModule === 'Sales GST Data') {
      headers = ['Invoice No', 'Bill Date', 'Party Name', 'Party Code', 'City', 'Route', 'Product Name', 'SKU', 'Qty', 'Rate', 'GST Rate', 'Total'];
      sampleData = [
        ['INV-2026-0001', '2026-10-15', 'Shri Ram Kirana Store', 'CUST-001', 'Kanpur', 'Civil Lines Beat', 'Aashirvaad Atta 10kg', 'SKU-001', 20, 410, 5, 8610],
        ['INV-2026-0002', '2026-10-16', 'Gupta General Store', 'CUST-002', 'Kanpur', 'Mall Road Beat', 'Surf Excel Easy Wash 1kg', 'SKU-002', 15, 140, 18, 2478]
      ];
    } else if (selectedModule === 'Stock Summary') {
      headers = ['Name', 'SKU', 'Brand', 'Category', 'Current Stock', 'Purchase Rate', 'Selling Rate', 'MRP', 'GST Rate', 'Unit'];
      sampleData = [
        ['Fortune Sunlite Oil 1L', 'SKU-003', 'Fortune', 'Edible Oil', 120, 135, 150, 160, 5, 'PCS'],
        ['Dabur Red Toothpaste 150g', 'SKU-004', 'Dabur', 'Personal Care', 80, 85, 100, 105, 18, 'PCS']
      ];
    } else if (selectedModule === 'Party / Route Mapping') {
      headers = ['Code', 'Name', 'City', 'Route', 'Beat', 'Phone', 'Category', 'Credit Limit', 'Outstanding'];
      sampleData = [
        ['CUST-010', 'Bansal Provisions', 'Lucknow', 'Hazratganj Beat', 'Beat 1', '9876543210', 'Wholesale Supermarket', 250000, 45000],
        ['CUST-011', 'Agrawal Traders', 'Kanpur', 'Govind Nagar Beat', 'Beat 2', '9812345678', 'Retail Kirana', 150000, 22000]
      ];
    } else if (selectedModule === 'Sales Summary') {
      headers = ['Invoice No', 'Bill Date', 'Party Name', 'Party Code', 'Grand Total', 'Paid Amount', 'Pending Amount', 'Status'];
      sampleData = [
        ['INV-2026-0080', '2026-10-20', 'Shri Ram Kirana Store', 'CUST-001', 15400, 10000, 5400, 'Partial']
      ];
    } else {
      headers = ['Code', 'Name', 'Phone', 'Role', 'Assigned Route', 'Sales Target'];
      sampleData = [
        ['STF-001', 'Rahul Sharma', '9876543201', 'Sales Executive', 'Civil Lines Beat', 500000]
      ];
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${selectedModule.replace(/\s+/g, '_')}_Sample.xlsx`);
  };

  // Upload file and get Preview
  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setPreviewData(null);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('module', selectedModule);

    try {
      setUploading(true);
      const res = await api.previewImport(formData);
      if (res.success) {
        setPreviewData(res);
        setColumnMapping(res.suggestedMapping || {});
      }
    } catch (err) {
      setError(err.message || 'Failed to parse file');
    } finally {
      setUploading(false);
    }
  };

  // Execute Import
  const handleProcessImport = async () => {
    if (!previewData?.tempFilePath) return;

    try {
      setProcessing(true);
      setError(null);
      const payload = {
        tempFilePath: previewData.tempFilePath,
        module: selectedModule,
        processingMode,
        recalculateTotals,
        clearBlankFields,
        columnMapping
      };

      const res = await api.processImport(payload);
      if (res.success) {
        setImportResult(res);
        setPreviewData(null);
      }
    } catch (err) {
      setError(err.message || 'Error executing import');
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-navy-50 text-navy-700 rounded-lg">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Advanced Excel / CSV Import Engine</h1>
            <p className="text-xs text-slate-500">Bulk upload FMCG sales, stock, retailer & beat routes with column mapping & audit verification</p>
          </div>
        </div>

        <button
          onClick={downloadSampleTemplate}
          className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-navy-800 bg-navy-50 hover:bg-navy-100 rounded-lg transition-colors border border-navy-200"
        >
          <Download className="w-4 h-4" />
          <span>Download Sample Template</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 text-red-700 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Select Upload Module & Processing Configuration */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <div>
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Step 1: Choose Import Dataset Section
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {IMPORT_MODULES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSelectedModule(m.id);
                  handleReset();
                }}
                className={`p-3 text-left rounded-xl border transition-all ${
                  selectedModule === m.id
                    ? 'border-navy-700 bg-navy-50/50 shadow-sm ring-1 ring-navy-700'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className={`font-bold text-xs ${selectedModule === m.id ? 'text-navy-900' : 'text-slate-800'}`}>
                  {m.name}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {m.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Processing Mode & Rules */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Step 2: Processing Mode
            </label>
            <div className="space-y-2">
              {[
                { id: 'Insert New & Update Existing', label: 'Insert New & Update Existing (Recommended)', desc: 'Upserts records matching primary key / SKU / invoice number' },
                { id: 'Insert New Only', label: 'Insert New Only', desc: 'Skips any records that already exist in database' },
                { id: 'Update Existing Only', label: 'Update Existing Only', desc: 'Only updates existing records; ignores new ones' }
              ].map((mode) => (
                <label
                  key={mode.id}
                  className={`flex items-start p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    processingMode === mode.id ? 'bg-navy-50 border-navy-500' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="procMode"
                    checked={processingMode === mode.id}
                    onChange={() => setProcessingMode(mode.id)}
                    className="mt-0.5 text-navy-800"
                  />
                  <div className="ml-2.5 text-xs">
                    <span className="font-semibold text-slate-800 block">{mode.label}</span>
                    <span className="text-[11px] text-slate-500">{mode.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Processing Options
            </label>
            <div className="space-y-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={recalculateTotals}
                  onChange={(e) => setRecalculateTotals(e.target.checked)}
                  className="rounded text-navy-800"
                />
                <span className="font-medium text-slate-700">
                  Recalculate totals and taxes using applicable system rules
                </span>
              </label>

              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearBlankFields}
                  onChange={(e) => setClearBlankFields(e.target.checked)}
                  className="rounded text-navy-800"
                />
                <span className="font-medium text-slate-700">
                  Clear existing fields when imported columns are blank
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Step 3: Drag & Drop Upload */}
        <div className="pt-4 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 mb-2">
            Step 3: Upload Excel (.xlsx, .xls) or CSV (.csv) File
          </label>
          <div className="border-2 border-dashed border-slate-300 hover:border-navy-500 rounded-xl p-8 text-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer relative">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
              <div className="p-3 bg-white shadow-sm rounded-full text-navy-700">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div className="text-xs font-bold text-slate-800">
                {file ? file.name : 'Click to select or drag and drop spreadsheet file here'}
              </div>
              <div className="text-[11px] text-slate-400">
                Supports Excel (.xlsx, .xls) and CSV (.csv) up to 25MB
              </div>
            </div>
          </div>
        </div>
      </div>

      {uploading && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 text-center shadow-sm">
          <div className="w-8 h-8 border-4 border-navy-700 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs font-bold text-slate-700">Parsing spreadsheet and validating headers...</p>
        </div>
      )}

      {/* Step 4 to 8: File Preview & Column Mapping */}
      {previewData && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-5 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>File Analysis: {previewData.fileName}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Total Rows: <span className="font-bold text-navy-900">{previewData.totalRecords}</span> |
                Detected Columns: <span className="font-bold">{previewData.detectedColumns?.length}</span> |
                Duplicates Found in File: <span className="font-bold text-amber-600">{previewData.duplicatesInFile || 0}</span>
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancel / Reset
              </button>
              <button
                onClick={handleProcessImport}
                disabled={processing}
                className="flex items-center space-x-1.5 px-5 py-2 text-xs font-bold text-white bg-navy-800 hover:bg-navy-900 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4" />
                <span>{processing ? 'Processing Import...' : 'Confirm & Execute Import'}</span>
              </button>
            </div>
          </div>

          {/* Column Mapping Grid */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Column Mapping Engine (Detected vs Destination Field)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {previewData.targetFields?.map((tf) => (
                <div key={tf}>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 font-mono">
                    {tf}
                  </label>
                  <select
                    value={columnMapping[tf] || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, [tf]: e.target.value })}
                    className="w-full text-xs font-medium px-2 py-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-navy-600"
                  >
                    <option value="">-- Ignored / Empty --</option>
                    {previewData.detectedColumns?.map((dc) => (
                      <option key={dc} value={dc}>
                        {dc}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Data Preview Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Data Preview (First {previewData.previewRows?.length} rows)
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    {previewData.detectedColumns?.map((col) => (
                      <th key={col} className="py-2 px-3 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.previewRows?.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {previewData.detectedColumns?.map((col) => (
                        <td key={col} className="py-2 px-3 whitespace-nowrap text-slate-700">
                          {String(row[col] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Step 10: Import Summary & Error Report */}
      {importResult && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center space-x-3 text-emerald-800">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">Import Batch Completed!</h2>
              <p className="text-xs text-slate-500">
                Executed under mode: <span className="font-bold">{importResult.processingMode}</span> for dataset <span className="font-bold">{importResult.module}</span>
              </p>
            </div>
          </div>

          {/* Result Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-lg text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block">Inserted</span>
              <span className="text-2xl font-extrabold text-emerald-900">+{importResult.inserted}</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-lg text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">Updated</span>
              <span className="text-2xl font-extrabold text-blue-900">{importResult.updated}</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-lg text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">Skipped</span>
              <span className="text-2xl font-extrabold text-amber-900">{importResult.skipped}</span>
            </div>
            <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-lg text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block">Errors</span>
              <span className="text-2xl font-extrabold text-rose-900">{importResult.errors?.length || 0}</span>
            </div>
          </div>

          {/* Error log if any */}
          {importResult.errors && importResult.errors.length > 0 && (
            <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-2">
              <div className="font-bold text-rose-800">Error Report:</div>
              <ul className="list-disc pl-5 space-y-1 text-rose-700 max-h-40 overflow-y-auto">
                {importResult.errors.map((err, i) => (
                  <li key={i}>
                    Row {err.row}: {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleReset}
              className="px-5 py-2 text-xs font-bold text-white bg-navy-800 hover:bg-navy-900 rounded-lg transition-colors"
            >
              Start New Import
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

