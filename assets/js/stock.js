/**
 * ==========================================================================
 * DS ENTERPRISES — ADVANCED IMS STOCK & PRODUCT CRUD CONTROLLER
 * File: assets/js/stock.js
 * Architecture: Product Catalog CRUD (Add, Edit, Update, Delete),
 *               Product Images, Live Margin Calculator, Stock Inward Adjust,
 *               Dual View Modes (IMS Cards & Ledger Table), Excel & PDF Export
 * ==========================================================================
 */

(function (window) {
  'use strict';

  let STOCK_CHART = null;
  let FILTERED_STOCK_ROWS = [];
  let currentViewMode = localStorage.getItem('ds_stock_view_mode') || 'cards';

  function n(v) {
    if (v === null || v === undefined) return 0;
    const s = String(v).replace(/₹|,/g, '').replace(/[^0-9.\-]/g, '');
    return parseFloat(s) || 0;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }

  function ageDays(dateStr) {
    const d = new Date((dateStr || '') + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return 0;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.max(0, Math.floor((today - d) / 86400000));
  }

  function unpaidSet() {
    const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
    return new Set((db.unpaid || []).map(x => String(x.invoice || x.billNo || x.invoiceNo || '').trim()).filter(Boolean));
  }

  const DS_Stock = {
    init: function () {
      this.setupPermissions();
      this.populateOptions();
      this.populateDatalists();
      this.bindEvents();
      this.setViewMode(currentViewMode, false);
      this.update();
    },

    setupPermissions: function () {
      const canManage = window.DS_Auth ? (window.DS_Auth.isAdmin() || window.DS_Auth.hasPermission('canManageProducts')) : true;
      const addBtn = document.getElementById('btnOpenAddProduct');
      if (addBtn) {
        addBtn.style.display = canManage ? 'inline-flex' : 'none';
      }
    },

    bindEvents: function () {
      ['stFirm', 'stBrand', 'stCat', 'stSubCat', 'stCity', 'stCity1', 'stRoute', 'stStockStatus', 'stSearch'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('change', () => this.update());
          if (el.tagName === 'INPUT') el.addEventListener('input', () => this.update());
        }
      });
    },

    resetFilters: function () {
      ['stFirm', 'stBrand', 'stCat', 'stSubCat', 'stCity', 'stCity1', 'stRoute', 'stStockStatus'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      const s = document.getElementById('stSearch');
      if (s) s.value = '';
      this.update();
    },

    setViewMode: function (mode, doUpdate = true) {
      currentViewMode = mode === 'table' ? 'table' : 'cards';
      try { localStorage.setItem('ds_stock_view_mode', currentViewMode); } catch (_) {}

      const cardsBtn = document.getElementById('btnViewCards');
      const tableBtn = document.getElementById('btnViewTable');
      const cardsView = document.getElementById('stockCardsView');
      const tableView = document.getElementById('stockTableView');

      if (currentViewMode === 'cards') {
        if (cardsBtn) {
          cardsBtn.style.background = '#ffffff';
          cardsBtn.style.color = '#0f172a';
          cardsBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
        }
        if (tableBtn) {
          tableBtn.style.background = 'transparent';
          tableBtn.style.color = '#64748b';
          tableBtn.style.boxShadow = 'none';
        }
        if (cardsView) cardsView.style.display = 'block';
        if (tableView) tableView.style.display = 'none';
      } else {
        if (cardsBtn) {
          cardsBtn.style.background = 'transparent';
          cardsBtn.style.color = '#64748b';
          cardsBtn.style.boxShadow = 'none';
        }
        if (tableBtn) {
          tableBtn.style.background = '#ffffff';
          tableBtn.style.color = '#0f172a';
          tableBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
        }
        if (cardsView) cardsView.style.display = 'none';
        if (tableView) tableView.style.display = 'block';
      }

      if (doUpdate) this.update();
    },

    populateOptions: function () {
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { stock: [] };
      const s = db.stock || [];
      const parties = db.party || [];

      this.fillSelect('stFirm', s.map(x => x['Firm Name'] || x.Firm || x.firm));
      this.fillSelect('stBrand', s.map(x => x.Brand || x.brand));
      this.fillSelect('stCat', s.map(x => x['Item Category Name'] || x.category));
      this.fillSelect('stSubCat', [
        ...s.map(x => x.subCategory || x['Sub Category'] || x['Sub Category Name']),
        ...(db.sales || []).map(x => x.subCategory || x['Sub Category'] || x.itemSubCategory)
      ]);
      this.fillSelect('stCity', parties.map(p => p.city));
      this.fillSelect('stCity1', parties.map(p => p.city1));
      this.fillSelect('stRoute', parties.map(p => p.route));
    },

    populateDatalists: function () {
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { stock: [] };
      const s = db.stock || [];

      const brands = [...new Set(s.map(x => x.Brand || x.brand).filter(Boolean))].sort();
      const cats = [...new Set(s.map(x => x['Item Category Name'] || x.category).filter(Boolean))].sort();
      const subCats = [...new Set([
        ...s.map(x => x.subCategory || x['Sub Category'] || x['Sub Category Name']),
        ...(db.sales || []).map(x => x.subCategory || x['Sub Category'] || x.itemSubCategory)
      ].filter(Boolean))].sort();

      const bDl = document.getElementById('brandDatalist');
      if (bDl) bDl.innerHTML = brands.map(b => `<option value="${esc(b)}"></option>`).join('');

      const cDl = document.getElementById('catDatalist');
      if (cDl) cDl.innerHTML = cats.map(c => `<option value="${esc(c)}"></option>`).join('');

      const scDl = document.getElementById('subCatDatalist');
      if (scDl) scDl.innerHTML = subCats.map(c => `<option value="${esc(c)}"></option>`).join('');
    },

    fillSelect: function (id, arr) {
      const el = document.getElementById(id);
      if (!el) return;
      const cur = el.value;
      const unique = [...new Set((arr || []).filter(v => v !== '' && v !== null && v !== undefined).map(String))].sort((a, b) => a.localeCompare(b));
      el.innerHTML = '<option value="">All</option>' + unique.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
      if (unique.includes(cur)) el.value = cur;
    },

    getFilteredRows: function () {
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { stock: [] };
      const all = db.stock || [];
      const firm = document.getElementById('stFirm')?.value || '';
      const brand = document.getElementById('stBrand')?.value || '';
      const cat = document.getElementById('stCat')?.value || '';
      const subCat = document.getElementById('stSubCat')?.value || '';
      const stockStatus = document.getElementById('stStockStatus')?.value || '';
      const q = (document.getElementById('stSearch')?.value || '').trim().toLowerCase();

      return all.filter(x => {
        const xFirm = x['Firm Name'] || x.Firm || x.firm || '';
        const xBrand = x.Brand || x.brand || '';
        const xCat = x['Item Category Name'] || x.category || '';
        const xSubCat = x.subCategory || x['Sub Category'] || x['Sub Category Name'] || '';
        const xName = x.Name || x.name || '';
        const xCode = x.code || x['Item Code'] || '';

        if (firm && String(xFirm) !== firm) return false;
        if (brand && String(xBrand) !== brand) return false;
        if (cat && String(xCat) !== cat) return false;
        if (subCat && String(xSubCat) !== subCat) return false;

        if (stockStatus) {
          const qty = n(x['Stock Quantity']) || n(x.stock);
          const min = n(x.minStock) || 20;
          if (stockStatus === 'in_stock' && qty <= 0) return false;
          if (stockStatus === 'low_stock' && (qty <= 0 || qty > min)) return false;
          if (stockStatus === 'out_of_stock' && qty > 0) return false;
        }

        if (q && !(String(xName).toLowerCase().includes(q) || String(xBrand).toLowerCase().includes(q) || String(xCode).toLowerCase().includes(q))) return false;
        return true;
      });
    },

    update: function () {
      const rows = this.getFilteredRows();
      FILTERED_STOCK_ROWS = rows;

      const totalVal = rows.reduce((s, x) => s + (n(x['Stock Value']) || n(x.value) || (n(x.stock) * n(x.rate))), 0);
      const totalQty = rows.reduce((s, x) => s + (n(x['Stock Quantity']) || n(x.stock)), 0);
      const uniqueBrands = new Set(rows.map(x => x.Brand || x.brand).filter(Boolean)).size;

      // Low stock counter
      const lowStockItems = rows.filter(x => {
        const st = n(x['Stock Quantity']) || n(x.stock);
        const min = n(x.minStock) || 20;
        return st <= min;
      });

      const alertBanner = document.getElementById('stLowStockBanner');
      const alertCount = document.getElementById('stLowStockCount');
      if (alertBanner && alertCount) {
        if (lowStockItems.length > 0) {
          alertCount.textContent = lowStockItems.length;
          alertBanner.style.display = 'block';
        } else {
          alertBanner.style.display = 'none';
        }
      }

      // Render KPIs
      const kpiEl = document.getElementById('stockKpi');
      if (kpiEl) {
        kpiEl.innerHTML = [
          ['Total Stock Value', DS_App.money(totalVal), 'emerald'],
          ['Total Stock Qty', DS_App.qty(totalQty), 'blue'],
          ['Active Inventory SKUs', rows.length.toLocaleString('en-IN'), 'blue'],
          ['Brands in Catalog', uniqueBrands.toLocaleString('en-IN'), 'blue']
        ].map(it => `
          <div class="kpi-card ${it[2]}" style="padding:12px 14px;">
            <div class="kpi-label">${it[0]}</div>
            <div class="kpi-value" style="font-size:20px; font-weight:800;">${it[1]}</div>
          </div>
        `).join('');
      }

      const countBadge = document.getElementById('cardsResultCount');
      if (countBadge) countBadge.textContent = `Showing ${rows.length} FMCG Products`;

      this.renderBrandChart(rows);
      this.renderBrandSummaryTable(rows);
      this.renderBrandDeepDiveOutstanding();

      // Render Active View
      this.renderProductCards(rows);
      this.renderStockTable(rows);
    },

    renderBrandChart: function (rows) {
      const bm = new Map();
      rows.forEach(x => {
        const b = String(x.Brand || x.brand || 'Unmapped').trim() || 'Unmapped';
        const v = n(x['Stock Value']) || n(x.value) || (n(x.stock) * n(x.rate));
        bm.set(b, (bm.get(b) || 0) + v);
      });

      const topBrands = [...bm.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
      const canvas = document.getElementById('stockBrandChart');
      if (canvas && typeof Chart !== 'undefined') {
        if (STOCK_CHART) STOCK_CHART.destroy();
        STOCK_CHART = new Chart(canvas, {
          type: 'bar',
          data: {
            labels: topBrands.map(x => x[0]),
            datasets: [{
              label: 'Stock Value (₹)',
              data: topBrands.map(x => x[1]),
              backgroundColor: '#0d9488',
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
          }
        });
      }
    },

    renderBrandSummaryTable: function (rows) {
      const tbody = document.getElementById('brandStockTable')?.querySelector('tbody');
      if (!tbody) return;

      const m = new Map();
      rows.forEach(x => {
        const k = String(x.Brand || x.brand || 'Unmapped').trim() || 'Unmapped';
        const o = m.get(k) || { q: 0, v: 0 };
        o.q += (n(x['Stock Quantity']) || n(x.stock));
        o.v += (n(x['Stock Value']) || n(x.value) || (n(x.stock) * n(x.rate)));
        m.set(k, o);
      });

      // Calculate Market Outstanding from Sales
      const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
      const unpaid = unpaidSet();
      const market = new Map();

      (db.sales || []).forEach(x => {
        const inv = String(x['Invoice No.'] || x.invoiceNo || '').trim();
        if (unpaid.has(inv)) {
          const k = String(x.Brand || x.brand || 'Unmapped').trim() || 'Unmapped';
          const amt = n(x.AmountNum) || n(x.amount);
          market.set(k, (market.get(k) || 0) + amt);
        }
      });

      const sorted = [...m.entries()].sort((a, b) => b[1].v - a[1].v);
      tbody.innerHTML = sorted.map(it => `
        <tr>
          <td><strong>${esc(it[0])}</strong></td>
          <td class="num">${DS_App.qty(it[1].q)}</td>
          <td class="num font-mono"><strong>${DS_App.money(it[1].v)}</strong></td>
          <td class="num font-mono" style="color:#b91c1c;"><strong>${DS_App.money(market.get(it[0]) || 0)}</strong></td>
        </tr>
      `).join('') || '<tr><td colspan="4" class="muted text-center">No brand stock data</td></tr>';
    },

    renderBrandDeepDiveOutstanding: function () {
      const panel = document.getElementById('stockBrandOutstandingPanel');
      const brand = document.getElementById('stBrand')?.value || '';
      if (!panel) return;

      if (!brand) {
        panel.style.display = 'none';
        return;
      }

      const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
      const unpaid = unpaidSet();
      const city = document.getElementById('stCity')?.value || '';
      const city1 = document.getElementById('stCity1')?.value || '';
      const route = document.getElementById('stRoute')?.value || '';

      const brandUnpaidSales = (db.sales || []).filter(x => {
        const inv = String(x['Invoice No.'] || x.invoiceNo || '').trim();
        const b = String(x.Brand || x.brand || '').trim();
        const xCity = String(x.City || x.city || '').trim();
        const xCity1 = String(x.City_1 || x.city1 || '').trim();
        const xRoute = String(x.Route || x.route || '').trim();

        if (city && xCity !== city) return false;
        if (city1 && xCity1 !== city1) return false;
        if (route && xRoute !== route) return false;

        return unpaid.has(inv) && b === brand;
      });

      const m = new Map();
      brandUnpaidSales.forEach(x => {
        const key = (x['Party Name'] || x.party || 'Unmapped') + '|' + (x.Date || x.date || '') + '|' + (x['Invoice No.'] || x.invoiceNo || '') + '|' + (x.City_1 || x.city1 || 'Kanpur') + '|' + (x.City || x.city || 'Kanpur') + '|' + (x.Route || x.route || 'General Route');
        const o = m.get(key) || { v: 0 };
        o.v += (n(x.AmountNum) || n(x.amount));
        m.set(key, o);
      });

      document.getElementById('stockBrandOutstandingTitle').textContent = `${brand} — Market Outstanding Recovery Details`;

      const tbody = document.getElementById('stockBrandOutstandingTable')?.querySelector('tbody');
      if (tbody) {
        tbody.innerHTML = [...m.entries()].sort((a, b) => b[1].v - a[1].v).map(([k, o]) => {
          const z = k.split('|');
          const days = ageDays(z[1]);
          return `
            <tr>
              <td><strong>${esc(z[0])}</strong></td>
              <td>${esc(z[1])}</td>
              <td><strong>${esc(z[2])}</strong></td>
              <td class="num">${days} Days</td>
              <td>${esc(z[3])}</td>
              <td>${esc(z[4])}</td>
              <td>${esc(z[5])}</td>
              <td class="num font-mono" style="color:#b91c1c;"><strong>${DS_App.money(o.v)}</strong></td>
            </tr>
          `;
        }).join('') || '<tr><td colspan="8" class="muted text-center">No market outstanding for this brand</td></tr>';
      }

      panel.style.display = 'block';
    },

    // ============================================================
    // VIEW 1: RENDER IMS PRODUCT CARDS
    // ============================================================
    renderProductCards: function (rows) {
      const container = document.getElementById('imsProductGrid');
      if (!container) return;

      if (!rows.length) {
        container.innerHTML = `
          <div style="grid-column:1/-1; text-align:center; padding:50px 20px; color:var(--ds-text-muted);">
            <div style="font-size:42px; margin-bottom:10px;">📦</div>
            <h3>No Products Found</h3>
            <p>Try clearing filters or click "+ Add New Product" to create your first SKU.</p>
          </div>
        `;
        return;
      }

      const canManage = window.DS_Auth ? (window.DS_Auth.isAdmin() || window.DS_Auth.hasPermission('canManageProducts')) : true;
      const canAdjust = window.DS_Auth ? (window.DS_Auth.isAdmin() || window.DS_Auth.hasPermission('canAdjustStock')) : true;
      const canViewMargins = window.DS_Auth ? (window.DS_Auth.isAdmin() || window.DS_Auth.hasPermission('canViewMargins')) : true;

      container.innerHTML = rows.map(r => {
        const code = r.code || r['Item Code'] || '';
        const name = r.Name || r.name || 'Unnamed Product';
        const brand = r.Brand || r.brand || 'General';
        const cat = r['Item Category Name'] || r.category || 'General';
        const pCost = n(r.purchasePrice ?? r['Purchase Price'] ?? 0);
        const sRate = n(r.rate ?? r['Selling Price'] ?? 0);
        const mrp = n(r.mrp ?? r.MRP ?? sRate);
        const stockQty = n(r.stock ?? r['Stock Quantity'] ?? 0);
        const minStock = n(r.minStock ?? 20);
        const unit = r.unit || 'Pkt';
        const imgPath = window.DS_Storage ? window.DS_Storage.resolveImagePath(r.image) : (r.image || '');

        const profitUnit = sRate - pCost;
        const marginPct = sRate > 0 ? Math.round((profitUnit / sRate) * 1000) / 10 : 0;
        const retailerMarginPct = mrp > 0 && sRate > 0 ? Math.round(((mrp - sRate) / mrp) * 1000) / 10 : 0;

        // Stock status
        let statusBadge = '';
        if (stockQty <= 0) {
          statusBadge = '<span class="badge" style="background:#fee2e2; color:#b91c1c; font-weight:700;">Out of Stock</span>';
        } else if (stockQty <= minStock) {
          statusBadge = `<span class="badge" style="background:#fef3c7; color:#b45309; font-weight:700;">Low Stock: ${DS_App.qty(stockQty)} ${unit}</span>`;
        } else {
          statusBadge = `<span class="badge" style="background:#ecfdf5; color:#047857; font-weight:700;">In Stock: ${DS_App.qty(stockQty)} ${unit}</span>`;
        }

        const initial = name ? name.charAt(0).toUpperCase() : 'P';

        return `
          <div class="store-card" style="display:flex; flex-direction:column; justify-content:space-between; padding:10px 12px; border-radius:8px; border:1px solid #e2e8f0; background:#ffffff; box-shadow:0 1px 3px rgba(0,0,0,0.03); transition:all 0.2s ease;">
            <div>
              <!-- Top Row: Image Thumbnail & SKU Tags -->
              <div style="display:flex; gap:10px; align-items:flex-start; margin-bottom:8px;">
                <div style="width:56px; height:56px; border-radius:6px; background:#f8fafc; border:1px solid #e2e8f0; overflow:hidden; display:grid; place-items:center; flex-shrink:0;">
                  ${imgPath ? `
                    <img src="${imgPath}" alt="${esc(name)}" style="width:100%; height:100%; object-fit:contain; padding:2px;" onerror="this.onerror=null; this.src=''; this.parentElement.innerHTML='<div style=\\'font-weight:800; font-size:18px; color:#0284c7;\\'>${initial}</div>';" />
                  ` : `
                    <div style="width:100%; height:100%; display:grid; place-items:center; font-weight:800; font-size:18px; color:#0284c7; background:linear-gradient(135deg, #e0f2fe, #bae6fd);">
                      ${initial}
                    </div>
                  `}
                </div>

                <div style="flex:1; min-width:0;">
                  <div style="display:flex; gap:4px; flex-wrap:wrap; margin-bottom:3px;">
                    <span style="font-family:monospace; font-size:9.5px; font-weight:800; padding:1px 5px; border-radius:3px; background:#f1f5f9; color:#475569;">
                      ${esc(code)}
                    </span>
                    <span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:9.5px; padding:1px 5px;">
                      ${esc(brand)}
                    </span>
                  </div>
                  <h4 style="margin:0 0 2px; font-size:13px; font-weight:800; color:var(--ds-text); line-height:1.2; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;" title="${esc(name)}">
                    ${esc(name)}
                  </h4>
                  <div style="font-size:10.5px; color:var(--ds-text-muted);">${esc(cat)}</div>
                </div>
              </div>

              <!-- Stock & Margin Badges -->
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:4px;">
                ${statusBadge}
                ${canViewMargins ? `
                  <span style="font-size:10.5px; font-weight:700; color:${marginPct >= 0 ? '#059669' : '#dc2626'}; background:#f0fdf4; padding:2px 5px; border-radius:4px;" title="Distributor Purchase Margin">
                    ${marginPct >= 0 ? '+' : ''}${marginPct}% Margin
                  </span>
                ` : `
                  <span style="font-size:10.5px; font-weight:700; color:#0369a1; background:#e0f2fe; padding:2px 5px; border-radius:4px;" title="Retailer Margin on MRP">
                    ${retailerMarginPct}% Retail Margin
                  </span>
                `}
              </div>

              <!-- Pricing Matrix Box -->
              <div style="background:#f8fafc; border:1px solid #f1f5f9; border-radius:6px; padding:6px 8px; margin-bottom:8px; font-size:11.5px;">
                ${canViewMargins ? `
                  <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                    <span style="color:var(--ds-text-muted); font-size:10.5px;">Purchase Cost:</span>
                    <strong style="color:#475569; font-family:monospace;">${DS_App.money(pCost)}</strong>
                  </div>
                ` : `
                  <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                    <span style="color:var(--ds-text-muted); font-size:10.5px;">Pack Unit:</span>
                    <strong style="color:#475569;">${esc(unit)}</strong>
                  </div>
                `}
                <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                  <span style="color:var(--ds-text-muted); font-size:10.5px;">Dealer Selling Rate:</span>
                  <strong style="color:var(--ds-primary); font-family:monospace; font-size:12.5px;">${DS_App.money(sRate)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; border-top:1px dashed #e2e8f0; padding-top:2px; margin-top:2px;">
                  <span style="color:var(--ds-text-muted); font-size:10.5px;">Printed MRP:</span>
                  <span style="color:var(--ds-text-light); text-decoration:line-through; font-size:10.5px;">${DS_App.money(mrp)}</span>
                </div>
              </div>
            </div>

            <!-- Action Buttons Footer -->
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f1f5f9; padding-top:6px;">
              <div style="font-size:10.5px; color:var(--ds-text-muted);">
                Min: <strong>${minStock} ${unit}</strong>
              </div>
              <div style="display:flex; gap:4px;">
                ${canAdjust ? `
                  <button type="button" class="btn btn-secondary btn-sm" style="padding:2px 6px; font-size:11px;" title="Adjust Stock Inward / Reconcile" onclick="DS_Stock.openStockAdjust('${esc(code)}')">
                    Stock
                  </button>
                ` : ''}
                ${canManage ? `
                  <button type="button" class="btn btn-secondary btn-sm" style="padding:2px 6px; font-size:11px;" title="Edit Product Info" onclick="DS_Stock.openProductModal('${esc(code)}')">
                    Edit
                  </button>
                  <button type="button" class="btn btn-danger btn-sm" style="padding:2px 6px; font-size:11px;" title="Delete Product" onclick="DS_Stock.deleteProduct('${esc(code)}')">
                    Del
                  </button>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('');
    },

    // ============================================================
    // VIEW 2: RENDER STOCK LEDGER TABLE
    // ============================================================
    renderStockTable: function (rows) {
      const tbody = document.getElementById('stockTable')?.querySelector('tbody');
      if (!tbody) return;

      const canManage = window.DS_Auth ? (window.DS_Auth.isAdmin() || window.DS_Auth.hasPermission('canManageProducts')) : true;
      const canAdjust = window.DS_Auth ? (window.DS_Auth.isAdmin() || window.DS_Auth.hasPermission('canAdjustStock')) : true;
      const canViewMargins = window.DS_Auth ? (window.DS_Auth.isAdmin() || window.DS_Auth.hasPermission('canViewMargins')) : true;

      tbody.innerHTML = rows.map(r => {
        const code = r.code || r['Item Code'] || '-';
        const name = r.Name || r.name || '-';
        const brand = r.Brand || r.brand || '-';
        const cat = r['Item Category Name'] || r.category || '-';
        const pCost = n(r.purchasePrice ?? r['Purchase Price'] ?? 0);
        const sRate = n(r.rate ?? r['Selling Price'] ?? 0);
        const mrp = n(r.mrp ?? r.MRP ?? sRate);
        const stockQty = n(r.stock ?? r['Stock Quantity'] ?? 0);
        const stockVal = n(r['Stock Value']) || n(r.value) || (stockQty * sRate);
        const minStock = n(r.minStock ?? 20);
        const imgPath = window.DS_Storage ? window.DS_Storage.resolveImagePath(r.image) : (r.image || '');

        const profitUnit = sRate - pCost;
        const marginPct = sRate > 0 ? Math.round((profitUnit / sRate) * 1000) / 10 : 0;

        let statusText = stockQty <= 0 ? '<span style="color:#dc2626; font-weight:700;">Out of Stock</span>' :
                         stockQty <= minStock ? '<span style="color:#d97706; font-weight:700;">Low Stock</span>' :
                         '<span style="color:#059669; font-weight:700;">Normal</span>';

        return `
          <tr>
            <td style="padding:4px 8px; text-align:center;">
              <div style="width:36px; height:36px; border-radius:6px; background:#f8fafc; border:1px solid #e2e8f0; overflow:hidden; display:inline-grid; place-items:center;">
                ${imgPath ? `
                  <img src="${imgPath}" alt="${esc(name)}" style="width:100%; height:100%; object-fit:contain;" onerror="this.style.display='none';" />
                ` : `<span style="font-size:10px; color:#94a3b8;">No Pic</span>`}
              </div>
            </td>
            <td class="font-mono font-bold" style="font-size:11px;">${esc(code)}</td>
            <td><strong>${esc(name)}</strong></td>
            <td><span class="badge" style="background:#e0f2fe; color:#0369a1;">${esc(brand)}</span></td>
            <td>${esc(cat)}</td>
            <td class="num font-mono">${canViewMargins ? DS_App.money(pCost) : '<span style="color:#94a3b8;" title="Confidential Cost">—</span>'}</td>
            <td class="num font-mono"><strong>${DS_App.money(sRate)}</strong></td>
            <td class="num font-mono">${DS_App.money(mrp)}</td>
            <td class="num font-bold" style="color:${marginPct >= 0 ? '#059669' : '#dc2626'};">${canViewMargins ? marginPct + '%' : '<span style="color:#94a3b8;" title="Confidential Margin">—</span>'}</td>
            <td class="num font-bold">${DS_App.qty(stockQty)}</td>
            <td class="num font-mono"><strong>${DS_App.money(stockVal)}</strong></td>
            <td>${statusText}</td>
            <td style="text-align:center; white-space:nowrap;">
              ${canAdjust ? `
                <button type="button" class="btn btn-secondary btn-sm" style="padding:2px 6px; font-size:11px;" onclick="DS_Stock.openStockAdjust('${esc(code)}')" title="Adjust Stock">Stock</button>
              ` : ''}
              ${canManage ? `
                <button type="button" class="btn btn-secondary btn-sm" style="padding:2px 6px; font-size:11px;" onclick="DS_Stock.openProductModal('${esc(code)}')" title="Edit Product">Edit</button>
                <button type="button" class="btn btn-danger btn-sm" style="padding:2px 6px; font-size:11px;" onclick="DS_Stock.deleteProduct('${esc(code)}')" title="Delete Product">Del</button>
              ` : ''}
            </td>
          </tr>
        `;
      }).join('') || '<tr><td colspan="13" class="muted text-center" style="padding:30px;">No inventory items found</td></tr>';
    },

    // ============================================================
    // PRODUCT MODAL (ADD / EDIT)
    // ============================================================
    openProductModal: function (code = null) {
      if (!window.DS_Auth || (!window.DS_Auth.isAdmin() && !window.DS_Auth.hasPermission('canManageProducts'))) {
        DS_App.toast('Permission Denied: Only Admin or IMS Manager can modify products!', 'error');
        return;
      }

      const form = document.getElementById('productForm');
      if (form) form.reset();

      const modalTitle = document.getElementById('productModalTitle');
      const editCodeInput = document.getElementById('prodEditCode');
      const codeInput = document.getElementById('prodCode');
      const previewImg = document.getElementById('prodImgPreview');
      const placeholder = document.getElementById('prodImgPlaceholder');

      if (code) {
        // Edit Mode
        const db = window.DS_Storage ? window.DS_Storage.getDB() : { stock: [] };
        const prod = (db.stock || []).find(p => (p.code === code || p['Item Code'] === code));
        if (!prod) return;

        if (modalTitle) modalTitle.textContent = `Edit Product Information — ${prod.name || prod.Name}`;
        if (editCodeInput) editCodeInput.value = code;
        if (codeInput) {
          codeInput.value = code;
          codeInput.readOnly = true;
        }

        document.getElementById('prodName').value = prod.name || prod.Name || '';
        document.getElementById('prodBrand').value = prod.brand || prod.Brand || '';
        document.getElementById('prodCategory').value = prod.category || prod['Item Category Name'] || '';
        document.getElementById('prodSubCategory').value = prod.subCategory || prod['Sub Category'] || prod['Sub Category Name'] || '';
        document.getElementById('prodFirm').value = prod.firm || prod['Firm Name'] || '';
        document.getElementById('prodPurchasePrice').value = prod.purchasePrice ?? prod['Purchase Price'] ?? 0;
        document.getElementById('prodRate').value = prod.rate ?? prod['Selling Price'] ?? 0;
        document.getElementById('prodMrp').value = prod.mrp ?? prod.MRP ?? 0;
        document.getElementById('prodStock').value = prod.stock ?? prod['Stock Quantity'] ?? 0;
        document.getElementById('prodMinStock').value = prod.minStock ?? 30;
        document.getElementById('prodUnit').value = prod.unit || 'Pkt';
        document.getElementById('prodImgUrl').value = prod.image || '';

        this.setPreviewSource(prod.image);
      } else {
        // Add Mode
        const db = window.DS_Storage ? window.DS_Storage.getDB() : { stock: [] };
        const count = (db.stock || []).length;
        const nextCode = `SKU-${String(count + 1).padStart(3, '0')}`;

        if (modalTitle) modalTitle.textContent = 'Add New FMCG Product';
        if (editCodeInput) editCodeInput.value = '';
        if (codeInput) {
          codeInput.value = nextCode;
          codeInput.readOnly = false;
        }
        if (document.getElementById('prodSubCategory')) document.getElementById('prodSubCategory').value = '';
        document.getElementById('prodMinStock').value = 30;
        document.getElementById('prodStock').value = 100;
        document.getElementById('prodUnit').value = 'Pkt';

        this.setPreviewSource('');
      }

      this.calcMarginPreview();
      DS_App.openModal('productModal');
    },

    setPreviewSource: function (src) {
      const previewImg = document.getElementById('prodImgPreview');
      const placeholder = document.getElementById('prodImgPlaceholder');
      if (!previewImg || !placeholder) return;

      const resolved = window.DS_Storage ? window.DS_Storage.resolveImagePath(src) : src;
      if (resolved) {
        previewImg.src = resolved;
        previewImg.style.display = 'block';
        placeholder.style.display = 'none';
      } else {
        previewImg.src = '';
        previewImg.style.display = 'none';
        placeholder.style.display = 'block';
      }
    },

    handleImageFileSelect: function (fileInput) {
      const file = fileInput?.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        const urlInput = document.getElementById('prodImgUrl');
        if (urlInput) urlInput.value = dataUrl;
        this.setPreviewSource(dataUrl);
      };
      reader.readAsDataURL(file);
    },

    handleImageUrlInput: function (url) {
      this.setPreviewSource(url);
    },

    setPresetImage: function (presetUrl) {
      const urlInput = document.getElementById('prodImgUrl');
      if (urlInput) urlInput.value = presetUrl;
      this.setPreviewSource(presetUrl);
    },

    calcMarginPreview: function () {
      const pCost = n(document.getElementById('prodPurchasePrice')?.value);
      const sRate = n(document.getElementById('prodRate')?.value);
      const mrp = n(document.getElementById('prodMrp')?.value);

      const marginAmt = sRate - pCost;
      const marginPct = sRate > 0 ? Math.round((marginAmt / sRate) * 1000) / 10 : 0;
      const discountPct = mrp > 0 ? Math.round(((mrp - sRate) / mrp) * 1000) / 10 : 0;

      const lblAmt = document.getElementById('lblMarginAmt');
      const lblPct = document.getElementById('lblMarginPct');
      const lblDisc = document.getElementById('lblDiscountPct');

      if (lblAmt) lblAmt.textContent = DS_App.money(marginAmt);
      if (lblPct) {
        lblPct.textContent = `${marginPct >= 0 ? '+' : ''}${marginPct}%`;
        lblPct.style.color = marginPct >= 0 ? '#059669' : '#dc2626';
      }
      if (lblDisc) lblDisc.textContent = `${discountPct}%`;
    },

    handleSaveProduct: function (e) {
      if (e) e.preventDefault();

      const editCode = document.getElementById('prodEditCode').value.trim();
      const code = document.getElementById('prodCode').value.trim();
      const name = document.getElementById('prodName').value.trim();
      const brand = document.getElementById('prodBrand').value.trim();
      const category = document.getElementById('prodCategory').value.trim();
      const subCategory = (document.getElementById('prodSubCategory')?.value || '').trim();
      const firm = document.getElementById('prodFirm').value.trim() || brand;
      const unit = document.getElementById('prodUnit').value;
      const pCost = n(document.getElementById('prodPurchasePrice').value);
      const sRate = n(document.getElementById('prodRate').value);
      const mrp = n(document.getElementById('prodMrp').value) || sRate;
      const stock = n(document.getElementById('prodStock').value);
      const minStock = n(document.getElementById('prodMinStock').value) || 20;
      const image = document.getElementById('prodImgUrl').value.trim();

      if (!code || !name || !brand || !category) {
        DS_App.toast('Please fill in SKU Code, Name, Brand, and Category!', 'warning');
        return;
      }

      const productData = {
        code: code,
        name: name,
        brand: brand,
        category: category,
        subCategory: subCategory,
        firm: firm,
        unit: unit,
        purchasePrice: pCost,
        rate: sRate,
        mrp: mrp,
        stock: stock,
        minStock: minStock,
        image: image
      };

      if (editCode) {
        // Update existing product
        window.DS_Storage.updateProduct(editCode, productData);
        DS_App.toast(`Updated Product: ${name} (${code})`, 'success');
      } else {
        // Add new product
        window.DS_Storage.addProduct(productData);
        DS_App.toast(`Added New Product: ${name} (${code})`, 'success');
      }

      DS_App.closeModal('productModal');
      this.populateOptions();
      this.populateDatalists();
      this.update();
    },

    deleteProduct: function (code) {
      if (!window.DS_Auth || (!window.DS_Auth.isAdmin() && !window.DS_Auth.hasPermission('canManageProducts'))) {
        DS_App.toast('Permission Denied: Only Admin or IMS Manager can delete products!', 'error');
        return;
      }

      const db = window.DS_Storage ? window.DS_Storage.getDB() : { stock: [] };
      const item = (db.stock || []).find(p => p.code === code || p['Item Code'] === code);
      const name = item ? (item.name || item.Name) : code;

      if (!confirm(`Are you sure you want to delete product "${name}" (${code}) from inventory? This cannot be undone.`)) {
        return;
      }

      window.DS_Storage.deleteProduct(code);
      DS_App.toast(`Product "${name}" deleted from IMS catalog`, 'info');
      this.populateOptions();
      this.populateDatalists();
      this.update();
    },

    purgeZeroStockProducts: function () {
      if (!window.DS_Auth || (!window.DS_Auth.isAdmin() && !window.DS_Auth.hasPermission('canManageProducts'))) {
        DS_App.toast('Permission Denied: Only Admin or IMS Manager can delete products!', 'error');
        return;
      }
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { stock: [] };
      const zeroItems = (db.stock || []).filter(p => Number(p.stock ?? p['Stock Quantity'] ?? 0) <= 0);
      if (zeroItems.length === 0) {
        DS_App.toast('No zero-stock or inactive products found in catalog.', 'info');
        return;
      }
      if (!confirm(`Found ${zeroItems.length} product(s) with 0 stock. Do you want to remove these unnecessary items from inventory? (क्या आप इन 0-स्टॉक वाले आइटम्स को हटाना चाहते हैं?)`)) {
        return;
      }
      const removed = window.DS_Storage.purgeZeroStockProducts();
      DS_App.toast(`Removed ${removed} unnecessary zero-stock product(s) from catalog`, 'success');
      this.populateOptions();
      this.populateDatalists();
      this.update();
    },

    // ============================================================
    // QUICK STOCK ADJUSTMENT MODAL
    // ============================================================
    openStockAdjust: function (code) {
      if (!window.DS_Auth || (!window.DS_Auth.isAdmin() && !window.DS_Auth.hasPermission('canAdjustStock'))) {
        DS_App.toast('Permission Denied: Only Admin or Warehouse Lead can adjust stock!', 'error');
        return;
      }

      const db = window.DS_Storage ? window.DS_Storage.getDB() : { stock: [] };
      const item = (db.stock || []).find(p => p.code === code || p['Item Code'] === code);
      if (!item) return;

      const current = n(item.stock ?? item['Stock Quantity'] ?? 0);
      const unit = item.unit || 'Pkt';

      document.getElementById('adjProdCode').value = code;
      document.getElementById('adjProdNameDisplay').textContent = `${item.name || item.Name} (${code})`;
      document.getElementById('adjProdCurrentStock').textContent = `${current} ${unit}`;
      document.getElementById('adjQty').value = '';
      document.getElementById('adjReason').value = '';
      document.getElementById('adjActionType').value = 'inward';

      this.updateAdjustPreview();
      DS_App.openModal('stockAdjustModal');
    },

    updateAdjustPreview: function () {
      const code = document.getElementById('adjProdCode').value;
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { stock: [] };
      const item = (db.stock || []).find(p => p.code === code || p['Item Code'] === code);
      if (!item) return;

      const current = n(item.stock ?? item['Stock Quantity'] ?? 0);
      const action = document.getElementById('adjActionType').value;
      const qty = n(document.getElementById('adjQty').value);
      const unit = item.unit || 'Pkt';

      let result = current;
      if (action === 'inward') {
        result = current + qty;
      } else if (action === 'outward') {
        result = Math.max(0, current - qty);
      } else if (action === 'set') {
        result = qty;
      }

      const previewEl = document.getElementById('adjResultPreview');
      if (previewEl) {
        previewEl.innerHTML = `Resulting Balance: <strong>${result} ${unit}</strong> (Change: ${result >= current ? '+' : ''}${result - current})`;
      }
    },

    handleSaveStockAdjust: function (e) {
      if (e) e.preventDefault();

      const code = document.getElementById('adjProdCode').value;
      const action = document.getElementById('adjActionType').value;
      const qty = n(document.getElementById('adjQty').value);
      const reason = document.getElementById('adjReason').value.trim();

      const db = window.DS_Storage ? window.DS_Storage.getDB() : { stock: [] };
      const item = (db.stock || []).find(p => p.code === code || p['Item Code'] === code);
      if (!item) return;

      const current = n(item.stock ?? item['Stock Quantity'] ?? 0);
      let delta = 0;

      if (action === 'inward') {
        delta = qty;
      } else if (action === 'outward') {
        delta = -qty;
      } else if (action === 'set') {
        delta = qty - current;
      }

      window.DS_Storage.adjustStock(code, delta, reason || `Manual ${action}`);
      DS_App.toast(`Stock adjusted for ${item.name || item.Name}: Balance now ${Math.max(0, current + delta)}`, 'success');
      DS_App.closeModal('stockAdjustModal');
      this.update();
    },

    exportExcel: function () {
      if (typeof XLSX === 'undefined') {
        DS_App.toast('SheetJS library not loaded', 'error');
        return;
      }
      const table = document.getElementById('stockTable');
      if (!table) return;
      const wb = XLSX.utils.table_to_book(table, { sheet: 'Stock Inventory' });
      XLSX.writeFile(wb, `DS_Enterprises_Stock_Inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
      DS_App.toast('Exported Stock Excel', 'success');
    },

    exportPDF: function () {
      if (typeof window.jspdf === 'undefined') {
        DS_App.toast('jsPDF library not available', 'error');
        return;
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('l', 'pt', 'a4');
      doc.setFontSize(16);
      doc.text('DS Enterprises — Stock Inventory Report', 30, 30);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 30, 45);

      const tableEl = document.getElementById('stockTable');
      if (tableEl && doc.autoTable) {
        doc.autoTable({
          html: tableEl,
          startY: 60,
          styles: { fontSize: 8, cellPadding: 3 },
          margin: { left: 30, right: 30 }
        });
        doc.save(`DS_Enterprises_Stock_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        DS_App.toast('Downloaded Stock PDF', 'success');
      }
    }
  };

  window.DS_Stock = DS_Stock;

  document.addEventListener('DOMContentLoaded', () => {
    DS_Stock.init();
  });
})(window);
