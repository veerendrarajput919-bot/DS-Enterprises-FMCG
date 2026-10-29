/**
 * ==========================================================================
 * DS ENTERPRISES — SALES ANALYSIS CONTROLLER (V7 ADVANCED ENGINE)
 * File: assets/js/sales.js
 * Architecture: Master Column O Ledger, Filtered Party Wise Pivot,
 * Margins, Returns, City_1 Outstanding Breakdown & Charts
 * ==========================================================================
 */

(function (window) {
  'use strict';

  let BRAND_CHART = null;
  let CITY1_CHART = null;
  let ACTIVE_FILTERED_ROWS = [];
  let CURRENT_PAGE = 1;
  const PAGE_SIZE = 50;
  let CURRENT_SORT = { key: 'date', dir: 'desc' };

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

  function v7DateOnly(v) {
    if (v instanceof Date && !isNaN(v)) return new Date(v.getFullYear(), v.getMonth(), v.getDate());
    if (typeof v === 'number' && Number.isFinite(v)) {
      try {
        if (typeof XLSX !== 'undefined' && XLSX.SSF) {
          const d = XLSX.SSF.parse_date_code(v);
          return new Date(d.y, d.m - 1, d.d);
        }
      } catch (e) {}
    }
    const s = String(v ?? '').trim();
    if (!s) return null;
    let m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    const d = new Date(s);
    return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function v7Ymd(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function v7SalesRange() {
    const p = document.getElementById('sPreset')?.value || 'month';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start = null, end = today;

    if (p === 'today') {
      start = today;
    } else if (p === 'yesterday') {
      start = new Date(today);
      start.setDate(start.getDate() - 1);
      end = start;
    } else if (p === '7days') {
      start = new Date(today);
      start.setDate(start.getDate() - 6);
    } else if (p === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (p === 'lastmonth') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (p === '3months') {
      start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    } else if (p === '6months') {
      start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
    } else if (p === '365days') {
      start = new Date(today);
      start.setDate(start.getDate() - 364);
    } else if (p === 'all') {
      start = null;
      end = null;
    } else if (p === 'custom') {
      start = v7DateOnly(document.getElementById('sFrom')?.value) || null;
      end = v7DateOnly(document.getElementById('sTo')?.value) || today;
    }
    return { start, end };
  }

  function unpaidSet() {
    const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
    return new Set((db.unpaid || []).map(x => String(x.invoice || x.billNo || x.invoiceNo || x.bill_no || x.invoice_no || '').trim()).filter(Boolean));
  }

  const DS_Sales = {
    init: function () {
      this.populateOptions();
      this.bindEvents();
      this.checkUrlParams();
      this.applyPreset();

      window.addEventListener('ds:db-updated', () => {
        this.populateOptions();
        this.update();
      });
    },

    checkUrlParams: function () {
      const p = new URLSearchParams(window.location.search);
      if (p.get('bill_no')) {
        const el = document.getElementById('sBillNo');
        if (el) el.value = p.get('bill_no');
      }
      if (p.get('invoice_no')) {
        const el = document.getElementById('sBillNo');
        if (el) el.value = p.get('invoice_no');
      }
      if (p.get('preset') || p.get('date_preset')) {
        const el = document.getElementById('sPreset');
        if (el) el.value = p.get('preset') || p.get('date_preset');
      }
      if (p.get('payment_status') || p.get('status')) {
        const el = document.getElementById('sStatus');
        if (el) el.value = p.get('payment_status') || p.get('status');
      }
      if (p.get('route')) {
        const el = document.getElementById('sRoute');
        if (el) el.value = p.get('route');
      }
      if (p.get('search') || p.get('q')) {
        const el = document.getElementById('sSearch');
        if (el) el.value = p.get('search') || p.get('q');
      }
    },

    bindEvents: function () {
      const preset = document.getElementById('sPreset');
      if (preset) {
        preset.addEventListener('change', () => this.applyPreset());
      }

      ['sFrom', 'sTo'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('change', () => {
            const p = document.getElementById('sPreset');
            if (p) p.value = 'custom';
            this.update();
          });
        }
      });

      ['sCity', 'sCity1', 'sRoute', 'sCat', 'sSubCat', 'sBrand', 'sSearch', 'sBillNo', 'sStatus'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('change', () => {
            CURRENT_PAGE = 1;
            this.update();
          });
          if (el.tagName === 'INPUT') {
            el.addEventListener('input', () => {
              CURRENT_PAGE = 1;
              this.update();
            });
          }
        }
      });

      if (window.DS_Filters && typeof window.DS_Filters.bindTableSorting === 'function') {
        window.DS_Filters.bindTableSorting('#salesTable', (key, dir) => {
          CURRENT_SORT = { key, dir };
          CURRENT_PAGE = 1;
          this.updateTableOnly();
        });
      }
    },

    resetFilters: function () {
      const p = document.getElementById('sPreset');
      if (p) p.value = 'month';
      ['sCity', 'sCity1', 'sRoute', 'sCat', 'sSubCat', 'sBrand', 'sSearch', 'sBillNo', 'sStatus'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      CURRENT_PAGE = 1;
      this.applyPreset();
    },

    applyPreset: function () {
      const p = document.getElementById('sPreset')?.value || 'month';
      const fromEl = document.getElementById('sFrom');
      const toEl = document.getElementById('sTo');
      const { start, end } = v7SalesRange();

      if (p !== 'custom' && fromEl && toEl) {
        fromEl.value = start ? v7Ymd(start) : '';
        toEl.value = end ? v7Ymd(end) : '';
      }
      this.update();
    },

    populateOptions: function () {
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { sales: [] };
      const s = db.sales || [];

      this.fillSelect('sCity', s.map(x => x.City || x.city));
      this.fillSelect('sCity1', s.map(x => x.City_1 || x.city1 || x.City || x.city));
      this.fillSelect('sRoute', s.map(x => x.Route || x.route));
      this.fillSelect('sCat', s.map(x => x['Party Category'] || x.category || x.partyCategory));
      this.fillSelect('sSubCat', s.map(x => x.subCategory || x['Sub Category'] || x.partySubCategory || x.itemSubCategory));
      this.fillSelect('sBrand', s.map(x => x.Brand || x.brand));
    },

    fillSelect: function (id, arr) {
      const el = document.getElementById(id);
      if (!el) return;
      const current = el.value;
      const unique = [...new Set((arr || []).filter(v => v !== '' && v !== null && v !== undefined).map(String))].sort((a, b) => a.localeCompare(b));
      el.innerHTML = '<option value="">All</option>' + unique.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
      if (unique.includes(current)) el.value = current;
    },

    getFilteredRows: function () {
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { sales: [] };
      const all = db.sales || [];
      const { start, end } = v7SalesRange();

      const city = document.getElementById('sCity')?.value || '';
      const city1 = document.getElementById('sCity1')?.value || '';
      const route = document.getElementById('sRoute')?.value || '';
      const cat = document.getElementById('sCat')?.value || '';
      const subCat = document.getElementById('sSubCat')?.value || '';
      const brand = document.getElementById('sBrand')?.value || '';
      const billFilter = String(document.getElementById('sBillNo')?.value || '').trim().toLowerCase();
      const statusFilter = String(document.getElementById('sStatus')?.value || '').trim().toLowerCase();
      const q = String(document.getElementById('sSearch')?.value || '').trim().toLowerCase();

      if (start && end && start > end) return [];
      const unpaid = unpaidSet();

      return all.filter(x => {
        const d = v7DateOnly(x.Date || x.date || x.invoice_date);
        if (start && (!d || d < start)) return false;
        if (end && (!d || d > end)) return false;

        const xCity = x.City || x.city || '';
        const xCity1 = x.City_1 || x.city1 || xCity;
        const xRoute = x.Route || x.route || '';
        const xCat = x['Party Category'] || x.category || x.partyCategory || '';
        const xSubCat = x.subCategory || x['Sub Category'] || x.partySubCategory || x.itemSubCategory || '';
        const xBrand = x.Brand || x.brand || '';
        const inv = String(x['Invoice No.'] || x.invoiceNo || x.invoice_no || '');
        const bill = String(x.bill_no || x.billNo || x['Bill No.'] || '');
        const party = x['Party Name'] || x.party || x.party_name || x.customer_name || '';
        const item = x['Item Name'] || x.item || x.item_name || x.product_name || '';

        if (city && String(xCity) !== city) return false;
        if (city1 && String(xCity1) !== city1) return false;
        if (route && String(xRoute) !== route) return false;
        if (cat && String(xCat) !== cat) return false;
        if (subCat && String(xSubCat) !== subCat) return false;
        if (brand && String(xBrand) !== brand) return false;

        // Bill / Invoice Number specific filter
        if (billFilter) {
          const matched = inv.toLowerCase().includes(billFilter) || bill.toLowerCase().includes(billFilter);
          if (!matched) return false;
        }

        // Payment status filter
        if (statusFilter) {
          const isUnpaid = unpaid.has(inv) || unpaid.has(bill) || String(x.status || x.payment_status || '').toLowerCase() === 'unpaid';
          if (statusFilter === 'unpaid' && !isUnpaid) return false;
          if (statusFilter === 'paid' && isUnpaid) return false;
        }

        if (q && ![inv, bill, party, item, xBrand, xRoute].map(v => String(v ?? '')).join(' ').toLowerCase().includes(q)) {
          return false;
        }
        return true;
      });
    },

    updateTableOnly: function () {
      const unpaid = unpaidSet();
      this.renderSalesDetailTable(ACTIVE_FILTERED_ROWS, unpaid);
    },

    update: function () {
      const rows = this.getFilteredRows();
      ACTIVE_FILTERED_ROWS = rows;
      const unpaid = unpaidSet();

      // Core Sales Metrics (Column O AmountNum or amount or total_amount)
      const totalAmount = rows.reduce((s, x) => s + (n(x.AmountNum) || n(x.amount) || n(x.total_amount)), 0);
      const totalQty = rows.reduce((s, x) => s + (n(x.QtyNum) || n(x.qty) || n(x.quantity)), 0);
      const uniqueInvoices = new Set(rows.map(x => String(x.bill_no || x['Invoice No.'] || x.invoiceNo || x.invoice_no || '').trim()).filter(Boolean)).size;
      const uniqueParties = new Set(rows.map(x => String(x['Party Name'] || x.party || x.party_name || '').trim()).filter(Boolean)).size;

      const unpaidValue = rows.filter(x => {
        const inv = String(x['Invoice No.'] || x.invoiceNo || x.invoice_no || '').trim();
        const bill = String(x.bill_no || x.billNo || x['Bill No.'] || '').trim();
        return unpaid.has(inv) || unpaid.has(bill) || String(x.status || x.payment_status || '').toLowerCase() === 'unpaid';
      }).reduce((s, x) => s + (n(x.AmountNum) || n(x.amount) || n(x.total_amount)), 0);

      const paidValue = totalAmount - unpaidValue;
      const totalMargin = rows.reduce((s, x) => s + n(x.Margin), 0);

      this.renderKpis({
        totalAmount,
        uniqueInvoices,
        totalQty,
        lines: rows.length,
        uniqueParties,
        paidValue,
        unpaidValue,
        totalMargin
      });

      this.renderCharts(rows);
      this.renderPartyFilteredSummary(rows);
      this.renderItemSalesAndMargin(rows);
      this.renderBrandSalesAndMargin(rows);
      this.renderReturns(rows);
      this.renderSalesDetailTable(rows, unpaid);
    },

    renderKpis: function (k) {
      const grid = document.getElementById('salesKpiGrid');
      if (!grid) return;

      const items = [
        ['Sales Value', DS_App.money(k.totalAmount), 'emerald'],
        ['Invoices', k.uniqueInvoices.toLocaleString('en-IN'), 'blue'],
        ['Total Qty', DS_App.qty(k.totalQty), 'blue'],
        ['Sales Lines', k.lines.toLocaleString('en-IN'), 'blue'],
        ['Parties / Outlets', k.uniqueParties.toLocaleString('en-IN'), 'blue'],
        ['Paid Value', DS_App.money(k.paidValue), 'emerald'],
        ['Unpaid Value', DS_App.money(k.unpaidValue), 'amber'],
        ['Gross Margin', DS_App.money(k.totalMargin), 'emerald']
      ];

      grid.innerHTML = items.map(it => `
        <div class="kpi-card ${it[2]}" style="padding:12px 14px;">
          <div class="kpi-label">${it[0]}</div>
          <div class="kpi-value" style="font-size:20px; font-weight:800;">${it[1]}</div>
        </div>
      `).join('');
    },

    renderCharts: function (rows) {
      // 1. Brand-wise sales chart
      const bm = new Map();
      rows.forEach(x => {
        const b = String(x.Brand || x.brand || 'Unmapped').trim() || 'Unmapped';
        bm.set(b, (bm.get(b) || 0) + (n(x.AmountNum) || n(x.amount)));
      });
      const topBrands = [...bm.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

      const brandCanvas = document.getElementById('salesBrandChart');
      if (brandCanvas && typeof Chart !== 'undefined') {
        if (BRAND_CHART) BRAND_CHART.destroy();
        BRAND_CHART = new Chart(brandCanvas, {
          type: 'bar',
          data: {
            labels: topBrands.map(x => x[0]),
            datasets: [{
              label: 'Sales Turnover (₹)',
              data: topBrands.map(x => x[1]),
              backgroundColor: '#1e5eff',
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

      // 2. City_1 Outstanding Doughnut + Right-side List Table
      const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
      const unpaid = unpaidSet();
      const unpaidRows = (db.sales || []).filter(x => unpaid.has(String(x['Invoice No.'] || x.invoiceNo || '').trim()));
      const cm = new Map();
      unpaidRows.forEach(x => {
        const c1 = String(x.City_1 || x.city1 || 'Unmapped').trim() || 'Unmapped';
        cm.set(c1, (cm.get(c1) || 0) + (n(x.AmountNum) || n(x.amount)));
      });
      const topCities = [...cm.entries()].sort((a, b) => b[1] - a[1]);

      const cityCanvas = document.getElementById('salesCity1OutstandingChart');
      if (cityCanvas && typeof Chart !== 'undefined') {
        if (CITY1_CHART) CITY1_CHART.destroy();
        CITY1_CHART = new Chart(cityCanvas, {
          type: 'doughnut',
          data: {
            labels: topCities.map(x => x[0]),
            datasets: [{
              data: topCities.map(x => x[1]),
              backgroundColor: ['#0284c7', '#0d9488', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } }
            }
          }
        });
      }

      const cTable = document.getElementById('salesCity1OutstandingTable')?.querySelector('tbody');
      if (cTable) {
        cTable.innerHTML = topCities.map(c => `
          <tr>
            <td><strong>${esc(c[0])}</strong></td>
            <td class="num font-mono"><strong>${DS_App.money(c[1])}</strong></td>
          </tr>
        `).join('') || '<tr><td colspan="2" class="muted text-center">No outstanding records</td></tr>';
      }
    },

    renderPartyFilteredSummary: function (rows) {
      const tbody = document.getElementById('partySaleTable')?.querySelector('tbody');
      if (!tbody) return;

      const pm = new Map();
      rows.forEach(x => {
        const p = String(x['Party Name'] || x.party || 'Unmapped').trim() || 'Unmapped';
        const o = pm.get(p) || { qty: 0, amount: 0 };
        o.qty += (n(x.QtyNum) || n(x.qty));
        o.amount += (n(x.AmountNum) || n(x.amount));
        pm.set(p, o);
      });

      const sorted = [...pm.entries()].sort((a, b) => b[1].amount - a[1].amount);
      const grandQty = sorted.reduce((s, it) => s + it[1].qty, 0);
      const grandAmt = sorted.reduce((s, it) => s + it[1].amount, 0);

      let html = sorted.map(it => `
        <tr>
          <td><strong>${esc(it[0])}</strong></td>
          <td class="num">${DS_App.qty(it[1].qty)}</td>
          <td class="num font-mono"><strong>${DS_App.money(it[1].amount)}</strong></td>
        </tr>
      `).join('');

      if (sorted.length) {
        html += `
          <tr style="background:#f1f5f9; font-weight:800; border-top:2px solid #cbd5e1;">
            <td>GRAND TOTAL</td>
            <td class="num">${DS_App.qty(grandQty)}</td>
            <td class="num font-mono">${DS_App.money(grandAmt)}</td>
          </tr>
        `;
      } else {
        html = '<tr><td colspan="3" class="muted text-center" style="padding:16px;">No sales records matching criteria</td></tr>';
      }
      tbody.innerHTML = html;
    },

    renderItemSalesAndMargin: function (rows) {
      const tbody = document.getElementById('itemSaleTable')?.querySelector('tbody');
      if (!tbody) return;

      const im = new Map();
      rows.forEach(x => {
        const item = String(x['Item Name'] || x.item || 'Unmapped').trim();
        const o = im.get(item) || { qty: 0, amount: 0, margin: 0 };
        o.qty += (n(x.QtyNum) || n(x.qty));
        o.amount += (n(x.AmountNum) || n(x.amount));
        o.margin += n(x.Margin);
        im.set(item, o);
      });

      const sorted = [...im.entries()].sort((a, b) => b[1].qty - a[1].qty);
      tbody.innerHTML = sorted.map(it => {
        const mPct = it[1].amount ? (it[1].margin / it[1].amount * 100).toFixed(2) : '0.00';
        return `
          <tr>
            <td><strong>${esc(it[0])}</strong></td>
            <td class="num">${DS_App.qty(it[1].qty)}</td>
            <td class="num font-mono">${DS_App.money(it[1].amount)}</td>
            <td class="num font-mono" style="color:#166534;">${DS_App.money(it[1].margin)}</td>
            <td class="num">${mPct}%</td>
          </tr>
        `;
      }).join('') || '<tr><td colspan="5" class="muted text-center">No item records found</td></tr>';
    },

    renderBrandSalesAndMargin: function (rows) {
      const tbody = document.getElementById('brandSaleTable')?.querySelector('tbody');
      if (!tbody) return;

      const bm = new Map();
      rows.forEach(x => {
        const brand = String(x.Brand || x.brand || 'Unmapped').trim() || 'Unmapped';
        const o = bm.get(brand) || { qty: 0, amount: 0, margin: 0 };
        o.qty += (n(x.QtyNum) || n(x.qty));
        o.amount += (n(x.AmountNum) || n(x.amount));
        o.margin += n(x.Margin);
        bm.set(brand, o);
      });

      const sorted = [...bm.entries()].sort((a, b) => b[1].amount - a[1].amount);
      tbody.innerHTML = sorted.map(it => {
        const mPct = it[1].amount ? (it[1].margin / it[1].amount * 100).toFixed(2) : '0.00';
        return `
          <tr>
            <td><strong>${esc(it[0])}</strong></td>
            <td class="num">${DS_App.qty(it[1].qty)}</td>
            <td class="num font-mono">${DS_App.money(it[1].amount)}</td>
            <td class="num font-mono" style="color:#166534;">${DS_App.money(it[1].margin)}</td>
            <td class="num">${mPct}%</td>
          </tr>
        `;
      }).join('') || '<tr><td colspan="5" class="muted text-center">No brand records found</td></tr>';
    },

    renderReturns: function (rows) {
      const itemBody = document.getElementById('returnItemTable')?.querySelector('tbody');
      const brandBody = document.getElementById('returnBrandTable')?.querySelector('tbody');

      const ri = new Map(), rb = new Map();
      rows.forEach(x => {
        const q = n(x.QtyNum) || n(x.qty);
        const v = n(x.AmountNum) || n(x.amount);
        if (q < 0 || v < 0) {
          const item = String(x['Item Name'] || x.item || 'Unmapped').trim();
          const brand = String(x.Brand || x.brand || 'Unmapped').trim();

          const io = ri.get(item) || { qty: 0, val: 0 };
          io.qty += Math.abs(q); io.val += Math.abs(v);
          ri.set(item, io);

          const bo = rb.get(brand) || { qty: 0, val: 0 };
          bo.qty += Math.abs(q); bo.val += Math.abs(v);
          rb.set(brand, bo);
        }
      });

      if (itemBody) {
        const sortedItems = [...ri.entries()].sort((a, b) => b[1].qty - a[1].qty);
        itemBody.innerHTML = sortedItems.map(it => `
          <tr>
            <td><strong>${esc(it[0])}</strong></td>
            <td class="num font-mono" style="color:#b91c1c;">${DS_App.qty(it[1].qty)}</td>
            <td class="num font-mono" style="color:#b91c1c;">${DS_App.money(it[1].val)}</td>
          </tr>
        `).join('') || '<tr><td colspan="3" class="muted text-center">No return records found</td></tr>';
      }

      if (brandBody) {
        const sortedBrands = [...rb.entries()].sort((a, b) => b[1].qty - a[1].qty);
        brandBody.innerHTML = sortedBrands.map(it => `
          <tr>
            <td><strong>${esc(it[0])}</strong></td>
            <td class="num font-mono" style="color:#b91c1c;">${DS_App.qty(it[1].qty)}</td>
            <td class="num font-mono" style="color:#b91c1c;">${DS_App.money(it[1].val)}</td>
          </tr>
        `).join('') || '<tr><td colspan="3" class="muted text-center">No return records found</td></tr>';
      }
    },

    renderSalesDetailTable: function (rows, unpaid) {
      const tbody = document.getElementById('salesTable')?.querySelector('tbody');
      const ctx = document.getElementById('salesTableContext');
      if (!tbody) return;

      // Sort rows according to CURRENT_SORT
      const sorted = [...rows].sort((a, b) => {
        let va, vb;
        if (CURRENT_SORT.key === 'date') {
          va = a.Date || a.date || '';
          vb = b.Date || b.date || '';
          return CURRENT_SORT.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        } else if (CURRENT_SORT.key === 'bill_no') {
          va = a.bill_no || a['Invoice No.'] || a.invoiceNo || '';
          vb = b.bill_no || b['Invoice No.'] || b.invoiceNo || '';
          return CURRENT_SORT.dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
        } else if (CURRENT_SORT.key === 'party') {
          va = a['Party Name'] || a.party || '';
          vb = b['Party Name'] || b.party || '';
          return CURRENT_SORT.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        } else if (CURRENT_SORT.key === 'item') {
          va = a['Item Name'] || a.item || '';
          vb = b['Item Name'] || b.item || '';
          return CURRENT_SORT.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        } else if (CURRENT_SORT.key === 'brand') {
          va = a.Brand || a.brand || '';
          vb = b.Brand || b.brand || '';
          return CURRENT_SORT.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        } else if (CURRENT_SORT.key === 'qty') {
          va = n(a.QtyNum) || n(a.qty);
          vb = n(b.QtyNum) || n(b.qty);
          return CURRENT_SORT.dir === 'asc' ? va - vb : vb - va;
        } else if (CURRENT_SORT.key === 'amount') {
          va = n(a.AmountNum) || n(a.amount);
          vb = n(b.AmountNum) || n(b.amount);
          return CURRENT_SORT.dir === 'asc' ? va - vb : vb - va;
        } else if (CURRENT_SORT.key === 'margin') {
          va = n(a.Margin);
          vb = n(b.Margin);
          return CURRENT_SORT.dir === 'asc' ? va - vb : vb - va;
        }
        return 0;
      });

      // Pagination calculation
      const totalRecords = sorted.length;
      const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
      if (CURRENT_PAGE > totalPages) CURRENT_PAGE = totalPages;
      const startIdx = (CURRENT_PAGE - 1) * PAGE_SIZE;
      const pageRows = sorted.slice(startIdx, startIdx + PAGE_SIZE);

      if (ctx) {
        ctx.innerHTML = `Showing <strong>${startIdx + 1}–${Math.min(startIdx + PAGE_SIZE, totalRecords)}</strong> of <strong>${totalRecords.toLocaleString('en-IN')}</strong> records (Page ${CURRENT_PAGE}/${totalPages})`;
      }

      tbody.innerHTML = pageRows.map(r => {
        const inv = String(r['Invoice No.'] || r.invoiceNo || r.invoice_no || '').trim();
        const bill = String(r.bill_no || r.billNo || r['Bill No.'] || '').trim();
        const displayNo = bill ? (bill + (inv && inv !== bill ? ' / ' + inv : '')) : (inv || '-');
        const isUnpaid = unpaid.has(inv) || unpaid.has(bill) || String(r.status || r.payment_status || '').toLowerCase() === 'unpaid';
        const amt = n(r.AmountNum) || n(r.amount) || n(r.total_amount);
        const qty = n(r.QtyNum) || n(r.qty) || n(r.quantity);
        const dateStr = r.Date || r.date || r.invoice_date || '-';
        const partyStr = r['Party Name'] || r.party || r.party_name || '-';
        const itemStr = r['Item Name'] || r.item || r.item_name || '-';

        return `
          <tr>
            <td>${dateStr}</td>
            <td><strong>${esc(displayNo)}</strong></td>
            <td><strong>${esc(partyStr)}</strong></td>
            <td>${esc(itemStr)}</td>
            <td><span class="badge" style="background:#e0f2fe; color:#0369a1;">${esc(r.Brand || r.brand || '-')}</span></td>
            <td>${esc(r.City || r.city || '-')}</td>
            <td>${esc(r.City_1 || r.city1 || r.City || r.city || '-')}</td>
            <td>${esc(r.Route || r.route || '-')}</td>
            <td class="num">${DS_App.qty(qty)}</td>
            <td class="num font-mono"><strong>${DS_App.money(amt)}</strong></td>
            <td class="num font-mono">${DS_App.money(r.Margin)}</td>
            <td>
              <span class="badge ${isUnpaid ? 'badge-danger' : 'badge-success'}" style="${isUnpaid ? 'background:#fee2e2; color:#991b1b;' : 'background:#dcfce7; color:#166534;'}">
                ${isUnpaid ? 'Unpaid' : 'Paid'}
              </span>
            </td>
          </tr>
        `;
      }).join('') || '<tr><td colspan="12" class="muted text-center" style="padding:24px;">No sales records found matching the active filters</td></tr>';

      // Render pagination controls
      if (window.DS_Filters && typeof window.DS_Filters.renderPagination === 'function') {
        window.DS_Filters.renderPagination('salesPaginationBar', {
          page: CURRENT_PAGE,
          total_pages: totalPages,
          total_records: totalRecords,
          limit: PAGE_SIZE
        }, (newPage) => {
          CURRENT_PAGE = newPage;
          this.updateTableOnly();
        });
      }
    },

    exportCSV: function () {
      if (!ACTIVE_FILTERED_ROWS.length) {
        DS_App.toast('No sales records to export', 'warning');
        return;
      }

      function safeCsv(v) {
        let s = String(v ?? '').trim();
        if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
        return `"${s.replace(/"/g, '""')}"`;
      }

      const headers = ['Date', 'Invoice / Bill No', 'Party Name', 'Item Name', 'Brand', 'City', 'City_1', 'Route', 'Qty', 'Sales Amount', 'Margin', 'Status'];
      const unpaid = unpaidSet();
      const csvRows = [headers.join(',')];

      ACTIVE_FILTERED_ROWS.forEach(r => {
        const inv = String(r['Invoice No.'] || r.invoiceNo || r.invoice_no || '').trim();
        const bill = String(r.bill_no || r.billNo || r['Bill No.'] || '').trim();
        const unifiedNo = bill || inv || '-';
        const isUnpaid = unpaid.has(inv) || unpaid.has(bill) || String(r.status || r.payment_status || '').toLowerCase() === 'unpaid';

        const row = [
          safeCsv(r.Date || r.date || r.invoice_date || ''),
          safeCsv(unifiedNo),
          safeCsv(r['Party Name'] || r.party || r.party_name || ''),
          safeCsv(r['Item Name'] || r.item || r.item_name || ''),
          safeCsv(r.Brand || r.brand || ''),
          safeCsv(r.City || r.city || ''),
          safeCsv(r.City_1 || r.city1 || r.City || r.city || ''),
          safeCsv(r.Route || r.route || ''),
          n(r.QtyNum) || n(r.qty) || n(r.quantity),
          n(r.AmountNum) || n(r.amount) || n(r.total_amount),
          n(r.Margin),
          safeCsv(isUnpaid ? 'Unpaid' : 'Paid')
        ];
        csvRows.push(row.join(','));
      });

      const blob = new Blob(['\ufeff' + csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `DS_Enterprises_Sales_Export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      DS_App.toast(`✓ Exported ${ACTIVE_FILTERED_ROWS.length} sales rows to CSV`, 'success');
    },

    exportPDF: function () {
      if (typeof window.jspdf === 'undefined') {
        DS_App.toast('jsPDF library not available', 'error');
        return;
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('l', 'pt', 'a4');
      doc.setFontSize(16);
      doc.text('DS Enterprises — Sales Analysis Report', 30, 30);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 30, 45);

      const tableEl = document.getElementById('salesTable');
      if (tableEl && doc.autoTable) {
        doc.autoTable({
          html: tableEl,
          startY: 60,
          styles: { fontSize: 8, cellPadding: 3 },
          margin: { left: 30, right: 30 }
        });
        doc.save(`DS_Enterprises_Sales_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        DS_App.toast('Downloaded Sales PDF', 'success');
      }
    }
  };

  window.DS_Sales = DS_Sales;

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('salesTable') || document.getElementById('salesKpiGrid') || document.getElementById('sPreset')) {
      DS_Sales.init();
    }
  });
})(window);
