import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Trash2,
  Search,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Building,
  Calendar
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { purchaseAPI, productAPI } from '../services/api';

export default function PurchaseManagement() {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // New purchase form state
  const [formData, setFormData] = useState({
    supplierName: '',
    supplierInvoiceNo: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: '',
    items: [
      {
        productId: '',
        productName: '',
        sku: '',
        brand: '',
        qty: 1,
        rate: 0,
        gstRate: 18,
        amount: 0,
        gstAmount: 0,
        total: 0
      }
    ]
  });

  useEffect(() => {
    loadPurchases();
    loadProducts();
  }, []);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await purchaseAPI.getAll({ search });
      setPurchases(res.data || []);
    } catch (err) {
      setError('Failed to load purchases: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await productAPI.getAll({ limit: 200 });
      setProducts(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Line item handlers
  const handleItemChange = (index, field, value) => {
    const updated = [...formData.items];
    const row = { ...updated[index] };

    if (field === 'productId') {
      const prod = products.find(p => p._id === value);
      if (prod) {
        row.productId = prod._id;
        row.productName = prod.name;
        row.sku = prod.sku;
        row.brand = prod.brand;
        row.rate = prod.purchaseRate || 0;
        row.gstRate = prod.gstRate !== undefined ? prod.gstRate : 18;
      } else {
        row.productId = '';
        row.productName = '';
        row.rate = 0;
      }
    } else {
      row[field] = value;
    }

    const qty = Math.max(1, Number(row.qty) || 1);
    const rate = Math.max(0, Number(row.rate) || 0);
    const gstRate = Math.max(0, Number(row.gstRate) || 0);

    row.qty = qty;
    row.rate = rate;
    row.gstRate = gstRate;
    row.amount = Math.round(qty * rate);
    row.gstAmount = Math.round((row.amount * gstRate) / 100);
    row.total = row.amount + row.gstAmount;

    updated[index] = row;
    setFormData({ ...formData, items: updated });
  };

  const addItemRow = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          productId: '',
          productName: '',
          sku: '',
          brand: '',
          qty: 1,
          rate: 0,
          gstRate: 18,
          amount: 0,
          gstAmount: 0,
          total: 0
        }
      ]
    });
  };

  const removeItemRow = (index) => {
    if (formData.items.length <= 1) return;
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const calculatedSubtotal = formData.items.reduce((s, it) => s + (it.amount || 0), 0);
  const calculatedTax = formData.items.reduce((s, it) => s + (it.gstAmount || 0), 0);
  const calculatedGrandTotal = calculatedSubtotal + calculatedTax;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validItems = formData.items.filter(it => it.productId);
    if (!validItems.length) {
      alert('Please add at least 1 valid product');
      return;
    }

    try {
      setSubmitting(true);
      await purchaseAPI.create({
        supplierName: formData.supplierName,
        supplierInvoiceNo: formData.supplierInvoiceNo,
        purchaseDate: formData.purchaseDate,
        notes: formData.notes,
        items: validItems
      });

      setShowAddModal(false);
      setFormData({
        supplierName: '',
        supplierInvoiceNo: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        notes: '',
        items: [
          {
            productId: '',
            productName: '',
            sku: '',
            brand: '',
            qty: 1,
            rate: 0,
            gstRate: 18,
            amount: 0,
            gstAmount: 0,
            total: 0
          }
        ]
      });
      loadPurchases();
    } catch (err) {
      alert('Error creating purchase bill: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const exportToExcel = () => {
    if (!purchases.length) return;
    const rows = purchases.map(p => ({
      'Supplier Invoice #': p.supplierInvoiceNo,
      'Supplier Name': p.supplierName,
      'Purchase Date': new Date(p.purchaseDate).toLocaleDateString(),
      'Total Lines': p.items?.length || 0,
      'Total Quantity': p.totalQuantity || 0,
      'Subtotal (Taxable)': p.subtotal,
      'GST (Tax)': p.taxAmount,
      'Grand Total': p.grandTotal,
      'Status': p.status || 'Received'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Purchases');
    XLSX.writeFile(wb, `Purchases_Register_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-navy-50 text-navy-700 rounded-lg">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Purchase Inward & Supplier Bills</h1>
            <p className="text-xs text-slate-500">Record distributor purchases from FMCG manufacturers & update warehouse stock</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-white bg-navy-700 hover:bg-navy-800 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Record Inward Bill</span>
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
          >
            <Download className="w-4 h-4" />
            <span>Export Register</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadPurchases()}
            placeholder="Search by supplier name, invoice #, or brand..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
          />
        </div>
      </div>

      {/* Purchases List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-4 border-navy-700 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading purchase records...
          </div>
        ) : purchases.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No purchase bills recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Supplier Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Manufacturer / Vendor</th>
                  <th className="py-3 px-4 text-center">Items (Qty)</th>
                  <th className="py-3 px-4 text-right">Taxable (₹)</th>
                  <th className="py-3 px-4 text-right">GST (₹)</th>
                  <th className="py-3 px-4 text-right">Total (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {purchases.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-navy-800">
                      {p.supplierInvoiceNo}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(p.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {p.supplierName}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-slate-700">{p.items?.length || 0}</span>
                      <span className="text-[11px] text-slate-400 block">({p.totalQuantity} units)</span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">
                      ₹{p.subtotal?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-teal-700 font-medium">
                      ₹{p.taxAmount?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{p.grandTotal?.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        {p.status || 'Received'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedPurchase(p)}
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

      {/* Add Purchase Inward Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-3xl w-full p-6 shadow-xl border border-slate-200 animate-fadeIn my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Truck className="w-5 h-5 text-navy-700" />
                <span>Record New Purchase Inward Bill</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Supplier / Vendor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ITC Limited, HUL Depo"
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-navy-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Supplier Invoice / Bill # <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ITC/2026/0981"
                    value={formData.supplierInvoiceNo}
                    onChange={(e) => setFormData({ ...formData, supplierInvoiceNo: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-navy-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Inward / Invoice Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.purchaseDate}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-navy-600"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 p-3 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Inward Line Items
                  </span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="flex items-center space-x-1 px-2.5 py-1 text-xs font-bold text-white bg-navy-700 hover:bg-navy-800 rounded transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Product / SKU</th>
                        <th className="py-2 px-3 w-20 text-center">Qty</th>
                        <th className="py-2 px-3 w-24 text-right">Cost Rate</th>
                        <th className="py-2 px-3 w-16 text-center">GST %</th>
                        <th className="py-2 px-3 w-24 text-right">Total</th>
                        <th className="py-2 px-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {formData.items.map((row, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3">
                            <select
                              value={row.productId}
                              onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                              required
                              className="w-full text-xs font-semibold px-2 py-1 border border-slate-300 rounded"
                            >
                              <option value="">-- Select Product --</option>
                              {products.map(p => (
                                <option key={p._id} value={p._id}>
                                  {p.name} [{p.sku}] - Current Stock: {p.currentStock}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={row.qty}
                              onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                              required
                              className="w-16 text-center px-1.5 py-1 border border-slate-300 rounded font-bold"
                            />
                          </td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              value={row.rate}
                              onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                              required
                              className="w-20 text-right px-1.5 py-1 border border-slate-300 rounded font-medium"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              value={row.gstRate}
                              onChange={(e) => handleItemChange(idx, 'gstRate', e.target.value)}
                              className="w-12 text-center px-1 py-1 border border-slate-300 rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-800">
                            ₹{row.total?.toLocaleString()}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {formData.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeItemRow(idx)}
                                className="text-slate-400 hover:text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="bg-slate-50 p-3 border-t border-slate-200 flex justify-between items-center text-xs">
                  <div className="text-slate-500">
                    Auto-posts to stock ledger and recalculates unit purchase cost.
                  </div>
                  <div className="space-x-4">
                    <span className="text-slate-600 font-medium">Subtotal: ₹{calculatedSubtotal.toLocaleString()}</span>
                    <span className="text-slate-600 font-medium">Tax: ₹{calculatedTax.toLocaleString()}</span>
                    <span className="font-extrabold text-navy-900 text-sm">Grand Total: ₹{calculatedGrandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Bill Remarks / Delivery Note
                </label>
                <textarea
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Carrier / driver details or GRN note..."
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-navy-600"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-navy-700 hover:bg-navy-800 rounded-lg disabled:opacity-50"
                >
                  {submitting ? 'Recording Purchase...' : 'Confirm & Inward Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Purchase Modal */}
      {selectedPurchase && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Supplier Bill: {selectedPurchase.supplierInvoiceNo}
              </h3>
              <button
                onClick={() => setSelectedPurchase(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 py-3 border-b border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block">Vendor:</span>
                <span className="font-bold text-slate-800">{selectedPurchase.supplierName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Date:</span>
                <span className="font-medium text-slate-800">{new Date(selectedPurchase.purchaseDate).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Total Amount:</span>
                <span className="font-bold text-navy-900">₹{selectedPurchase.grandTotal?.toLocaleString()}</span>
              </div>
            </div>

            <div className="py-3">
              <h4 className="text-xs font-bold text-slate-600 mb-2">Inward Items ({selectedPurchase.items?.length})</h4>
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Product Name</th>
                      <th className="py-2 px-3 text-center">Qty</th>
                      <th className="py-2 px-3 text-right">Cost Rate</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPurchase.items?.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold text-slate-800">{it.productName}</td>
                        <td className="py-2 px-3 text-center font-bold">{it.qty}</td>
                        <td className="py-2 px-3 text-right font-medium">₹{it.rate}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">₹{it.total?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setSelectedPurchase(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

