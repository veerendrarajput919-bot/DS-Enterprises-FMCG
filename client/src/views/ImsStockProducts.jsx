import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Package, Plus, Search, Filter, AlertTriangle, CheckCircle,
  Tag, Boxes, DollarSign, Edit3, Trash2, X, RefreshCw
} from 'lucide-react';

export default function ImsStockProducts() {
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalProduct, setStockModalProduct] = useState(null);
  const [stockAdjustQty, setStockAdjustQty] = useState('');
  const [stockAdjustType, setStockAdjustType] = useState('IN');
  const [stockAdjustRemarks, setStockAdjustRemarks] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '', sku: '', brand: 'Hindustan Unilever', category: 'Biscuits & Bakery',
    unit: 'PCS', purchaseRate: '', sellingRate: '', mrp: '', gstRate: 18,
    currentStock: '', minStockAlert: 20
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (brandFilter) params.append('brand', brandFilter);
      if (lowStockOnly) params.append('lowStockOnly', 'true');

      const [pRes, bRes, cRes] = await Promise.all([
        api.getProducts(params.toString()),
        api.getBrands(),
        api.getCategories()
      ]);

      if (pRes.success) {
        setProducts(pRes.data);
        setSummary(pRes.summary);
      }
      if (bRes.success) setBrands(bRes.data);
      if (cRes.success) setCategories(cRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, brandFilter, lowStockOnly]);

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct._id, formData);
      } else {
        await api.createProduct(formData);
      }
      setShowProductModal(false);
      setEditingProduct(null);
      fetchData();
    } catch (err) {
      alert(err.message || 'Operation failed');
    }
  };

  const handleStockAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!stockModalProduct || !stockAdjustQty) return;

    try {
      const signedQty = stockAdjustType === 'OUT' || stockAdjustType === 'DAMAGE'
        ? -Math.abs(Number(stockAdjustQty))
        : Math.abs(Number(stockAdjustQty));

      const res = await api.adjustStock(stockModalProduct._id, {
        type: stockAdjustType,
        qty: signedQty,
        remarks: stockAdjustRemarks
      });

      if (res.success) {
        setShowStockModal(false);
        setStockModalProduct(null);
        setStockAdjustQty('');
        setStockAdjustRemarks('');
        fetchData();
      }
    } catch (err) {
      alert(err.message || 'Stock adjustment failed');
    }
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      brand: p.brand,
      category: p.category,
      unit: p.unit,
      purchaseRate: p.purchaseRate,
      sellingRate: p.sellingRate,
      mrp: p.mrp,
      gstRate: p.gstRate,
      currentStock: p.currentStock,
      minStockAlert: p.minStockAlert
    });
    setShowProductModal(true);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            IMS Stock & Product Catalog Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            FMCG inventory valuation, purchase margins, real-time stock balance, and warehouse inward registers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
              lowStockOnly
                ? 'bg-rose-600 text-white'
                : 'bg-white border border-rose-300 text-rose-700 hover:bg-rose-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{lowStockOnly ? '✓ Low Stock Filter Active' : 'Low Stock Alerts'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingProduct(null);
              setFormData({
                name: '', sku: '', brand: brands[0]?.name || 'Hindustan Unilever',
                category: categories[0]?.name || 'Biscuits & Bakery', unit: 'PCS',
                purchaseRate: '', sellingRate: '', mrp: '', gstRate: 18,
                currentStock: '', minStockAlert: 20
              });
              setShowProductModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-brandTeal-600 hover:bg-brandTeal-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Valuation Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Total Inventory</p>
          <p className="text-xl font-black text-slate-900 mt-0.5">{(summary.totalStockUnits || 0).toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-400">{summary.totalProducts || 0} Registered SKUs</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Stock Valuation (Cost)</p>
          <p className="text-xl font-black text-slate-800 mt-0.5">₹ {(summary.purchaseValuation || 0).toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-400">Inventory purchase cost</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Valuation (Selling)</p>
          <p className="text-xl font-black text-brandTeal-700 mt-0.5">₹ {(summary.sellingValuation || 0).toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-emerald-600 font-bold">+₹ {(summary.potentialProfit || 0).toLocaleString('en-IN')} Margin</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-rose-500 uppercase">Low Stock Alerts</p>
          <p className="text-xl font-black text-rose-600 mt-0.5">{summary.lowStockCount || 0}</p>
          <p className="text-[10px] text-rose-500 font-medium">Reorder required</p>
        </div>
      </div>

      {/* Search & Filter Row */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search products by SKU, name, brand or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
          />
        </div>

        <select
          value={brandFilter}
          onChange={(e) => setBrandFilter(e.target.value)}
          className="w-full sm:w-52 py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
        >
          <option value="">All Brands</option>
          {brands.map(b => (
            <option key={b._id} value={b.name}>{b.name}</option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">SKU / Code</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Cost Rate</th>
                <th className="py-3 px-4 text-right">Selling Rate</th>
                <th className="py-3 px-4 text-center">Stock</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="8" className="py-8 text-center text-slate-400">Loading inventory catalog...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="8" className="py-8 text-center text-slate-400">No products found.</td></tr>
              ) : (
                products.map((p, idx) => {
                  const isLow = p.currentStock <= (p.minStockAlert || 20);
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-navy-800">
                        {p.sku}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {p.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {p.brand}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {p.category}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-600">
                        ₹ {(p.purchaseRate || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-brandTeal-700">
                        ₹ {(p.sellingRate || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isLow ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {p.currentStock} {p.unit}
                          {isLow && ' (LOW)'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setStockModalProduct(p);
                              setStockAdjustQty('');
                              setStockAdjustType('IN');
                              setShowStockModal(true);
                            }}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-bold text-[10px]"
                            title="Adjust Inventory Stock"
                          >
                            ± Stock
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                            title="Edit Product"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editingProduct ? 'Edit Product Details' : 'Add New FMCG Product'}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleProductSubmit} className="p-4 space-y-3 text-xs max-h-[85vh] overflow-y-auto">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Description / Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aashirvaad Atta 10kg"
                  value={formData.name}
                  onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">SKU / Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AASH-ATT-10K"
                    value={formData.sku}
                    onChange={(e) => setFormData(p => ({ ...p, sku: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg uppercase font-mono focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    placeholder="e.g. PCS / BOX / POUCH"
                    value={formData.unit}
                    onChange={(e) => setFormData(p => ({ ...p, unit: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg uppercase focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">FMCG Brand *</label>
                  <select
                    value={formData.brand}
                    onChange={(e) => setFormData(p => ({ ...p, brand: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                  >
                    {brands.map(b => (
                      <option key={b._id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                  >
                    {categories.map(c => (
                      <option key={c._id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Purchase Rate (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.purchaseRate}
                    onChange={(e) => setFormData(p => ({ ...p, purchaseRate: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Selling Rate (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.sellingRate}
                    onChange={(e) => setFormData(p => ({ ...p, sellingRate: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    value={formData.mrp}
                    onChange={(e) => setFormData(p => ({ ...p, mrp: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Current Stock (Qty)</label>
                  <input
                    type="number"
                    value={formData.currentStock}
                    onChange={(e) => setFormData(p => ({ ...p, currentStock: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Min Alert Threshold</label>
                  <input
                    type="number"
                    value={formData.minStockAlert}
                    onChange={(e) => setFormData(p => ({ ...p, minStockAlert: e.target.value }))}
                    className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded-lg text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brandTeal-600 hover:bg-brandTeal-700 text-white rounded-lg font-bold"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showStockModal && stockModalProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-fade-in">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Adjust Inventory Stock</h3>
                <p className="text-xs text-slate-500">{stockModalProduct.name}</p>
              </div>
              <button onClick={() => setShowStockModal(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleStockAdjustSubmit} className="p-4 space-y-3 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg">
                <span className="text-slate-500 font-medium">Current Stock on Hand:</span>
                <p className="text-base font-black text-slate-900">{stockModalProduct.currentStock} {stockModalProduct.unit}</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Adjustment Type *</label>
                <select
                  value={stockAdjustType}
                  onChange={(e) => setStockAdjustType(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-semibold focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                >
                  <option value="IN">➕ Stock IN (Factory / Depot Inward)</option>
                  <option value="OUT">➖ Stock OUT (Manual Dispatch / Transfer)</option>
                  <option value="DAMAGE">⚠️ Damage / Expiry Loss (Write-Off)</option>
                  <option value="ADJUSTMENT">🔄 Physical Count Reconciliation</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Quantity ({stockModalProduct.unit}) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 50"
                  value={stockAdjustQty}
                  onChange={(e) => setStockAdjustQty(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold text-sm focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarks / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. GRN-108 or Physical audit"
                  value={stockAdjustRemarks}
                  onChange={(e) => setStockAdjustRemarks(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brandTeal-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="px-3 py-1.5 bg-slate-100 rounded-lg text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-brandTeal-600 hover:bg-brandTeal-700 text-white rounded-lg font-bold"
                >
                  Apply Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

