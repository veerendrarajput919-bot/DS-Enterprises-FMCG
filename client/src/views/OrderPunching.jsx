import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  RotateCcw,
  User,
  MapPin,
  Calendar,
  CreditCard,
  Building2,
  PackageCheck
} from 'lucide-react';
import { partyAPI, productAPI, invoiceAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function OrderPunching({ onNavigate }) {
  const { user } = useAuth();
  const [parties, setParties] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);
  const [error, setError] = useState(null);

  // Form states
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
  const [salesPerson, setSalesPerson] = useState(user?.name || 'Sales Representative');
  const [notes, setNotes] = useState('');

  // Cart / Line items
  const [items, setItems] = useState([
    {
      productId: '',
      productName: '',
      sku: '',
      brand: '',
      category: '',
      unit: 'PCS',
      availableStock: 0,
      qty: 1,
      rate: 0,
      gstRate: 18,
      amount: 0,
      gstAmount: 0,
      total: 0
    }
  ]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [partyRes, prodRes] = await Promise.all([
        partyAPI.getAll({ limit: 200 }),
        productAPI.getAll({ limit: 200 })
      ]);
      setParties(partyRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      setError('Failed to load customers and inventory catalog: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedParty = parties.find(p => p._id === selectedPartyId);

  // Item row change
  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    const row = { ...updated[index] };

    if (field === 'productId') {
      const prod = products.find(p => p._id === value);
      if (prod) {
        row.productId = prod._id;
        row.productName = prod.name;
        row.sku = prod.sku;
        row.brand = prod.brand;
        row.category = prod.category;
        row.unit = prod.unit || 'PCS';
        row.availableStock = prod.currentStock;
        row.rate = prod.sellingRate || 0;
        row.gstRate = prod.gstRate !== undefined ? prod.gstRate : 18;
      } else {
        row.productId = '';
        row.productName = '';
        row.rate = 0;
        row.availableStock = 0;
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
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      {
        productId: '',
        productName: '',
        sku: '',
        brand: '',
        category: '',
        unit: 'PCS',
        availableStock: 0,
        qty: 1,
        rate: 0,
        gstRate: 18,
        amount: 0,
        gstAmount: 0,
        total: 0
      }
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculations
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalTax = items.reduce((sum, item) => sum + (Number(item.gstAmount) || 0), 0);
  const grandTotal = subtotal + totalTax;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedPartyId) {
      setError('Please select a retail customer / party');
      return;
    }

    const validItems = items.filter(it => it.productId);
    if (validItems.length === 0) {
      setError('Please add at least one valid product line to punch order');
      return;
    }

    // Check stock warning
    const stockIssues = validItems.filter(it => it.qty > it.availableStock);
    if (stockIssues.length > 0) {
      const confirmProceed = window.confirm(
        `Warning: ${stockIssues.length} item(s) exceed available stock (${stockIssues.map(s => s.productName).join(', ')}). Proceed anyway?`
      );
      if (!confirmProceed) return;
    }

    try {
      setSubmitting(true);
      const payload = {
        partyId: selectedPartyId,
        billDate,
        dueDate,
        salesPerson,
        notes,
        items: validItems.map(it => ({
          productId: it.productId,
          qty: it.qty,
          rate: it.rate,
          gstRate: it.gstRate
        }))
      };

      const res = await invoiceAPI.create(payload);
      if (res.success) {
        setSuccessOrder(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to punch order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedPartyId('');
    setBillDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
    setNotes('');
    setItems([
      {
        productId: '',
        productName: '',
        sku: '',
        brand: '',
        category: '',
        unit: 'PCS',
        availableStock: 0,
        qty: 1,
        rate: 0,
        gstRate: 18,
        amount: 0,
        gstAmount: 0,
        total: 0
      }
    ]);
    setSuccessOrder(null);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-navy-700 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-navy-50 text-navy-700 rounded-lg">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Order Punching & Billing</h1>
              <p className="text-xs text-slate-500">Record spot sales order, auto-deduct stock & post to party ledger</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Form</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center space-x-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Modal / Banner */}
      {successOrder && (
        <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-xl text-emerald-900 shadow-sm animate-fadeIn">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-emerald-900">Order Punched Successfully!</h3>
                <p className="text-sm text-emerald-700 mt-0.5">
                  Invoice <span className="font-mono font-bold">{successOrder.invoiceNo}</span> has been booked. Inventory was deducted and ledger updated.
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-emerald-800">
                  <span className="bg-emerald-100 px-2.5 py-1 rounded">Customer: {successOrder.partyName}</span>
                  <span className="bg-emerald-100 px-2.5 py-1 rounded">Total Qty: {successOrder.totalQuantity}</span>
                  <span className="bg-emerald-100 px-2.5 py-1 rounded font-bold">Grand Total: ₹{successOrder.grandTotal?.toLocaleString()}</span>
                  <span className="bg-emerald-100 px-2.5 py-1 rounded">Due Date: {new Date(successOrder.dueDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {onNavigate && (
                <button
                  onClick={() => onNavigate('bill-management')}
                  className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                >
                  View Invoices
                </button>
              )}
              <button
                onClick={handleReset}
                className="px-3 py-2 bg-white border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold hover:bg-emerald-50 transition-colors"
              >
                Punch Another
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Booking Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer & Order Metadata */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-navy-600" />
            <span>Customer & Dispatch Information</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Select Retail Party / Customer <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                required
                className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
              >
                <option value="">-- Choose Party / Outlet --</option>
                {parties.map(p => (
                  <option key={p._id} value={p._id}>
                    {p.name} ({p.code}) - {p.city} [{p.route}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Bill / Booking Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                required
                className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Payment Due Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Sales Rep / Puncher
              </label>
              <input
                type="text"
                value={salesPerson}
                onChange={(e) => setSalesPerson(e.target.value)}
                placeholder="Sales Executive name"
                className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Customer Quick Card Info */}
          {selectedParty && (
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg text-xs">
              <div>
                <span className="text-slate-400 block">Party Code:</span>
                <span className="font-mono font-bold text-slate-700">{selectedParty.code}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Route / Beat:</span>
                <span className="font-medium text-slate-700">{selectedParty.route || 'General Beat'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">City / Territory:</span>
                <span className="font-medium text-slate-700">{selectedParty.city}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Current Ledger Outstanding:</span>
                <span className={`font-bold ${selectedParty.outstanding > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  ₹{selectedParty.outstanding?.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Line Items Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
              <PackageCheck className="w-4 h-4 text-navy-600" />
              <span>Order Line Items ({items.length})</span>
            </h2>
            <button
              type="button"
              onClick={addItemRow}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-white bg-navy-700 hover:bg-navy-800 rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3 min-w-[260px]">Product / SKU</th>
                  <th className="py-3 px-3 w-28 text-center">Stock Avail</th>
                  <th className="py-3 px-3 w-24 text-center">Qty</th>
                  <th className="py-3 px-3 w-28 text-right">Selling Rate (₹)</th>
                  <th className="py-3 px-3 w-20 text-center">GST %</th>
                  <th className="py-3 px-3 w-28 text-right">Taxable (₹)</th>
                  <th className="py-3 px-3 w-28 text-right">Total (₹)</th>
                  <th className="py-3 px-2 w-12 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-400 font-bold">
                      {idx + 1}
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={row.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        required
                        className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-navy-600"
                      >
                        <option value="">-- Select Product --</option>
                        {products.map(p => (
                          <option key={p._id} value={p._id}>
                            {p.name} [{p.sku}] - Stock: {p.currentStock} {p.unit} - ₹{p.sellingRate}
                          </option>
                        ))}
                      </select>
                      {row.brand && (
                        <div className="text-[10px] text-slate-500 mt-1 flex space-x-2">
                          <span className="font-semibold text-navy-700">{row.brand}</span>
                          <span>•</span>
                          <span>{row.category}</span>
                          <span>•</span>
                          <span className="font-mono">{row.sku}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-1 rounded text-[11px] font-bold ${
                        row.availableStock < 10 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {row.availableStock} {row.unit}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min="1"
                        value={row.qty}
                        onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                        required
                        className="w-20 text-center font-bold px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-navy-600"
                      />
                    </td>

                    <td className="py-3 px-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={row.rate}
                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                        required
                        className="w-24 text-right font-semibold px-2 py-1 border border-slate-300 rounded focus:ring-1 focus:ring-navy-600"
                      />
                    </td>

                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        value={row.gstRate}
                        onChange={(e) => handleItemChange(idx, 'gstRate', e.target.value)}
                        className="w-14 text-center text-slate-700 px-1 py-1 border border-slate-300 rounded"
                      />
                    </td>

                    <td className="py-3 px-3 text-right font-medium text-slate-700">
                      ₹{row.amount?.toLocaleString()}
                    </td>

                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      ₹{row.total?.toLocaleString()}
                    </td>

                    <td className="py-3 px-2 text-center">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove line"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Summary Breakdown */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="w-full md:w-1/2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Order Remarks / Dispatch Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special delivery instructions, beat transit notes, or po reference..."
                rows="2"
                className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:ring-1 focus:ring-navy-600 focus:outline-none"
              ></textarea>
            </div>

            <div className="w-full md:w-80 bg-white p-3.5 rounded-lg border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Items / Qty:</span>
                <span className="font-bold">{items.length} lines ({totalQuantity} units)</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Taxable Subtotal:</span>
                <span className="font-semibold">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Applicable GST (CGST + SGST):</span>
                <span className="font-semibold text-teal-700">+₹{totalTax.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-slate-900 font-extrabold text-sm">
                <span>Grand Total:</span>
                <span className="text-navy-900 font-mono text-base">₹{grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-5 py-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center space-x-2 px-6 py-2.5 text-xs font-bold text-white bg-navy-800 hover:bg-navy-900 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Punching Order...' : 'Confirm & Punch Order'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

