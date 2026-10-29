/**
 * ==========================================================================
 * DS ENTERPRISES — DISPATCH, APPROVAL & LOADING SHEET CONTROLLER
 * File: assets/js/dispatch.js
 * Architecture: Order Lifecycle Pipeline, Dispatch Challan & Van Manifest
 * ==========================================================================
 */

(function (window) {
  'use strict';

  const DS_Dispatch = {
    initApproval: function () {
      this.populateApprovalDropdowns();
      this.bindApprovalEvents();
      this.renderApprovalTable();
    },

    populateApprovalRoutes: function () {
      this.populateApprovalDropdowns();
    },

    populateApprovalDropdowns: function () {
      const orders = window.DS_Storage ? window.DS_Storage.getOrders() : [];
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { party: [], sales: [] };
      const parties = db.party || [];
      const sales = db.sales || [];

      const fillSel = (id, items) => {
        const el = document.getElementById(id);
        if (!el) return;
        const cur = el.value;
        el.innerHTML = '<option value="">All</option>' + items.map(v => `<option value="${DS_App.escapeHtml(v)}">${DS_App.escapeHtml(v)}</option>`).join('');
        if (cur && items.includes(cur)) el.value = cur;
      };

      // Routes
      const routeSet = new Set();
      orders.forEach(o => { if (o.route) routeSet.add(o.route); });
      parties.forEach(p => { if (p.route) routeSet.add(p.route); });
      const routeSel = document.getElementById('approvalFilterRoute');
      if (routeSel) {
        const curR = routeSel.value;
        const routes = [...routeSet].filter(Boolean).sort();
        routeSel.innerHTML = '<option value="">All</option>' + routes.map(r => `
          <option value="${DS_App.escapeHtml(r)}" ${curR === r ? 'selected' : ''}>${DS_App.escapeHtml(r)}</option>
        `).join('');
      }

      // Cities, City1, Categories, Brands
      const cities = Array.from(new Set(parties.map(p => p.city).filter(Boolean))).sort();
      const city1s = Array.from(new Set(parties.map(p => p.city1).filter(Boolean))).sort();
      const cats = Array.from(new Set(parties.map(p => p.category).filter(Boolean))).sort();
      const subCats = Array.from(new Set([
        ...parties.map(p => p.subCategory || p['Sub Category']),
        ...sales.map(s => s.subCategory || s['Sub Category'] || s.partySubCategory || s.itemSubCategory),
        ...orders.map(o => o.subCategory || o.partySubCategory)
      ].filter(Boolean))).sort();

      const brandSet = new Set();
      orders.forEach(o => {
        if (o.items && Array.isArray(o.items)) {
          o.items.forEach(i => { if (i.brand) brandSet.add(i.brand); });
        }
      });
      sales.forEach(s => { if (s.brand) brandSet.add(s.brand); });
      const brands = Array.from(brandSet).filter(Boolean).sort();

      fillSel('approvalCity', cities);
      fillSel('approvalCity1', city1s);
      fillSel('approvalCategory', cats);
      fillSel('approvalSubCategory', subCats);
      fillSel('approvalBrand', brands);
    },

    bindApprovalEvents: function () {
      const preset = document.getElementById('approvalPreset');
      if (preset && !preset._bound) {
        preset._bound = true;
        preset.addEventListener('change', () => {
          this.applyApprovalPreset(preset.value);
          this.renderApprovalTable();
        });
      }

      ['approvalFrom', 'approvalTo'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el._bound) {
          el._bound = true;
          el.addEventListener('change', () => {
            const p = document.getElementById('approvalPreset');
            if (p) p.value = 'custom';
            this.renderApprovalTable();
          });
        }
      });

      ['approvalCity', 'approvalCity1', 'approvalFilterRoute', 'approvalCategory', 'approvalSubCategory', 'approvalBrand', 'approvalPayment', 'approvalFilterStatus'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el._bound) {
          el._bound = true;
          el.addEventListener('change', () => this.renderApprovalTable());
        }
      });

      ['approvalBillNo', 'approvalFilterSearch'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el._bound) {
          el._bound = true;
          el.addEventListener('input', () => this.renderApprovalTable());
        }
      });
    },

    applyApprovalPreset: function (val) {
      const f = document.getElementById('approvalFrom');
      const t = document.getElementById('approvalTo');
      if (!f || !t) return;
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const d = now.getDate();
      const pad = n => String(n).padStart(2, '0');
      const fmt = dt => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

      if (val === 'today') {
        f.value = fmt(now);
        t.value = fmt(now);
      } else if (val === 'yesterday') {
        const yest = new Date(y, m, d - 1);
        f.value = fmt(yest);
        t.value = fmt(yest);
      } else if (val === '7days') {
        const d7 = new Date(y, m, d - 6);
        f.value = fmt(d7);
        t.value = fmt(now);
      } else if (val === 'this_month' || val === 'month') {
        f.value = fmt(new Date(y, m, 1));
        t.value = fmt(now);
      } else if (val === 'lastmonth') {
        f.value = fmt(new Date(y, m - 1, 1));
        t.value = fmt(new Date(y, m, 0));
      } else if (val === '3months') {
        f.value = fmt(new Date(y, m - 2, 1));
        t.value = fmt(now);
      } else if (val === '6months') {
        f.value = fmt(new Date(y, m - 5, 1));
        t.value = fmt(now);
      } else if (val === '365days') {
        const d365 = new Date(y, m, d - 365);
        f.value = fmt(d365);
        t.value = fmt(now);
      } else if (val === 'all') {
        f.value = '';
        t.value = '';
      }
    },

    resetFilters: function () {
      const p = document.getElementById('approvalPreset'); if (p) p.value = 'all';
      const f = document.getElementById('approvalFrom'); if (f) f.value = '';
      const t = document.getElementById('approvalTo'); if (t) t.value = '';
      const c = document.getElementById('approvalCity'); if (c) c.value = '';
      const c1 = document.getElementById('approvalCity1'); if (c1) c1.value = '';
      const r = document.getElementById('approvalFilterRoute'); if (r) r.value = '';
      const cat = document.getElementById('approvalCategory'); if (cat) cat.value = '';
      const subCat = document.getElementById('approvalSubCategory'); if (subCat) subCat.value = '';
      const b = document.getElementById('approvalBrand'); if (b) b.value = '';
      const bn = document.getElementById('approvalBillNo'); if (bn) bn.value = '';
      const pay = document.getElementById('approvalPayment'); if (pay) pay.value = '';
      const st = document.getElementById('approvalFilterStatus'); if (st) st.value = '';
      const s = document.getElementById('approvalFilterSearch'); if (s) s.value = '';
      this.renderApprovalTable();
    },

    initChallan: function () {
      this.populateOrderSelect();
      this.checkUrlParams();
    },

    initLoadingSheet: function () {
      this.populateRoutes();
      this.renderLoadingSheet();
    },

    checkUrlParams: function () {
      const urlParams = new URLSearchParams(window.location.search);
      const orderId = urlParams.get('order');
      if (orderId) {
        this.renderChallanForOrder(orderId);
      }
    },

    // ========================================================================
    // ORDER APPROVAL PIPELINE
    // ========================================================================
    renderApprovalTable: function () {
      const tbody = document.getElementById('orderApprovalTableBody');
      if (!tbody) return;

      const orders = window.DS_Storage ? window.DS_Storage.getOrders() : [];
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { party: [] };
      const partyMap = {};
      (db.party || []).forEach(p => { if (p && p.name) partyMap[p.name] = p; });

      // Read filter inputs
      const search = (document.getElementById('approvalFilterSearch')?.value || '').toLowerCase().trim();
      const from = document.getElementById('approvalFrom')?.value || '';
      const to = document.getElementById('approvalTo')?.value || '';
      const city = document.getElementById('approvalCity')?.value || '';
      const city1 = document.getElementById('approvalCity1')?.value || '';
      const routeFilter = document.getElementById('approvalFilterRoute')?.value || '';
      const categoryFilter = document.getElementById('approvalCategory')?.value || '';
      const subCategoryFilter = document.getElementById('approvalSubCategory')?.value || '';
      const brandFilter = document.getElementById('approvalBrand')?.value || '';
      const billNoFilter = (document.getElementById('approvalBillNo')?.value || '').toLowerCase().trim();
      const paymentFilter = document.getElementById('approvalPayment')?.value || '';
      const statusFilter = document.getElementById('approvalFilterStatus')?.value || '';

      let filtered = [...orders].reverse().filter(o => {
        const orderDate = (o.date || '').slice(0, 10);

        // Date Range
        if (from && orderDate && orderDate < from) return false;
        if (to && orderDate && orderDate > to) return false;

        const storeName = o.storeName || o.party;
        const store = partyMap[storeName];

        // City
        if (city && (!store || store.city !== city)) return false;

        // City 1
        if (city1 && (!store || store.city1 !== city1)) return false;

        // Route Filter
        if (routeFilter && o.route !== routeFilter && (!store || store.route !== routeFilter)) return false;

        // Category Filter
        if (categoryFilter && (!store || store.category !== categoryFilter)) return false;

        // Sub Category Filter
        const storeSubCat = store?.subCategory || store?.['Sub Category'] || o.subCategory || o.partySubCategory || '';
        if (subCategoryFilter && storeSubCat !== subCategoryFilter) return false;

        // Brand Filter
        if (brandFilter) {
          const hasBrandInItems = o.items && Array.isArray(o.items) && o.items.some(i => i.brand === brandFilter);
          const hasBrandDirect = o.brand === brandFilter;
          if (!hasBrandInItems && !hasBrandDirect) return false;
        }

        // Bill / Inv No Filter
        if (billNoFilter) {
          const matchBill = [
            o.id,
            o.bill_no,
            o.billNo,
            o.invoice_no,
            o.invoiceNo
          ].filter(Boolean).some(b => String(b).toLowerCase().includes(billNoFilter));
          if (!matchBill) return false;
        }

        // Payment Filter
        if (paymentFilter) {
          const isPaid = (o.paymentStatus === 'Paid' || o.paid === true);
          if (paymentFilter === 'Paid' && !isPaid) return false;
          if (paymentFilter === 'Unpaid' && isPaid) return false;
        }

        // Status Filter
        if (statusFilter) {
          const st = String(o.status || 'Pending').toLowerCase();
          if (statusFilter === 'all_cancelled') {
            const isCanc = st.includes('cancel') || o.cancelType;
            if (!isCanc) return false;
          } else if (statusFilter.includes('Customer')) {
            if (!st.includes('customer') && !st.includes('party') && o.cancelType !== 'party') return false;
          } else if (statusFilter.includes('Company') || statusFilter.includes('Own')) {
            if (!st.includes('company') && !st.includes('admin') && !st.includes('own') && o.cancelType !== 'own') return false;
          } else if (statusFilter === 'Pending') {
            if (st !== 'pending' && st !== 'submitted') return false;
          } else if (statusFilter === 'Confirmed') {
            if (st !== 'confirmed' && st !== 'approved') return false;
          } else {
            if (st !== statusFilter.toLowerCase()) return false;
          }
        }

        // Search Filter
        if (search) {
          const itemsText = (o.items && Array.isArray(o.items)) ? o.items.map(i => `${i.name || ''} ${i.item || ''} ${i.brand || ''}`).join(' ') : '';
          const str = [
            o.id,
            o.bill_no,
            o.billNo,
            o.invoice_no,
            o.invoiceNo,
            o.storeName,
            o.party,
            o.route,
            o.salesPerson,
            o.location,
            o.cancelReason,
            o.cancelRemark,
            itemsText
          ].filter(Boolean).join(' ').toLowerCase();

          if (!str.includes(search)) return false;
        }

        return true;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:24px; color:var(--ds-text-muted);">No orders match the selected filters.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(o => {
        const st = o.status || 'Pending';
        let badgeClass = 'badge-submitted';
        let badgeText = st;
        let noteHtml = '';

        if (st === 'Cancelled by Customer' || st === 'Cancelled by Party' || o.cancelType === 'party') {
          badgeClass = 'badge-cancelled-by-party';
          badgeText = '❌ Cancelled (Customer)';
          const r = o.cancelReason || o.cancelRemark || 'Customer Refused';
          noteHtml = `<div class="cancel-reason-note" title="${DS_App.escapeHtml(r)}">📝 ${DS_App.escapeHtml(r)}</div>`;
        } else if (st === 'Cancelled by Company/Admin' || st === 'Cancelled by Own' || o.cancelType === 'own') {
          badgeClass = 'badge-cancelled-by-own';
          badgeText = '⚠️ Cancelled (Company)';
          const r = o.cancelReason || o.cancelRemark || 'Company / Stock Issue';
          noteHtml = `<div class="cancel-reason-note own" title="${DS_App.escapeHtml(r)}">📝 ${DS_App.escapeHtml(r)}</div>`;
        } else if (st === 'Delivered') {
          badgeClass = 'badge-delivered';
          badgeText = 'Delivered';
        } else if (st === 'Dispatched') {
          badgeClass = 'badge-dispatched';
          badgeText = 'Dispatched';
        } else if (st === 'Ready for Delivery') {
          badgeClass = 'badge-ready';
          badgeText = 'Ready for Delivery';
        } else if (st === 'Processing') {
          badgeClass = 'badge-processing';
          badgeText = 'Processing';
        } else if (st === 'Confirmed' || st === 'Approved') {
          badgeClass = 'badge-approved';
          badgeText = 'Confirmed';
        } else {
          badgeClass = 'badge-submitted';
          badgeText = 'Pending';
        }

        const isCancelled = st.includes('Cancelled') || o.cancelType;

        return `
          <tr>
            <td>
              <button type="button" class="btn btn-link" onclick="if (window.DS_Orders) DS_Orders.viewOrderDetails('${o.id}')" style="padding:0; font-weight:800; font-size:13px; color:var(--ds-primary); text-decoration:none;" title="Click to view full order manifest">
                ${o.id}
              </button>
            </td>
            <td>
              <span class="badge" style="background:#eff6ff; color:#1d4ed8; font-size:11.5px; font-weight:700; font-family:monospace; padding:3px 8px; border-radius:6px;" title="Invoice / Bill No.">
                🧾 ${DS_App.escapeHtml(o.invoice_no || o.bill_no || o.invoiceNo || o.billNo || 'Pending')}
              </span>
            </td>
            <td>${DS_App.formatDate(o.date)}</td>
            <td>
              <strong>${DS_App.escapeHtml(o.storeName || o.party)}</strong>
              ${o.location ? `<div style="font-size:11px; color:var(--ds-text-muted);">${DS_App.escapeHtml(o.location)}</div>` : ''}
            </td>
            <td>${DS_App.escapeHtml(o.route || '-')}</td>
            <td class="num"><strong>${DS_App.money(o.total)}</strong></td>
            <td>
              <span class="badge ${badgeClass}">${badgeText}</span>
              ${noteHtml}
            </td>
            <td>
              ${canApprove ? `
                <select id="statusSelect_${o.id}" onchange="DS_Dispatch.changeStatus('${o.id}', this.value)" style="padding:4px 8px; border-radius:6px; font-size:12px; font-weight:700;">
                  <option value="Pending" ${(st==='Pending'||st==='Submitted')?'selected':''}>1. Pending</option>
                  <option value="Confirmed" ${(st==='Confirmed'||st==='Approved')?'selected':''}>2. Confirmed</option>
                  <option value="Processing" ${st==='Processing'?'selected':''}>3. Processing</option>
                  <option value="Ready for Delivery" ${st==='Ready for Delivery'?'selected':''}>4. Ready for Delivery</option>
                  <option value="Dispatched" ${st==='Dispatched'?'selected':''}>5. Dispatched</option>
                  <option value="Delivered" ${st==='Delivered'?'selected':''}>6. Delivered</option>
                  <option value="Cancelled by Customer" ${(st==='Cancelled by Customer'||st==='Cancelled by Party')?'selected':''}>7. Cancelled by Customer</option>
                  <option value="Cancelled by Company/Admin" ${(st==='Cancelled by Company/Admin'||st==='Cancelled by Own')?'selected':''}>8. Cancelled by Company/Admin</option>
                </select>
              ` : `<span style="font-size:11px; color:var(--ds-text-muted);">Read-Only</span>`}
            </td>
            <td>
              <div style="display:flex; gap:4px; flex-wrap:wrap;">
                <a href="dispatch-challan.html?order=${encodeURIComponent(o.id)}" class="btn btn-secondary btn-sm" style="font-size:11px; padding:3px 7px;">Challan</a>
                ${!isCancelled && canApprove ? `
                  <button type="button" class="btn btn-danger btn-sm" onclick="if (window.DS_Orders) DS_Orders.openCancelOrderModal('${o.id}')" style="font-size:11px; padding:3px 7px; background:#fff1f2; color:#be123c; border:1px solid #fecdd3;" title="Cancel with reason remark">
                    ❌ Cancel
                  </button>
                ` : isCancelled ? `
                  <button type="button" class="btn btn-secondary btn-sm" onclick="if (window.DS_Orders) DS_Orders.viewOrderDetails('${o.id}')" style="font-size:11px; padding:3px 7px;" title="View cancellation note">
                    📝 Note
                  </button>
                  ${(window.DS_Auth && window.DS_Auth.isAdmin()) ? `
                    <button type="button" class="btn btn-success btn-sm" onclick="if (window.DS_Orders) DS_Orders.reopenOrder('${o.id}')" style="font-size:11px; padding:3px 7px; background:#dcfce7; color:#15803d; border:1px solid #86efac;" title="Reopen Cancelled Order">
                      ↺ Reopen
                    </button>
                  ` : ''}
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    changeStatus: async function (orderId, newStatus) {
      if (!window.DS_Auth.isAdmin() && !window.DS_Auth.hasPermission('canApproveOrders')) {
        DS_App.toast('Permission Denied: Order Approval permission required to update status!', 'error');
        this.renderApprovalTable();
        return;
      }

      const orders = window.DS_Storage.getOrders();
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const isCurrentlyCancelled = (order.status || '').includes('Cancelled') || order.cancelType;

      // Prevent cancelled orders from being dispatched or delivered without explicit admin reopening
      if (isCurrentlyCancelled && (newStatus === 'Dispatched' || newStatus === 'Delivered' || newStatus === 'Ready for Delivery')) {
        alert('❌ Cannot dispatch or deliver a cancelled order! An authorized admin must explicitly reopen the order first.');
        this.renderApprovalTable();
        return;
      }

      // If user selected Cancelled by Customer or Cancelled by Company/Admin, open the cancellation modal
      if (newStatus.includes('Cancelled')) {
        if (window.DS_Orders && typeof window.DS_Orders.openCancelOrderModal === 'function') {
          window.DS_Orders.openCancelOrderModal(orderId, newStatus);
          return;
        }
      }

      // Sync with backend API
      if (window.DS_API && typeof window.DS_API.updateOrderStatus === 'function') {
        try {
          await window.DS_API.updateOrderStatus(orderId, newStatus);
        } catch (e) {
          console.warn('[DS_Dispatch] Backend status update notice:', e);
        }
      }

      order.status = newStatus;
      if (newStatus === 'Delivered') order.payment = 'Paid';
      window.DS_Storage.saveOrders(orders);
      DS_App.toast(`Order ${orderId} marked as ${newStatus}`, 'success');
      this.renderApprovalTable();
    },

    // ========================================================================
    // DISPATCH CHALLAN
    // ========================================================================
    populateOrderSelect: function () {
      const sel = document.getElementById('challanOrderSelect');
      if (!sel) return;

      const orders = window.DS_Storage ? window.DS_Storage.getOrders() : [];
      sel.innerHTML = '<option value="">-- Select Order for Challan --</option>' + orders.map(o => `
        <option value="${o.id}">${o.id} | Inv: ${o.invoice_no || o.bill_no || '-'} — ${DS_App.escapeHtml(o.storeName || o.party)} (${DS_App.money(o.total)})</option>
      `).join('');

      sel.onchange = () => this.renderChallanForOrder(sel.value);
    },

    renderChallanForOrder: function (orderId) {
      const container = document.getElementById('challanSlipContainer');
      const sel = document.getElementById('challanOrderSelect');
      if (sel) sel.value = orderId;
      if (!container) return;

      const orders = window.DS_Storage ? window.DS_Storage.getOrders() : [];
      const order = orders.find(o => o.id === orderId);

      if (!order) {
        container.innerHTML = '<div style="padding:24px; text-align:center; color:var(--ds-text-muted);">Select an order above to generate Dispatch Challan.</div>';
        return;
      }

      const items = order.items || [];
      const totalQty = items.reduce((acc, i) => acc + (Number(i.qty) || 0), 0);

      container.innerHTML = `
        <div class="challan-print-sheet" style="background:#fff; border:2px solid #000; padding:24px; border-radius:8px; max-width:850px; margin:0 auto;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #000; padding-bottom:14px; margin-bottom:16px;">
            <div>
              <h2 style="margin:0; font-size:24px; text-transform:uppercase; letter-spacing:1px; color:#000;">DS ENTERPRISES</h2>
              <p style="margin:4px 0 0; font-size:12px; color:#333;">Authorised FMCG Distributor & Supply Chain Partner</p>
              <p style="margin:2px 0 0; font-size:11px; color:#555;">GT Road, Transport Nagar, Kanpur, UP | GSTIN: 09AABCD1234E1Z5</p>
            </div>
            <div style="text-align:right;">
              <span class="badge" style="border:1px solid #000; font-size:12px; text-transform:uppercase; font-weight:800; background:#f2f2f2; color:#000;">DELIVERY CHALLAN</span>
              <div style="margin-top:6px; font-size:13px; font-weight:800;">Challan / Order: ${order.id}</div>
              <div style="font-size:13px; font-weight:800; color:#1e40af;">Invoice / Bill No: ${order.invoice_no || order.bill_no || 'Pending'}</div>
              <div style="font-size:12px; color:#444;">Date: ${DS_App.formatDate(order.date)}</div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:18px;">
            <div style="border:1px solid #000; padding:10px 12px; border-radius:4px;">
              <strong style="font-size:11px; text-transform:uppercase; color:#555; display:block; margin-bottom:4px;">Billed & Delivered To:</strong>
              <div style="font-size:15px; font-weight:800; color:#000;">${DS_App.escapeHtml(order.storeName || order.party)}</div>
              <div style="font-size:12px; color:#333; margin-top:2px;">Route/Beat: <strong>${DS_App.escapeHtml(order.route || '-')}</strong></div>
              <div style="font-size:12px; color:#333;">Contact: ${DS_App.escapeHtml(order.givenName || '-')} (${DS_App.escapeHtml(order.givenContact || '-')})</div>
            </div>
            <div style="border:1px solid #000; padding:10px 12px; border-radius:4px;">
              <strong style="font-size:11px; text-transform:uppercase; color:#555; display:block; margin-bottom:4px;">Dispatch Information:</strong>
              <div style="font-size:12px; color:#333;">Booked By: <strong>${DS_App.escapeHtml(order.salesPerson || '-')}</strong></div>
              <div style="font-size:12px; color:#333;">Delivery Status: <strong>${order.status || 'Approved'}</strong></div>
              <div style="font-size:12px; color:#333;">Payment Mode: <strong>${order.payment || 'Unpaid'}</strong></div>
            </div>
          </div>

          <table class="challan-table" style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:12px;">
            <thead>
              <tr style="background:#f2f2f2;">
                <th style="border:1px solid #000; padding:8px; text-align:center; width:40px;">S.No</th>
                <th style="border:1px solid #000; padding:8px; text-align:left;">Item Description</th>
                <th style="border:1px solid #000; padding:8px; text-align:left;">Brand</th>
                <th style="border:1px solid #000; padding:8px; text-align:right; width:70px;">Qty</th>
                <th style="border:1px solid #000; padding:8px; text-align:right; width:90px;">Rate</th>
                <th style="border:1px solid #000; padding:8px; text-align:right; width:100px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((it, idx) => `
                <tr>
                  <td style="border:1px solid #000; padding:8px; text-align:center;">${idx + 1}</td>
                  <td style="border:1px solid #000; padding:8px;"><strong>${DS_App.escapeHtml(it.name)}</strong></td>
                  <td style="border:1px solid #000; padding:8px;">${DS_App.escapeHtml(it.brand || '-')}</td>
                  <td style="border:1px solid #000; padding:8px; text-align:right; font-weight:700;">${it.qty} ${it.unit || 'Pcs'}</td>
                  <td style="border:1px solid #000; padding:8px; text-align:right;">${DS_App.money(it.price)}</td>
                  <td style="border:1px solid #000; padding:8px; text-align:right; font-weight:700;">${DS_App.money(it.total)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background:#fafafa; font-weight:800;">
                <td colspan="3" style="border:1px solid #000; padding:8px; text-align:right;">Total Quantity & Net Payable:</td>
                <td style="border:1px solid #000; padding:8px; text-align:right;">${totalQty}</td>
                <td style="border:1px solid #000; padding:8px;"></td>
                <td style="border:1px solid #000; padding:8px; text-align:right; font-size:14px;">${DS_App.money(order.total)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="font-size:11px; color:#555; margin-bottom:30px;">
            <strong>Declaration & Terms:</strong> Received the above goods in good order and condition. Goods once sold will not be returned without prior verification.
          </div>

          <div style="display:flex; justify-content:space-between; margin-top:40px; padding-top:10px;">
            <div style="border-top:1px solid #000; width:180px; text-align:center; font-size:11px; font-weight:700;">
              Receiver Store Stamp / Sign
            </div>
            <div style="border-top:1px solid #000; width:180px; text-align:center; font-size:11px; font-weight:700;">
              For DS Enterprises (Authorised Sign)
            </div>
          </div>
        </div>
      `;
    },

    copyChallanText: function (orderId) {
      const orders = window.DS_Storage ? window.DS_Storage.getOrders() : [];
      const order = orders.find(o => o.id === orderId);
      if (order && window.DS_WhatsApp) {
        window.DS_WhatsApp.copyDispatchText(order);
      } else if (!order) {
        DS_App.toast('Please select an order first.', 'error');
      }
    },

    sendChallanWhatsApp: function (orderId) {
      return this.copyChallanText(orderId);
    },

    printChallan: function () {
      window.print();
    },

    // ========================================================================
    // VAN / TEMPO LOADING SHEET
    // ========================================================================
    populateRoutes: function () {
      const sel = document.getElementById('loadingSheetRouteSelect');
      if (!sel) return;

      const orders = window.DS_Storage ? window.DS_Storage.getOrders() : [];
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { party: [] };
      const set = new Set();
      orders.forEach(o => { if (o.route) set.add(o.route); });
      (db.party || []).forEach(p => { if (p.route) set.add(p.route); });
      const routes = [...set].filter(Boolean).sort();

      const cur = sel.value;
      sel.innerHTML = '<option value="">All Routes (Consolidated)</option>' + routes.map(r => `
        <option value="${DS_App.escapeHtml(r)}" ${cur === r ? 'selected' : ''}>${DS_App.escapeHtml(r)}</option>
      `).join('');

      sel.onchange = () => this.renderLoadingSheet();
    },

    resetLoadingFilters: function () {
      const s = document.getElementById('loadingSheetSearchInput'); if (s) s.value = '';
      const r = document.getElementById('loadingSheetRouteSelect'); if (r) r.value = '';
      const st = document.getElementById('loadingSheetStatusSelect'); if (st) st.value = 'active';
      const d = document.getElementById('loadingSheetDateInput'); if (d) d.value = '';
      this.renderLoadingSheet();
    },

    renderLoadingSheet: function () {
      const tbody = document.getElementById('loadingSheetTableBody');
      if (!tbody) return;

      const orders = window.DS_Storage ? window.DS_Storage.getOrders() : [];
      const selectedRoute = document.getElementById('loadingSheetRouteSelect')?.value || '';
      const searchItem = (document.getElementById('loadingSheetSearchInput')?.value || '').toLowerCase().trim();
      const statusFilter = document.getElementById('loadingSheetStatusSelect')?.value || 'active';
      const dateFilter = document.getElementById('loadingSheetDateInput')?.value || '';

      let eligibleOrders = orders.filter(o => {
        // Exclude cancelled
        const isCancelled = String(o.status || '').includes('Cancel') || o.cancelType;
        if (isCancelled) return false;

        // Route Filter
        if (selectedRoute && o.route !== selectedRoute) return false;

        // Date Filter
        if (dateFilter && (o.date || '').slice(0, 10) !== dateFilter) return false;

        // Status Filter
        if (statusFilter === 'active') {
          // Confirmed, Processing, Ready for Delivery, Dispatched, Approved
          const st = String(o.status || '');
          return ['Confirmed', 'Approved', 'Processing', 'Ready for Delivery', 'Dispatched'].includes(st);
        } else if (statusFilter === 'all') {
          return true;
        } else {
          return String(o.status || '') === statusFilter;
        }
      });

      // Aggregate item quantities
      const agg = {};
      eligibleOrders.forEach(o => {
        (o.items || []).forEach(it => {
          const itemName = it.name || it.item || 'Item';
          const brandName = it.brand || '-';

          // Search Filter
          if (searchItem) {
            const matchStr = `${itemName} ${brandName}`.toLowerCase();
            if (!matchStr.includes(searchItem)) return;
          }

          if (!agg[itemName]) {
            agg[itemName] = { name: itemName, brand: brandName, unit: it.unit || 'Pcs', totalQty: 0, orderCount: 0 };
          }
          agg[itemName].totalQty += (Number(it.qty) || 0);
          agg[itemName].orderCount += 1;
        });
      });

      const aggregatedList = Object.values(agg).sort((a, b) => b.totalQty - a.totalQty);

      if (aggregatedList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--ds-text-muted);">No orders match the selected route, date, and status criteria.</td></tr>';
        return;
      }

      tbody.innerHTML = aggregatedList.map((item, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${DS_App.escapeHtml(item.name)}</strong></td>
          <td><span class="badge" style="background:#e0f2fe; color:#0369a1;">${DS_App.escapeHtml(item.brand)}</span></td>
          <td class="num"><strong style="font-size:14px;">${item.totalQty} ${item.unit}</strong></td>
          <td class="num">${item.orderCount} Outlets</td>
          <td style="text-align:center;"><input type="checkbox" style="width:18px; height:18px;" /></td>
        </tr>
      `).join('');
    }
  };

  window.DS_Dispatch = DS_Dispatch;

  if (document.getElementById('orderApprovalTableBody')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => DS_Dispatch.initApproval());
    } else {
      DS_Dispatch.initApproval();
    }
  }

  if (document.getElementById('challanSlipContainer')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => DS_Dispatch.initChallan());
    } else {
      DS_Dispatch.initChallan();
    }
  }

  if (document.getElementById('loadingSheetTableBody')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => DS_Dispatch.initLoadingSheet());
    } else {
      DS_Dispatch.initLoadingSheet();
    }
  }

})(window);
