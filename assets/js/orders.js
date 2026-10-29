/**
 * ==========================================================================
 * DS ENTERPRISES — FIELD ORDER PUNCHING & ORDER REPORTS CONTROLLER
 * File: assets/js/orders.js
 * Architecture: Store Cart, Stock Validation, Status Lifecycle & Tracking
 * ==========================================================================
 */

(function (window) {
  'use strict';

  let orderCart = {}; // { 'SKU-001': { item, qty } }
  let selectedStore = null;

  const DS_Orders = {
    initPunching: function () {
      orderCart = {};
      selectedStore = null;
      this.populateRoutesAndStores();
      this.populateBrandSuggestions();
      this.renderCatalog();
      this.bindCartEvents();
      this.renderRecentOrdersTable();
      this.checkUrlParams();
    },

    openAddProductModal: function () {
      this.populateBrandSuggestions();
      const form = document.getElementById('formAddNewProduct');
      if (form) form.reset();
      const autoChk = document.getElementById('npAutoAddToCart');
      if (autoChk) autoChk.checked = true;
      const qtyInp = document.getElementById('npCartQty');
      if (qtyInp) qtyInp.value = '1';
      DS_App.openModal('addProductModal');
      setTimeout(() => document.getElementById('npName')?.focus(), 150);
    },

    closeAddProductModal: function () {
      DS_App.closeModal('addProductModal');
    },

    populateBrandSuggestions: function () {
      const dl = document.getElementById('npBrandList');
      if (!dl) return;
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { stock: [] };
      const brands = [...new Set((db.stock || []).map(s => s.brand).filter(Boolean))].sort();
      dl.innerHTML = brands.map(b => `<option value="${DS_App.escapeHtml(b)}"></option>`).join('');
    },

    saveNewProduct: function (e) {
      if (e && e.preventDefault) e.preventDefault();

      const name = (document.getElementById('npName')?.value || '').trim();
      const brand = (document.getElementById('npBrand')?.value || '').trim() || 'General';
      const category = document.getElementById('npCategory')?.value || 'General FMCG';
      const rate = parseFloat(document.getElementById('npRate')?.value) || 0;
      const mrp = parseFloat(document.getElementById('npMrp')?.value) || rate;
      const unit = document.getElementById('npUnit')?.value || 'Pcs';
      const stockQty = Math.max(0, parseInt(document.getElementById('npStock')?.value) || 100);
      const purchasePrice = parseFloat(document.getElementById('npPurchasePrice')?.value) || (rate > 0 ? Number((rate * 0.85).toFixed(2)) : 0);
      const autoAdd = document.getElementById('npAutoAddToCart')?.checked !== false;
      const addQty = Math.max(1, parseInt(document.getElementById('npCartQty')?.value) || 1);

      if (!name) {
        DS_App.toast('Please enter product name!', 'error');
        return;
      }
      if (rate <= 0) {
        DS_App.toast('Please enter a valid selling rate greater than 0!', 'error');
        return;
      }

      const db = window.DS_Storage ? window.DS_Storage.getDB() : { stock: [] };
      if (!db.stock) db.stock = [];

      // Generate unique SKU code
      let maxNum = 100;
      db.stock.forEach(s => {
        if (s && s.code) {
          const m = String(s.code).match(/\d+$/);
          if (m) {
            const n = parseInt(m[0], 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        }
      });
      const newCode = `SKU-${maxNum + 1}`;

      const newProduct = {
        code: newCode,
        sku: newCode,
        name: name,
        brand: brand,
        category: category,
        rate: rate,
        price: rate,
        sellingPrice: rate,
        purchasePrice: purchasePrice,
        mrp: mrp > 0 ? mrp : rate,
        unit: unit,
        stock: stockQty,
        qty: stockQty,
        value: Number((stockQty * rate).toFixed(2)),
        image: ''
      };

      db.stock.unshift(newProduct);
      window.DS_Storage.saveDB(db);

      if (autoAdd) {
        this.setQty(newCode, addQty);
      }

      this.closeAddProductModal();
      this.renderCatalog();
      DS_App.toast(`✓ Product "${name}" added to Catalog and Cart!`, 'success');
    },

    initReports: function () {
      this.populateReportDropdowns();
      this.checkReportUrlParams();
      this.bindReportEvents();
      this.handleDateRangeChange(document.getElementById('reportFilterDateRange')?.value || 'this_month');
    },

    checkReportUrlParams: function () {
      const p = new URLSearchParams(window.location.search);
      const statusParam = p.get('status');
      if (statusParam) {
        const sel = document.getElementById('reportFilterStatus');
        if (sel) sel.value = statusParam;
      }
      const datePreset = p.get('date_preset') || p.get('preset');
      if (datePreset) {
        const selDate = document.getElementById('reportFilterDateRange');
        if (selDate) {
          selDate.value = datePreset;
          this.handleDateRangeChange(datePreset);
        }
      }
      const routeParam = p.get('route');
      if (routeParam) {
        const selRoute = document.getElementById('reportFilterRoute');
        if (selRoute) selRoute.value = routeParam;
      }
      const soParam = p.get('so') || p.get('sales_person');
      if (soParam) {
        const selSO = document.getElementById('reportFilterSO');
        if (selSO) selSO.value = soParam;
      }
      const searchParam = p.get('search') || p.get('q');
      if (searchParam) {
        const inp = document.getElementById('reportSearchInput');
        if (inp) inp.value = searchParam;
      }
    },

    populateReportDropdowns: function () {
      const orders = window.DS_Storage ? window.DS_Storage.getOrders() : [];
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { party: [], sales: [], stock: [] };
      const parties = db.party || [];
      const sales = db.sales || [];
      const stock = db.stock || [];
      const officers = window.DS_Storage ? window.DS_Storage.getOfficers() : [];

      const fill = (id, vals) => {
        const el = document.getElementById(id);
        if (!el) return;
        const cur = el.value;
        const uniq = [...new Set((vals || []).filter(Boolean).map(String))].sort();
        el.innerHTML = '<option value="">All</option>' + uniq.map(v => `<option value="${DS_App.escapeHtml(v)}">${DS_App.escapeHtml(v)}</option>`).join('');
        if (uniq.includes(cur)) el.value = cur;
      };

      fill('reportFilterCity', [...parties.map(p => p.city || p.City), ...sales.map(s => s.City || s.city)]);
      fill('reportFilterCity1', [...parties.map(p => p.city1 || p.City_1), ...sales.map(s => s.City_1 || s.city1)]);
      fill('reportFilterRoute', [...orders.map(o => o.route), ...parties.map(p => p.route), ...sales.map(s => s.Route || s.route)]);
      fill('reportFilterCategory', [...parties.map(p => p.category || p['Party Category']), ...sales.map(s => s['Party Category'] || s.category)]);
      fill('reportFilterSubCategory', [
        ...parties.map(p => p.subCategory || p['Sub Category']),
        ...sales.map(s => s.subCategory || s['Sub Category'] || s.partySubCategory || s.itemSubCategory),
        ...orders.map(o => o.subCategory || o.partySubCategory)
      ]);

      // Brands from order items, sales, and stock
      const orderBrands = [];
      orders.forEach(o => {
        if (Array.isArray(o.items)) {
          o.items.forEach(it => { if (it.brand || it.Brand) orderBrands.push(it.brand || it.Brand); });
        }
      });
      fill('reportFilterBrand', [...orderBrands, ...sales.map(s => s.Brand || s.brand), ...stock.map(s => s.Brand || s.brand)]);

      // Sales Officers
      const soNames = [...new Set([
        ...officers.map(o => o.name),
        ...orders.map(o => o.salesPerson || o.sales_person)
      ].filter(Boolean))].sort();
      const soSel = document.getElementById('reportFilterSO');
      if (soSel) {
        soSel.innerHTML = '<option value="">All Sales Officers</option>' + soNames.map(s => `<option value="${DS_App.escapeHtml(s)}">${DS_App.escapeHtml(s)}</option>`).join('');
      }
    },

    populateReportRoutes: function () {
      this.populateReportDropdowns();
    },

    populateReportSalesOfficers: function () {
      this.populateReportDropdowns();
    },

    checkUrlParams: function () {
      const urlParams = new URLSearchParams(window.location.search);
      const partyParam = urlParams.get('party');
      const routeParam = urlParams.get('route');
      if (partyParam && window.DS_Storage) {
        const db = window.DS_Storage.getDB();
        const parties = db.party || [];
        const store = parties.find(p => String(p.name || p.Name || '').trim().toLowerCase() === partyParam.trim().toLowerCase());
        if (store) {
          const storeRoute = store.route || store.Route || routeParam || '';
          const selRoute = document.getElementById('orderRouteSelect');
          if (selRoute && storeRoute) {
            selRoute.value = storeRoute;
            this.updateStoreOptions(storeRoute);
          }
          this.selectStore(store);
          const storeEl = document.getElementById('orderStoreSelect');
          if (storeEl) storeEl.value = store.name || store.Name;
        } else {
          const customStore = {
            name: partyParam,
            route: routeParam || 'General Route',
            address: 'Local Market',
            outstanding: 0
          };
          this.selectStore(customStore);
        }
      } else if (routeParam) {
        const selRoute = document.getElementById('orderRouteSelect');
        if (selRoute) {
          selRoute.value = routeParam;
          this.updateStoreOptions(routeParam);
        }
      }
    },

    populateRoutesAndStores: function () {
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { party: [] };
      const parties = db.party || [];
      const routes = [...new Set(parties.map(p => p.route || p.Route).filter(Boolean))].sort();

      const routeEl = document.getElementById('orderRouteSelect');
      if (routeEl) {
        routeEl.innerHTML = '<option value="">All Routes / Beats</option>' + routes.map(r => `<option value="${DS_App.escapeHtml(r)}">${DS_App.escapeHtml(r)}</option>`).join('');
        routeEl.onchange = () => this.updateStoreOptions(routeEl.value);
      }

      this.updateStoreOptions('');
    },

    updateStoreOptions: function (selectedRoute) {
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { party: [] };
      let parties = db.party || [];
      if (selectedRoute) {
        parties = parties.filter(p => (p.route || p.Route) === selectedRoute);
      }

      const storeEl = document.getElementById('orderStoreSelect');
      if (storeEl) {
        storeEl.innerHTML = '<option value="">-- Choose Retail Store / Kirana --</option>' + parties.map(p => {
          const pName = p.name || p.Name || p['Party Name'] || '';
          const pRoute = p.route || p.Route || '';
          return `<option value="${DS_App.escapeHtml(pName)}">${DS_App.escapeHtml(pName)} (${DS_App.escapeHtml(pRoute)})</option>`;
        }).join('');
        storeEl.onchange = () => {
          const found = parties.find(p => (p.name || p.Name || p['Party Name']) === storeEl.value);
          this.selectStore(found);
        };
      }
    },

    selectStore: function (store) {
      selectedStore = store;
      const infoBox = document.getElementById('orderStoreInfoCard');
      const storeEl = document.getElementById('orderStoreSelect');
      const storeName = store ? (store.name || store.Name || store['Party Name'] || '') : '';
      if (storeEl && store) storeEl.value = storeName;

      if (!infoBox) return;

      if (!store) {
        infoBox.style.display = 'none';
        return;
      }

      let storeOutAmt = Number(store.outstanding ?? store.Outstanding ?? store.balance ?? 0);
      if (storeOutAmt === 0 && window.DS_Route && typeof window.DS_Route.getPartyOutstanding === 'function') {
        storeOutAmt = window.DS_Route.getPartyOutstanding(storeName, store);
      } else if (storeOutAmt === 0) {
        const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
        const unpaid = db.unpaid || [];
        const sTarget = storeName.toLowerCase();
        const uMatches = unpaid.filter(u => String(u.party || u.party_name || u.customer_name || '').toLowerCase() === sTarget);
        if (uMatches.length > 0) {
          storeOutAmt = uMatches.reduce((sum, u) => sum + (Number(u.balanceAmount ?? u.balance ?? u.amount) || 0), 0);
        }
      }

      const storeRoute = store.route || store.Route || '';
      const storeAddr = store.address || store.Address || store.location || storeRoute || 'Local Market';
      const storeContact = store.contact || store['Contact Person'] || '-';
      const storePhone = store.phone || store['Mob No.'] || '-';
      const creditLimit = store.creditLimit || store['Credit Limit'] || 50000;

      infoBox.style.display = 'block';
      infoBox.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
          <div>
            <h4 style="margin:0 0 4px; font-size:15px; color:var(--ds-text);">${DS_App.escapeHtml(storeName)}</h4>
            <div style="font-size:12px; color:var(--ds-text-muted);">
              ${DS_App.escapeHtml(storeAddr)} • Contact: <strong>${DS_App.escapeHtml(storeContact)}</strong> (${DS_App.escapeHtml(storePhone)})
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px; text-transform:uppercase; color:var(--ds-text-muted); font-weight:700;">Outstanding Balance</div>
            <div style="font-size:16px; font-weight:800; color:${storeOutAmt > 0 ? 'var(--ds-danger-dark)' : '#16a34a'};">${DS_App.money(storeOutAmt)}</div>
            <div style="font-size:10px; color:var(--ds-text-light);">Credit Limit: ${DS_App.money(creditLimit)}</div>
          </div>
        </div>
      `;
    },

    renderCatalog: function () {
      const container = document.getElementById('orderCatalogList');
      if (!container) return;

      const db = window.DS_Storage ? window.DS_Storage.getDB() : { stock: [] };
      const items = db.stock || [];
      const search = (document.getElementById('catalogSearchInput')?.value || '').toLowerCase().trim();

      const filtered = items.filter(s => {
        if (!search) return true;
        return (s.name && s.name.toLowerCase().includes(search)) || (s.brand && s.brand.toLowerCase().includes(search));
      });

      if (filtered.length === 0) {
        container.innerHTML = '<div style="padding:20px; text-align:center; color:var(--ds-text-muted);">No products found matching search.</div>';
        return;
      }

      container.innerHTML = filtered.map(item => {
        const inCart = orderCart[item.code]?.qty || 0;
        const imgPath = window.DS_Storage ? window.DS_Storage.resolveImagePath(item.image) : (item.image || '');
        const initial = item.name ? item.name.charAt(0).toUpperCase() : 'P';
        return `
          <div class="store-card" style="padding:12px;">
            <div style="display:flex; gap:10px; align-items:flex-start; margin-bottom:8px;">
              <!-- Product Image Thumbnail -->
              <div style="width:52px; height:52px; border-radius:8px; background:#f8fafc; border:1px solid #e2e8f0; overflow:hidden; display:grid; place-items:center; flex-shrink:0;">
                ${imgPath ? `
                  <img src="${imgPath}" alt="${DS_App.escapeHtml(item.name)}" style="width:100%; height:100%; object-fit:contain; padding:2px;" onerror="this.onerror=null; this.src=''; this.parentElement.innerHTML='<div style=\\'font-weight:800; font-size:16px; color:#0284c7;\\'>${initial}</div>';" />
                ` : `
                  <div style="font-weight:800; font-size:16px; color:#0284c7;">${initial}</div>
                `}
              </div>
              <div style="flex:1; min-width:0;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                  <div style="min-width:0;">
                    <strong style="font-size:13px; color:var(--ds-text); display:block; line-height:1.2; margin-bottom:2px;">${DS_App.escapeHtml(item.name)}</strong>
                    <div style="display:flex; gap:4px; align-items:center; flex-wrap:wrap;">
                      <span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:10px; padding:2px 6px;">${DS_App.escapeHtml(item.brand)}</span>
                      <span style="font-size:11px; color:var(--ds-text-muted);">Stock: <strong>${DS_App.qty(item.stock)} ${item.unit || ''}</strong></span>
                    </div>
                  </div>
                  <div style="text-align:right; flex-shrink:0; margin-left:6px;">
                    <div style="font-size:14px; font-weight:800; color:var(--ds-primary);">${DS_App.money(item.rate)}</div>
                    <div style="font-size:10px; color:var(--ds-text-light); text-decoration:line-through;">MRP: ${DS_App.money(item.mrp)}</div>
                  </div>
                </div>
              </div>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; padding-top:6px; border-top:1px solid var(--ds-border-light);">
              <span style="font-size:11px; color:var(--ds-text-muted);">Quantity (${item.unit || 'Pcs'})</span>
              <div style="display:inline-flex; align-items:center; gap:6px;">
                <button type="button" class="btn btn-secondary btn-sm order-stepper-btn" onclick="DS_Orders.stepQty('${item.code}', -1)" aria-label="Decrease quantity">−</button>
                <input type="number" min="0" value="${inCart}" id="qtyInput_${item.code}" 
                  class="order-qty-input"
                  style="width:48px; text-align:center; padding:4px; font-weight:800; border:1px solid var(--ds-border); border-radius:6px;"
                  onchange="DS_Orders.setQty('${item.code}', this.value)" />
                <button type="button" class="btn btn-primary btn-sm order-stepper-btn" onclick="DS_Orders.stepQty('${item.code}', 1)" aria-label="Increase quantity">+</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    },

    stepQty: function (code, step) {
      const current = orderCart[code]?.qty || 0;
      const next = Math.max(0, current + step);
      this.setQty(code, next);
    },

    setQty: function (code, rawQty) {
      const qty = Math.max(0, parseInt(rawQty) || 0);
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { stock: [] };
      const item = (db.stock || []).find(s => s.code === code);
      if (!item) return;

      if (qty === 0) {
        delete orderCart[code];
      } else {
        orderCart[code] = {
          code: item.code,
          name: item.name,
          brand: item.brand,
          price: item.rate,
          unit: item.unit || 'Pcs',
          qty: qty,
          total: qty * item.rate
        };
      }

      const input = document.getElementById(`qtyInput_${code}`);
      if (input) input.value = qty;

      this.renderCartSummary();
    },

    renderCartSummary: function () {
      const items = Object.values(orderCart);
      const totalQty = items.reduce((acc, i) => acc + i.qty, 0);
      const subtotal = items.reduce((acc, i) => acc + i.total, 0);

      const elQty = document.getElementById('cartTotalQty');
      if (elQty) elQty.textContent = totalQty;

      const elSub = document.getElementById('cartSubtotal');
      if (elSub) elSub.textContent = DS_App.money(subtotal);

      const elNet = document.getElementById('cartNetTotal');
      if (elNet) elNet.textContent = DS_App.money(subtotal);

      // Update Floating Mobile Cart Bar
      const mBar = document.getElementById('mobileCartFloatingBar');
      const mQty = document.getElementById('mCartUnits');
      const mTotal = document.getElementById('mCartTotal');
      if (mBar && mQty && mTotal) {
        if (totalQty > 0) {
          mQty.textContent = `${totalQty} Units (${items.length} SKUs)`;
          mTotal.textContent = DS_App.money(subtotal);
          mBar.style.display = 'flex';
        } else {
          mBar.style.display = 'none';
        }
      }

      const itemsList = document.getElementById('cartItemsList');
      if (itemsList) {
        if (items.length === 0) {
          itemsList.innerHTML = '<div style="color:var(--ds-text-muted); font-size:12px; text-align:center; padding:16px;">Cart is currently empty. Add items from the catalog.</div>';
        } else {
          itemsList.innerHTML = items.map(it => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid var(--ds-border-light); font-size:12px; gap:8px;">
              <div style="flex:1; min-width:0;">
                <strong style="display:block; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${DS_App.escapeHtml(it.name)}">${DS_App.escapeHtml(it.name)}</strong>
                <div style="font-size:11px; color:var(--ds-text-muted);">${it.qty} ${it.unit} × ${DS_App.money(it.price)}</div>
              </div>
              <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                <span style="font-weight:700; color:var(--ds-primary);">${DS_App.money(it.total)}</span>
                <button type="button" class="btn btn-sm btn-cart-remove" onclick="DS_Orders.removeItem('${DS_App.escapeHtml(it.code)}')" title="Remove this item from cart (आइटम हटाएं)" style="border:none; background:#fee2e2; color:#b91c1c; border-radius:6px; width:26px; height:26px; padding:0; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; font-weight:800; font-size:13px; line-height:1; transition:background 0.15s ease;" onmouseover="this.style.background='#fecdd3'" onmouseout="this.style.background='#fee2e2'">
                  ✕
                </button>
              </div>
            </div>
          `).join('');
        }
      }
    },

    removeItem: function (code) {
      if (!orderCart[code]) return;
      const itemName = orderCart[code].name || code;
      delete orderCart[code];

      const input = document.getElementById(`qtyInput_${code}`);
      if (input) input.value = 0;

      this.renderCartSummary();
      if (window.DS_App) DS_App.toast(`Removed "${itemName}" from cart`, 'info');
    },

    clearCart: function (confirmPrompt = true) {
      const keys = Object.keys(orderCart);
      if (keys.length === 0) {
        if (window.DS_App) DS_App.toast('Cart is already empty', 'info');
        return;
      }

      if (confirmPrompt && !confirm('Are you sure you want to remove all items from the cart? (क्या आप कार्ट के सभी आइटम्स हटाना चाहते हैं?)')) {
        return;
      }

      keys.forEach(code => {
        const input = document.getElementById(`qtyInput_${code}`);
        if (input) input.value = 0;
      });

      orderCart = {};
      this.renderCartSummary();
      if (window.DS_App) DS_App.toast('All items removed from cart (कार्ट खाली कर दिया गया)', 'info');
    },

    scrollToCart: function () {
      const cartEl = document.getElementById('orderCartPanel');
      if (cartEl) {
        cartEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        cartEl.style.transition = 'box-shadow 0.3s ease, border-color 0.3s ease';
        cartEl.style.borderColor = 'var(--ds-primary)';
        cartEl.style.boxShadow = '0 0 0 4px rgba(2, 132, 199, 0.35)';
        setTimeout(() => {
          cartEl.style.boxShadow = '';
          cartEl.style.borderColor = '';
        }, 1500);
      }
    },

    submitOrder: function () {
      if (this._submitting) return;

      if (window.DS_Auth && !window.DS_Auth.hasPermission('canPunchOrders')) {
        DS_App.toast('Permission Denied: Your active role does not have permission to punch field orders.', 'error');
        return;
      }

      if (!selectedStore) {
        DS_App.toast('Please select a retail store first!', 'error');
        return;
      }

      const items = Object.values(orderCart);
      if (items.length === 0) {
        DS_App.toast('Please add at least 1 product to the cart!', 'error');
        return;
      }

      this._submitting = true;

      const activeSo = window.DS_Auth ? window.DS_Auth.getActiveSo() : { name: 'Field Sales', id: 'SO-101' };
      const totalAmount = items.reduce((acc, i) => acc + i.total, 0);
      const totalQty = items.reduce((acc, i) => acc + i.qty, 0);
      const today = new Date();
      const ymd = today.toISOString().split('T')[0];
      const timeStr = today.toTimeString().split(' ')[0];

      const orders = window.DS_Storage.getOrders();
      let maxNum = 5000;
      orders.forEach(o => {
        if (o && o.id) {
          const m = String(o.id).match(/\d+$/);
          if (m) {
            const n = parseInt(m[0], 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        }
      });
      const orderId = window.DS_Storage ? window.DS_Storage.generateNextNumber('order', ymd) : `ORD-2026-${maxNum + 1}`;
      const invoiceNo = window.DS_Storage ? window.DS_Storage.generateNextNumber('invoice', ymd) : `INV-2026-0001`;
      const billNo = invoiceNo; // Unified single standard identifier (Invoice = Bill)

      const newOrder = {
        id: orderId,
        order_id: orderId,
        orderId: orderId,
        bill_no: invoiceNo,
        billNo: invoiceNo,
        'Bill No.': invoiceNo,
        invoice_no: invoiceNo,
        invoiceNo: invoiceNo,
        'Invoice No.': invoiceNo,
        date: ymd,
        dateTime: `${ymd} ${timeStr}`,
        storeName: selectedStore.name || selectedStore.Name || selectedStore['Party Name'] || 'Retail Store',
        store_name: selectedStore.name || selectedStore.Name || selectedStore['Party Name'] || 'Retail Store',
        party: selectedStore.name || selectedStore.Name || selectedStore['Party Name'] || 'Retail Store',
        party_id: selectedStore.id || selectedStore.party_id || null,
        location: selectedStore.address || selectedStore.Address || selectedStore.route || selectedStore.Route || 'Local Market',
        city: selectedStore.city || selectedStore.City || 'Kanpur',
        city1: selectedStore.city1 || selectedStore.City_1 || selectedStore.city || 'Kanpur',
        route: selectedStore.route || selectedStore.Route || 'General Route',
        category: selectedStore.category || selectedStore['Party Category'] || 'Retail Kirana',
        givenName: selectedStore.contact || selectedStore['Contact Person'] || '',
        givenContact: selectedStore.phone || selectedStore['Mob No.'] || '',
        contact_person: selectedStore.contact || selectedStore['Contact Person'] || '',
        contact_phone: selectedStore.phone || selectedStore['Mob No.'] || '',
        salesPerson: activeSo.name,
        sales_person: activeSo.name,
        soId: activeSo.id,
        so_id: activeSo.id,
        items: items,
        total: totalAmount,
        qty: totalQty,
        status: 'Submitted',
        payment: 'Unpaid'
      };

      orders.push(newOrder);
      window.DS_Storage.saveOrders(orders);

      // Deduct stock in DB
      const db = window.DS_Storage.getDB();
      items.forEach(cartItem => {
        const stockItem = (db.stock || []).find(s => s.code === cartItem.code);
        if (stockItem) {
          stockItem.stock = Math.max(0, (Number(stockItem.stock) || 0) - cartItem.qty);
        }
      });
      window.DS_Storage.saveDB(db);

      // Async sync to PHP MySQL backend if online
      if (window.DS_API && typeof window.DS_API.punchOrder === 'function') {
        window.DS_API.punchOrder(newOrder).catch(err => {
          console.warn('[DS_Orders] Backend punch sync deferred:', err);
        });
      }

      DS_App.toast(`✓ Order ${orderId} (Invoice / Bill: ${invoiceNo}) booked successfully!`, 'success');

      // Auto-record beat visit for this store on this date
      try {
        const sName = selectedStore.name || selectedStore.Name;
        if (sName) {
          const rawV = localStorage.getItem('ds_route_visits_v1');
          const allV = rawV ? JSON.parse(rawV) : {};
          if (!allV[ymd]) allV[ymd] = {};
          allV[ymd][sName] = {
            visited: true,
            time: today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            user: activeSo.name || 'Sales Officer',
            updatedAt: new Date().toISOString()
          };
          localStorage.setItem('ds_route_visits_v1', JSON.stringify(allV));
        }
      } catch (eV) {
        console.warn('Auto-visit sync error:', eV);
      }

      // Clear cart
      orderCart = {};
      this.renderCatalog();
      this.renderCartSummary();
      this.renderRecentOrdersTable();

      // Automatically copy formatted text to clipboard and show modal
      if (window.DS_WhatsApp) {
        window.DS_WhatsApp.copyOrderText(newOrder);
      }

      setTimeout(() => {
        this._submitting = false;
      }, 500);
    },

    getOrderById: function (orderId) {
      const orders = window.DS_Storage ? window.DS_Storage.getOrders() : [];
      return orders.find(o => o.id === orderId) || null;
    },

    copyOrderText: function (orderId) {
      const order = this.getOrderById(orderId);
      if (order && window.DS_WhatsApp) {
        window.DS_WhatsApp.copyOrderText(order);
      } else if (!order) {
        DS_App.toast('Order not found', 'error');
      }
    },

    // Backward compatibility alias
    sendWhatsApp: function (orderId) {
      return this.copyOrderText(orderId);
    },

    renderRecentOrdersTable: function () {
      const tbody = document.getElementById('recentPunchOrdersTableBody');
      if (!tbody) return;

      const orders = window.DS_Storage ? window.DS_Storage.getOrders() : [];
      const searchVal = (document.getElementById('recentPunchSearchInput')?.value || '').toLowerCase().trim();
      const statusFilter = document.getElementById('recentPunchStatusFilter')?.value || '';

      // Sort newest first
      let list = [...orders].reverse();

      if (searchVal) {
        list = list.filter(o => {
          const hay = `${o.id || ''} ${o.bill_no || o.billNo || ''} ${o.invoice_no || o.invoiceNo || ''} ${o.storeName || o.party || ''} ${o.route || ''} ${o.salesPerson || ''}`.toLowerCase();
          return hay.includes(searchVal);
        });
      }

      if (statusFilter) {
        if (statusFilter === 'all_cancelled') {
          list = list.filter(o => (o.status || '').includes('Cancelled') || o.cancelType);
        } else if (statusFilter === 'active') {
          list = list.filter(o => !(o.status || '').includes('Cancelled') && !o.cancelType);
        } else {
          list = list.filter(o => {
            const st = String(o.status || '');
            if (statusFilter.includes('Customer')) return st.includes('Customer') || st.includes('Party') || o.cancelType === 'party';
            if (statusFilter.includes('Company') || statusFilter.includes('Own')) return st.includes('Company') || st.includes('Own') || o.cancelType === 'own';
            return st === statusFilter;
          });
        }
      }

      const countBadge = document.getElementById('recentPunchCountBadge');
      if (countBadge) countBadge.textContent = `${list.length} Orders`;

      if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:18px; color:var(--ds-text-muted);">No orders match current filter.</td></tr>';
        return;
      }

      tbody.innerHTML = list.slice(0, 30).map(o => {
        const isCancelled = (o.status || '').includes('Cancelled') || o.cancelType;
        const isPartyCancel = (o.status || '').includes('Customer') || (o.status || '').includes('Party') || o.cancelType === 'party';
        const isOwnCancel = (o.status || '').includes('Company') || (o.status || '').includes('Own') || o.cancelType === 'own';

        let badgeClass = 'badge-submitted';
        let badgeText = o.status || 'Submitted';
        if (isPartyCancel) {
          badgeClass = 'badge-cancelled-by-party';
          badgeText = '❌ Cancelled (Customer)';
        } else if (isOwnCancel) {
          badgeClass = 'badge-cancelled-by-own';
          badgeText = '⚠️ Cancelled (Company)';
        } else if (o.status === 'Delivered') {
          badgeClass = 'badge-delivered';
        } else if (o.status === 'Dispatched') {
          badgeClass = 'badge-dispatched';
        } else if (o.status === 'Ready for Delivery') {
          badgeClass = 'badge-ready';
        } else if (o.status === 'Confirmed' || o.status === 'Approved') {
          badgeClass = 'badge-approved';
        }

        const remarkNote = o.cancelRemark || o.cancelReason || '';

        return `
          <tr>
            <td>
              <button type="button" class="btn btn-link" onclick="DS_Orders.viewOrderDetails('${o.id}')" style="padding:0; font-weight:800; font-size:13px; color:var(--ds-primary); text-decoration:none;">
                ${o.id}
              </button>
              <div style="font-size:11px; color:var(--ds-text-muted);">${DS_App.formatDate(o.date)}</div>
            </td>
            <td>
              <span class="badge" style="background:#eff6ff; color:#1d4ed8; font-size:11.5px; font-weight:700; font-family:monospace; padding:3px 8px; border-radius:6px;" title="Invoice / Bill No.">
                🧾 ${DS_App.escapeHtml(o.invoice_no || o.bill_no || o.invoiceNo || o.billNo || 'Pending')}
              </span>
            </td>
            <td>
              <strong>${DS_App.escapeHtml(o.storeName || o.party)}</strong>
              ${o.givenContact ? `<div style="font-size:11px; color:var(--ds-text-muted);">📞 ${DS_App.escapeHtml(o.givenContact)}</div>` : ''}
            </td>
            <td>${DS_App.escapeHtml(o.route || '-')}</td>
            <td class="num">
              <strong>${DS_App.money(o.total)}</strong>
              <div style="font-size:11px; color:var(--ds-text-muted);">${DS_App.qty(o.qty)} items</div>
            </td>
            <td>
              <span class="badge ${badgeClass}">${badgeText}</span>
              ${remarkNote ? `<div style="font-size:11px; color:#be123c; margin-top:2px; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${DS_App.escapeHtml(remarkNote)}">📝 ${DS_App.escapeHtml(remarkNote)}</div>` : ''}
            </td>
            <td style="text-align:center;">
              <div style="display:flex; gap:4px; justify-content:center; flex-wrap:wrap;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="DS_Orders.viewOrderDetails('${o.id}')" title="View Full Order Details" style="padding:3px 7px; font-size:11px;">
                  👁️
                </button>
                <button type="button" class="btn btn-primary btn-sm" onclick="DS_Orders.copyOrderText('${o.id}')" title="Copy Order for WhatsApp" style="padding:3px 7px; font-size:11px;">
                  📋
                </button>
                ${!isCancelled && o.status !== 'Delivered' ? `
                  <button type="button" class="btn btn-danger btn-sm" onclick="DS_Orders.openCancelOrderModal('${o.id}')" title="Cancel this order (Customer or Own)" style="padding:3px 8px; font-size:11px; background:#fff1f2; color:#be123c; border:1px solid #fecdd3; font-weight:700;">
                    ❌ Cancel
                  </button>
                ` : isCancelled ? `
                  <button type="button" class="btn btn-secondary btn-sm" onclick="DS_Orders.openCancelOrderModal('${o.id}')" title="View or edit cancellation remark note" style="padding:3px 8px; font-size:11px; background:#f1f5f9; color:#475569;">
                    📝 Note
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    bindCartEvents: function () {
      const search = document.getElementById('catalogSearchInput');
      if (search) {
        search.addEventListener('input', () => this.renderCatalog());
      }
    },

    // ========================================================================
    // ORDER REPORTS & ADVANCED FILTERING
    // ========================================================================
    // ORDER REPORTS & ADVANCED FILTERING
    // ========================================================================
    bindReportEvents: function () {
      ['reportFilterDateRange', 'reportFromDate', 'reportToDate', 'reportFilterCity', 'reportFilterCity1', 'reportFilterRoute', 'reportFilterCategory', 'reportFilterSubCategory', 'reportFilterBrand', 'reportFilterBillNo', 'reportFilterPayment', 'reportFilterStatus', 'reportFilterSO', 'reportFilterCancelReason', 'reportSearchInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('change', () => this.renderReportTable());
          if (el.tagName === 'INPUT') el.addEventListener('input', () => this.renderReportTable());
        }
      });
    },

    handleDateRangeChange: function (val) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      let start = null, end = today;
      const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      if (val === 'today') {
        start = today;
      } else if (val === 'yesterday') {
        start = new Date(today);
        start.setDate(start.getDate() - 1);
        end = start;
      } else if (val === '7days') {
        start = new Date(today);
        start.setDate(start.getDate() - 6);
      } else if (val === 'this_month' || val === 'month') {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
      } else if (val === 'lastmonth') {
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0);
      } else if (val === '3months') {
        start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      } else if (val === '6months') {
        start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
      } else if (val === '365days') {
        start = new Date(today);
        start.setDate(start.getDate() - 364);
      } else if (val === 'all') {
        start = null;
        end = null;
      }

      const fromEl = document.getElementById('reportFromDate');
      const toEl = document.getElementById('reportToDate');
      if (val !== 'custom' && fromEl && toEl) {
        fromEl.value = start ? fmt(start) : '';
        toEl.value = end ? fmt(end) : '';
      }
      this.renderReportTable();
    },

    _billStatusView: 'all',

    setBillStatusView: function (view) {
      this._billStatusView = view || 'all';
      ['btnBillViewAll', 'btnBillViewPaid', 'btnBillViewUnpaid', 'btnBillViewOutstanding'].forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
          btn.className = 'btn btn-sm btn-secondary';
        }
      });
      const activeBtnMap = {
        all: 'btnBillViewAll',
        paid: 'btnBillViewPaid',
        unpaid: 'btnBillViewUnpaid',
        outstanding: 'btnBillViewOutstanding'
      };
      const activeBtn = document.getElementById(activeBtnMap[this._billStatusView] || 'btnBillViewAll');
      if (activeBtn) {
        activeBtn.className = 'btn btn-sm btn-primary';
      }
      this.renderReportTable();
    },

    resetFilters: function () {
      const elRange = document.getElementById('reportFilterDateRange');
      if (elRange) elRange.value = 'this_month';

      this._billStatusView = 'all';
      ['btnBillViewAll', 'btnBillViewPaid', 'btnBillViewUnpaid', 'btnBillViewOutstanding'].forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) btn.className = (btnId === 'btnBillViewAll') ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-secondary';
      });

      ['reportFilterCity', 'reportFilterCity1', 'reportFilterRoute', 'reportFilterCategory', 'reportFilterSubCategory', 'reportFilterBrand', 'reportFilterBillNo', 'reportFilterPayment', 'reportFilterStatus', 'reportFilterSO', 'reportFilterCancelReason', 'reportSearchInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });

      this.handleDateRangeChange('this_month');
      DS_App.toast('All filters reset', 'info');
    },

    matchesDateRange: function (orderDateStr, range, fromDate, toDate) {
      if (!range || range === 'all') return true;
      if (!orderDateStr) return false;
      const d = new Date(orderDateStr.substring(0, 10) + 'T00:00:00');
      if (isNaN(d.getTime())) return true;

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (range === 'today') {
        return d.getTime() === today.getTime();
      }
      if (range === 'yesterday') {
        const yest = new Date(today);
        yest.setDate(yest.getDate() - 1);
        return d.getTime() === yest.getTime();
      }
      if (range === '7days') {
        const past7 = new Date(today);
        past7.setDate(past7.getDate() - 6);
        return d >= past7 && d <= today;
      }
      if (range === 'this_month' || range === 'month') {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return d >= startOfMonth && d <= today;
      }
      if (range === 'lastmonth') {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
        return d >= start && d <= end;
      }
      if (range === '3months') {
        const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        return d >= start && d <= today;
      }
      if (range === '6months') {
        const start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        return d >= start && d <= today;
      }
      if (range === '365days') {
        const past365 = new Date(today);
        past365.setDate(past365.getDate() - 364);
        return d >= past365 && d <= today;
      }
      if (range === 'custom') {
        if (fromDate) {
          const from = new Date(fromDate + 'T00:00:00');
          if (d < from) return false;
        }
        if (toDate) {
          const to = new Date(toDate + 'T23:59:59');
          if (d > to) return false;
        }
        return true;
      }
      return true;
    },

    getFilteredOrders: function () {
      const orders = window.DS_Storage ? window.DS_Storage.getOrders() : [];
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { party: [] };
      const partyMap = new Map((db.party || []).map(p => [String(p.name || '').trim().toLowerCase(), p]));

      const range = document.getElementById('reportFilterDateRange')?.value || 'this_month';
      const fromDate = document.getElementById('reportFromDate')?.value || '';
      const toDate = document.getElementById('reportToDate')?.value || '';
      const cityFilter = (document.getElementById('reportFilterCity')?.value || '').toLowerCase().trim();
      const city1Filter = (document.getElementById('reportFilterCity1')?.value || '').toLowerCase().trim();
      const routeFilter = document.getElementById('reportFilterRoute')?.value || '';
      const catFilter = (document.getElementById('reportFilterCategory')?.value || '').toLowerCase().trim();
      const subCatFilter = (document.getElementById('reportFilterSubCategory')?.value || '').toLowerCase().trim();
      const brandFilter = (document.getElementById('reportFilterBrand')?.value || '').toLowerCase().trim();
      const billFilter = (document.getElementById('reportFilterBillNo')?.value || '').toLowerCase().trim();
      const paymentFilter = (document.getElementById('reportFilterPayment')?.value || '').toLowerCase().trim();
      const statusFilter = document.getElementById('reportFilterStatus')?.value || '';
      const soFilter = document.getElementById('reportFilterSO')?.value || '';
      const reasonFilter = (document.getElementById('reportFilterCancelReason')?.value || '').toLowerCase().trim();
      const search = (document.getElementById('reportSearchInput')?.value || '').toLowerCase().trim();

      return [...orders].reverse().filter(o => {
        // Date Filter
        if (!this.matchesDateRange(o.date || o.dateTime, range, fromDate, toDate)) return false;

        const storeName = String(o.storeName || o.party || '').trim();
        const partyObj = partyMap.get(storeName.toLowerCase()) || {};
        const oCity = String(o.city || partyObj.city || partyObj.City || '').toLowerCase();
        const oCity1 = String(o.city1 || o.city_1 || partyObj.city1 || partyObj.City_1 || partyObj.city || '').toLowerCase();
        const oCat = String(o.category || partyObj.category || partyObj['Party Category'] || '').toLowerCase();
        const oSubCat = String(o.subCategory || partyObj.subCategory || partyObj['Sub Category'] || o.partySubCategory || '').toLowerCase();

        if (cityFilter && oCity !== cityFilter) return false;
        if (city1Filter && oCity1 !== city1Filter) return false;
        if (routeFilter && o.route !== routeFilter) return false;
        if (catFilter && oCat !== catFilter) return false;
        if (subCatFilter && oSubCat !== subCatFilter) return false;

        // Brand filter (check in order items)
        if (brandFilter) {
          const items = Array.isArray(o.items) ? o.items : [];
          const hasBrand = items.some(it => String(it.brand || it.Brand || '').toLowerCase() === brandFilter);
          if (!hasBrand) return false;
        }

        // Bill / Inv No filter
        if (billFilter) {
          const invIds = [o.id, o.bill_no, o.billNo, o.invoice_no, o.invoiceNo].filter(Boolean).map(x => String(x).toLowerCase());
          const matchBill = invIds.some(x => x.includes(billFilter));
          if (!matchBill) return false;
        }

        // Payment status filter
        if (paymentFilter) {
          const isPaid = o.paymentStatus === 'Paid' || o.status === 'Delivered';
          if (paymentFilter === 'paid' && !isPaid) return false;
          if (paymentFilter === 'unpaid' && isPaid) return false;
        }

        // Status Filter (Supporting all 8 statuses + aliases)
        if (statusFilter) {
          const st = String(o.status || 'Pending').toLowerCase();
          if (statusFilter === 'all_cancelled') {
            const isCanc = st.includes('cancel') || o.cancelType;
            if (!isCanc) return false;
          } else if (statusFilter === 'Cancelled by Customer' || statusFilter === 'Cancelled by Party') {
            if (!st.includes('customer') && !st.includes('party') && o.cancelType !== 'party') return false;
          } else if (statusFilter === 'Cancelled by Company/Admin' || statusFilter === 'Cancelled by Own') {
            if (!st.includes('company') && !st.includes('admin') && !st.includes('own') && o.cancelType !== 'own') return false;
          } else if (statusFilter === 'Pending' || statusFilter === 'Submitted') {
            if (st !== 'pending' && st !== 'submitted') return false;
          } else if (statusFilter === 'Confirmed' || statusFilter === 'Approved') {
            if (st !== 'confirmed' && st !== 'approved') return false;
          } else {
            if (st !== statusFilter.toLowerCase()) return false;
          }
        }

        // Sales Officer Filter
        if (soFilter) {
          const soName = o.salesPerson || o.sales_person || '';
          if (soName !== soFilter) return false;
        }

        // Route Filter
        if (routeFilter && o.route !== routeFilter) return false;

        // Cancellation Reason Filter
        if (reasonFilter) {
          const rText = [o.cancelReason, o.cancelRemark].filter(Boolean).join(' ').toLowerCase();
          if (!rText.includes(reasonFilter)) return false;
        }

        // Search Query
        if (search) {
          const str = [
            o.id,
            o.bill_no,
            o.billNo,
            o.invoice_no,
            o.invoiceNo,
            o.storeName,
            o.party,
            o.salesPerson,
            o.route,
            o.cancelReason,
            o.cancelRemark,
            o.givenName,
            o.givenContact,
            ...(Array.isArray(o.items) ? o.items.map(it => [it.name, it.brand, it.code].filter(Boolean).join(' ')) : []),
            ...(Array.isArray(o.adminNotes) ? o.adminNotes.map(n => n.note || '') : [])
          ].filter(Boolean).join(' ').toLowerCase();

          if (!str.includes(search)) return false;
        }

        // Bill Status View Filter (All Bills, Paid Bills, Unpaid Bills, Outstanding Bills)
        if (this._billStatusView && this._billStatusView !== 'all') {
          const invStr = String(o.invoice_no || o.bill_no || o.invoiceNo || o.billNo || o.id || '').trim().toLowerCase();
          const dbUnpaid = db.unpaid || [];
          const isUnpaidInDB = dbUnpaid.some(u => String(u.invoice || u.billNo || u.invoiceNo || u.bill_no || '').trim().toLowerCase() === invStr);
          
          const isPaid = (o.paymentStatus === 'Paid' || o.payment === 'Paid' || o.status === 'Delivered') && !isUnpaidInDB;
          const isUnpaid = !isPaid;

          const orderDate = new Date((o.date || o.dateTime || '').substring(0, 10) + 'T00:00:00');
          const today = new Date();
          today.setHours(0,0,0,0);
          const ageDays = !isNaN(orderDate.getTime()) ? Math.max(0, Math.floor((today - orderDate) / (1000 * 60 * 60 * 24))) : 0;
          const isOutstanding = isUnpaid && ageDays >= 1;

          if (this._billStatusView === 'paid' && !isPaid) return false;
          if (this._billStatusView === 'unpaid' && !isUnpaid) return false;
          if (this._billStatusView === 'outstanding' && !isOutstanding) return false;
        }

        return true;
      });
    },

    updateReportKPIs: function (filtered) {
      // Update Bill Status View count badges
      const allBadge = document.getElementById('badgeBillViewAll');
      const paidBadge = document.getElementById('badgeBillViewPaid');
      const unpaidBadge = document.getElementById('badgeBillViewUnpaid');
      const outBadge = document.getElementById('badgeBillViewOutstanding');

      if (allBadge || paidBadge || unpaidBadge || outBadge) {
        const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
        const dbUnpaid = db.unpaid || [];
        const unpaidSet = new Set(dbUnpaid.map(u => String(u.invoice || u.billNo || u.invoiceNo || u.bill_no || '').trim().toLowerCase()).filter(Boolean));
        const today = new Date();
        today.setHours(0,0,0,0);

        const prevView = this._billStatusView;
        this._billStatusView = 'all';
        const baseFiltered = this.getFilteredOrders();
        this._billStatusView = prevView;

        let cAll = baseFiltered.length;
        let cPaid = 0, cUnpaid = 0, cOut = 0;
        baseFiltered.forEach(o => {
          const invStr = String(o.invoice_no || o.bill_no || o.invoiceNo || o.billNo || o.id || '').trim().toLowerCase();
          const p = (o.paymentStatus === 'Paid' || o.payment === 'Paid' || o.status === 'Delivered') && !unpaidSet.has(invStr);
          if (p) {
            cPaid++;
          } else {
            cUnpaid++;
            const d = new Date((o.date || o.dateTime || '').substring(0, 10) + 'T00:00:00');
            const days = !isNaN(d.getTime()) ? Math.max(0, Math.floor((today - d) / (1000 * 60 * 60 * 24))) : 0;
            if (days >= 1) cOut++;
          }
        });

        if (allBadge) allBadge.textContent = cAll.toLocaleString('en-IN');
        if (paidBadge) paidBadge.textContent = cPaid.toLocaleString('en-IN');
        if (unpaidBadge) unpaidBadge.textContent = cUnpaid.toLocaleString('en-IN');
        if (outBadge) outBadge.textContent = cOut.toLocaleString('en-IN');
      }

      const elOrders = document.getElementById('kpiTotalOrders');
      const elUnits = document.getElementById('kpiTotalUnits');
      const elTotal = document.getElementById('kpiTotalAmount');
      const elDeliveredAmt = document.getElementById('kpiDeliveredAmount');
      const elDeliveredCount = document.getElementById('kpiDeliveredCount');
      const elPartyCount = document.getElementById('kpiPartyCancelCount');
      const elPartyAmt = document.getElementById('kpiPartyCancelAmount');
      const elOwnCount = document.getElementById('kpiOwnCancelCount');
      const elOwnAmt = document.getElementById('kpiOwnCancelAmount');

      if (!elOrders) return;

      const totalOrders = filtered.length;
      const totalUnits = filtered.reduce((acc, o) => acc + (Number(o.qty) || 0), 0);
      const totalAmount = filtered.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

      const delivered = filtered.filter(o => o.status === 'Delivered');
      const deliveredAmt = delivered.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

      const customerCancelled = filtered.filter(o => (o.status && (o.status.includes('Customer') || o.status.includes('Party'))) || o.cancelType === 'party');
      const customerCancelAmt = customerCancelled.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

      const companyCancelled = filtered.filter(o => (o.status && (o.status.includes('Company') || o.status.includes('Own'))) || o.cancelType === 'own');
      const companyCancelAmt = companyCancelled.reduce((acc, o) => acc + (Number(o.total) || 0), 0);

      elOrders.textContent = totalOrders.toLocaleString('en-IN');
      if (elUnits) elUnits.textContent = `${totalUnits.toLocaleString('en-IN')} Units`;
      if (elTotal) elTotal.textContent = DS_App.money(totalAmount);

      if (elDeliveredAmt) elDeliveredAmt.textContent = DS_App.money(deliveredAmt);
      if (elDeliveredCount) elDeliveredCount.textContent = `${delivered.length} orders fulfilled`;

      if (elPartyCount) elPartyCount.textContent = customerCancelled.length;
      if (elPartyAmt) elPartyAmt.textContent = `${DS_App.money(customerCancelAmt)} (Customer)`;

      if (elOwnCount) elOwnCount.textContent = companyCancelled.length;
      if (elOwnAmt) elOwnAmt.textContent = `${DS_App.money(companyCancelAmt)} (Company)`;
    },

    renderReportTable: function () {
      const tbody = document.getElementById('orderReportsTableBody');
      if (!tbody) return;

      const filtered = this.getFilteredOrders();
      this.updateReportKPIs(filtered);

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:24px; color:var(--ds-text-muted);">No orders found matching the selected filters.</td></tr>';
        return;
      }

      const isAdmin = window.DS_Auth ? window.DS_Auth.isAdmin() : true;

      tbody.innerHTML = filtered.map(o => {
        let badgeClass = 'badge-submitted';
        let badgeText = o.status || 'Pending';
        let noteHtml = '';

        const st = String(o.status || 'Pending');
        if (st === 'Cancelled by Customer' || st === 'Cancelled by Party' || o.cancelType === 'party') {
          badgeClass = 'badge-cancelled-by-party';
          badgeText = '❌ Cancelled (Customer)';
          const r = o.cancelReason || o.cancelRemark || 'Customer Refused';
          noteHtml = `<div class="cancel-reason-note" title="${DS_App.escapeHtml(r)}">📝 ${DS_App.escapeHtml(r)}</div>`;
        } else if (st === 'Cancelled by Company/Admin' || st === 'Cancelled by Own' || o.cancelType === 'own') {
          badgeClass = 'badge-cancelled-by-own';
          badgeText = '⚠️ Cancelled (Company)';
          const r = o.cancelReason || o.cancelRemark || 'Company Issue';
          noteHtml = `<div class="cancel-reason-note own" title="${DS_App.escapeHtml(r)}">📝 ${DS_App.escapeHtml(r)}</div>`;
        } else if (st === 'Delivered') {
          badgeClass = 'badge-delivered';
          badgeText = '✓ Delivered';
        } else if (st === 'Dispatched') {
          badgeClass = 'badge-dispatched';
          badgeText = '🚚 Dispatched';
        } else if (st === 'Ready for Delivery') {
          badgeClass = 'badge-ready';
          badgeText = '📦 Ready for Delivery';
        } else if (st === 'Processing') {
          badgeClass = 'badge-processing';
          badgeText = '⏳ Processing';
        } else if (st === 'Confirmed' || st === 'Approved') {
          badgeClass = 'badge-approved';
          badgeText = '⚡ Confirmed';
        } else {
          badgeClass = 'badge-submitted';
          badgeText = '📋 Pending';
        }

        const isCancelled = st.includes('Cancelled') || o.cancelType;
        const isDelivered = st === 'Delivered';

        const adminNoteCount = Array.isArray(o.adminNotes) ? o.adminNotes.length : (o.admin_note ? 1 : 0);

        return `
          <tr>
            <td>
              <button type="button" class="btn btn-link" onclick="DS_Orders.viewOrderDetails('${o.id}')" style="padding:0; font-weight:800; font-size:13px; color:var(--ds-primary); text-decoration:none; cursor:pointer;" title="Click to view full order manifest & notes">
                ${o.id}
              </button>
              <div style="margin-top:2px;">
                <span class="badge" style="font-size:10.5px; padding:2px 7px; background:#eff6ff; color:#1d4ed8; font-weight:700; font-family:monospace;" title="Invoice / Bill No.">🧾 ${DS_App.escapeHtml(o.invoice_no || o.bill_no || o.invoiceNo || o.billNo || '-')}</span>
              </div>
            </td>
            <td>
              <div style="font-weight:600; font-size:12px;">${DS_App.formatDate(o.date)}</div>
              <div style="font-size:10px; color:var(--ds-text-muted);">${o.dateTime ? o.dateTime.split(' ')[1] : ''}</div>
            </td>
            <td>
              <strong style="color:var(--ds-text); font-size:13px;">${DS_App.escapeHtml(o.storeName || o.party)}</strong>
              ${o.location ? `<div style="font-size:11px; color:var(--ds-text-muted);">${DS_App.escapeHtml(o.location)}</div>` : ''}
            </td>
            <td>${DS_App.escapeHtml(o.route || '-')}</td>
            <td>
              <span style="font-weight:600;">${DS_App.escapeHtml(o.salesPerson || o.sales_person || '-')}</span>
            </td>
            <td class="num">${DS_App.qty(o.qty)}</td>
            <td class="num"><strong style="color:var(--ds-primary);">${DS_App.money(o.total)}</strong></td>
            <td>
              <span class="badge ${badgeClass}">${badgeText}</span>
              ${noteHtml}
              ${adminNoteCount > 0 ? `<div style="font-size:10px; color:#6366f1; margin-top:3px; font-weight:700;">🔒 ${adminNoteCount} Admin Note(s)</div>` : ''}
            </td>
            <td style="text-align:center;">
              <div style="display:flex; gap:4px; justify-content:center; flex-wrap:wrap;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="DS_Orders.viewOrderDetails('${o.id}')" title="View Items, Timeline & Remarks" style="padding:4px 8px; font-size:11px;">
                  👁️ View
                </button>
                <button type="button" class="btn btn-primary btn-sm" onclick="DS_Orders.copyOrderText('${o.id}')" title="Copy Order Slip for WhatsApp" style="padding:4px 8px; font-size:11px;">
                  📋 WhatsApp
                </button>
                ${!isCancelled && !isDelivered ? `
                  <button type="button" class="btn btn-danger btn-sm" onclick="DS_Orders.openCancelOrderModal('${o.id}')" title="Cancel this order with reason remark" style="padding:4px 8px; font-size:11px; background:#fff1f2; color:#be123c; border:1px solid #fecdd3;">
                    ❌ Cancel
                  </button>
                ` : isCancelled ? `
                  <button type="button" class="btn btn-secondary btn-sm" onclick="DS_Orders.openCancelOrderModal('${o.id}')" title="View or edit cancellation remark note" style="padding:4px 8px; font-size:11px; background:#f1f5f9; color:#475569;">
                    📝 Note
                  </button>
                  ${isAdmin ? `
                    <button type="button" class="btn btn-success btn-sm" onclick="DS_Orders.reopenOrder('${o.id}')" title="Reopen Cancelled Order (Admin Only)" style="padding:4px 8px; font-size:11px; background:#dcfce7; color:#15803d; border:1px solid #86efac;">
                      ↺ Reopen
                    </button>
                  ` : ''}
                ` : ''}
                ${isAdmin ? `
                  <button type="button" class="btn btn-secondary btn-sm" onclick="DS_Orders.openAdminNoteModal('${o.id}')" title="Add Confidential Admin Note" style="padding:4px 8px; font-size:11px; color:#4338ca;">
                    ✍️
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    },

    // ========================================================================
    // ORDER CANCELLATION CONTROLLER (Customer vs Company/Admin)
    // ========================================================================
    PRESET_REASONS: {
      party: [
        'Grahak / Store ne delivery lene se mana kar diya (Party Refused)',
        'Dukaan band mili / Shop closed during delivery',
        'Duplicate order punched / Dobara book hua',
        'Rate / Discount / Scheme vivad (Rate Dispute)',
        'Retailer ne local market se kharid liya (Bought from market)',
        'Party udhari / Cash payment me asmarth (Payment dispute)',
        'Grahak ne galat item bataya (Wrong item ordered by store)',
        'Store Overstocked / Pehle se stock maujood hai',
        'Other / Custom Reason (Niche remark me likhein)'
      ],
      own: [
        'Warehouse me stock khatam / Out of Stock shortage',
        'Party ka purana baki / Credit limit paar (Overdue Hold)',
        'Delivery gaadi kharab / Transport logistics delay',
        'Delivery route coverage kshetra se bahar (Route unserviceable)',
        'Sales Officer dwara galat store/item punch hua (Punching Error)',
        'Rate galti se galat dala gaya tha (Rate calculation error)',
        'Other / Custom Reason (Niche remark me likhein)'
      ]
    },

    openCancelOrderModal: function (orderId, preselectType) {
      const order = this.getOrderById(orderId);
      if (!order) {
        DS_App.toast('Order not found!', 'error');
        return;
      }

      const idInp = document.getElementById('cancelOrderId');
      if (idInp) idInp.value = orderId;

      const summaryCard = document.getElementById('cancelOrderSummaryCard');
      if (summaryCard) {
        summaryCard.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
            <div>
              <strong style="font-size:14px; color:var(--ds-text);">${order.id}</strong> — 
              <span style="font-weight:700;">${DS_App.escapeHtml(order.storeName || order.party)}</span>
              <div style="font-size:11px; color:var(--ds-text-muted); margin-top:2px;">
                Route: <strong>${DS_App.escapeHtml(order.route || '-')}</strong> • Booked By: <strong>${DS_App.escapeHtml(order.salesPerson || '-')}</strong>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:14px; font-weight:800; color:var(--ds-primary);">${DS_App.money(order.total)}</div>
              <div style="font-size:11px; color:var(--ds-text-muted);">${DS_App.qty(order.qty)} Units</div>
            </div>
          </div>
        `;
      }

      // Check preselect or existing cancelType
      let isCompany = false;
      if (preselectType && (preselectType.includes('Company') || preselectType.includes('Own') || preselectType === 'own')) {
        isCompany = true;
      } else if (order.cancelType === 'own' || (order.status && (order.status.includes('Company') || order.status.includes('Own')))) {
        isCompany = true;
      }

      const radioParty = document.getElementById('radioCancelParty');
      const radioOwn = document.getElementById('radioCancelOwn');
      if (isCompany) {
        if (radioOwn) radioOwn.checked = true;
      } else {
        if (radioParty) radioParty.checked = true;
      }

      this.populatePresetReasons(isCompany ? 'own' : 'party', order.cancelReason);

      const remarkInp = document.getElementById('cancelOrderRemark');
      if (remarkInp) {
        remarkInp.value = order.cancelRemark || order.cancelReason || '';
      }

      DS_App.openModal('cancelOrderModal');
    },

    closeCancelOrderModal: function () {
      DS_App.closeModal('cancelOrderModal');
    },

    handleCancelTypeChange: function (type) {
      const isCompany = type.includes('Company') || type.includes('Own');
      this.populatePresetReasons(isCompany ? 'own' : 'party');
    },

    populatePresetReasons: function (kind, selectedReason) {
      const sel = document.getElementById('cancelPresetReason');
      if (!sel) return;

      const list = this.PRESET_REASONS[kind] || this.PRESET_REASONS.party;
      sel.innerHTML = list.map(r => `<option value="${DS_App.escapeHtml(r)}" ${selectedReason === r ? 'selected' : ''}>${DS_App.escapeHtml(r)}</option>`).join('');

      if (!selectedReason && list.length) {
        const remarkInp = document.getElementById('cancelOrderRemark');
        if (remarkInp && !remarkInp.value) {
          remarkInp.value = list[0];
        }
      }
    },

    handlePresetReasonSelect: function (val) {
      const remarkInp = document.getElementById('cancelOrderRemark');
      if (remarkInp) {
        remarkInp.value = val;
      }
    },

    confirmCancelOrder: async function (e) {
      if (e && e.preventDefault) e.preventDefault();

      const orderId = document.getElementById('cancelOrderId')?.value;
      if (!orderId) return;

      const cancelTypeRadio = document.querySelector('input[name="cancelTypeRadio"]:checked')?.value || 'Cancelled by Customer';
      const isCustomer = cancelTypeRadio.includes('Customer') || cancelTypeRadio.includes('Party');
      const cancelType = isCustomer ? 'Customer' : 'Company/Admin';
      const newStatus = isCustomer ? 'Cancelled by Customer' : 'Cancelled by Company/Admin';

      const presetReason = document.getElementById('cancelPresetReason')?.value || '';
      const customRemark = (document.getElementById('cancelOrderRemark')?.value || '').trim();

      if (!customRemark) {
        DS_App.toast('Cancellation remarks / note is mandatory! Please provide the reason details.', 'error');
        return;
      }

      const orders = window.DS_Storage.getOrders();
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        DS_App.toast('Order not found!', 'error');
        return;
      }

      const activeUser = window.DS_Auth && window.DS_Auth.getUser() ? window.DS_Auth.getUser() : { name: 'Admin', id: 'ADMIN-1' };

      // Sync with backend API
      if (window.DS_API && typeof window.DS_API.cancelOrder === 'function') {
        try {
          await window.DS_API.cancelOrder(orderId, cancelType, presetReason, customRemark, activeUser.name, activeUser.id);
        } catch (err) {
          console.warn('[DS_Orders] Backend cancelOrder call notice:', err);
        }
      }

      // Record cancellation audit fields
      order.previous_status = order.status || 'Pending';
      order.status = newStatus;
      order.cancelType = isCustomer ? 'party' : 'own';
      order.cancelReason = presetReason;
      order.cancelRemark = customRemark;
      order.cancelledBy = activeUser.name;
      order.cancelled_by_user = activeUser.name;
      order.cancelled_by_id = activeUser.id;
      order.cancelledAt = new Date().toISOString();

      // Stock auto-restoration
      if (!order.stockRestored && Array.isArray(order.items)) {
        const db = window.DS_Storage.getDB();
        if (db && Array.isArray(db.stock)) {
          order.items.forEach(ci => {
            const st = db.stock.find(s => s.code === ci.code || (s.name && ci.name && s.name.toLowerCase() === ci.name.toLowerCase()));
            if (st) {
              st.stock = (Number(st.stock) || 0) + (Number(ci.qty) || 0);
              if (st.value !== undefined && st.rate) {
                st.value = Number((st.stock * st.rate).toFixed(2));
              }
            }
          });
          order.stockRestored = true;
          window.DS_Storage.saveDB(db);
        }
      }

      window.DS_Storage.saveOrders(orders);

      this.closeCancelOrderModal();
      this.renderReportTable();
      this.renderRecentOrdersTable();

      if (window.DS_Dispatch && typeof window.DS_Dispatch.renderApprovalTable === 'function') {
        window.DS_Dispatch.renderApprovalTable();
      }

      DS_App.toast(`✓ Order ${orderId} marked as ${newStatus}. Stock restored!`, 'success');
    },

    reopenOrder: async function (orderId) {
      if (!window.DS_Auth.isAdmin()) {
        DS_App.toast('Permission Denied: Only administrators can reopen cancelled orders!', 'error');
        return;
      }

      const orders = window.DS_Storage.getOrders();
      const order = orders.find(o => o.id === orderId);
      if (!order) {
        DS_App.toast('Order not found!', 'error');
        return;
      }

      if (!confirm(`Are you sure you want to reopen cancelled order "${orderId}"?\n\nThis will restore the order to active status and re-deduct required SKU stock from inventory.`)) {
        return;
      }

      const activeUser = window.DS_Auth.getUser() || { name: 'Admin', id: 'ADMIN-1' };

      // Call backend API
      if (window.DS_API && typeof window.DS_API.reopenOrder === 'function') {
        try {
          await window.DS_API.reopenOrder(orderId, activeUser.name, activeUser.id, 'Reopened by Admin');
        } catch (err) {
          console.warn('[DS_Orders] Backend reopenOrder notice:', err);
        }
      }

      // Re-deduct stock if it was previously restored
      if (order.stockRestored && Array.isArray(order.items)) {
        const db = window.DS_Storage.getDB();
        if (db && Array.isArray(db.stock)) {
          order.items.forEach(ci => {
            const st = db.stock.find(s => s.code === ci.code || (s.name && ci.name && s.name.toLowerCase() === ci.name.toLowerCase()));
            if (st) {
              st.stock = Math.max(0, (Number(st.stock) || 0) - (Number(ci.qty) || 0));
              if (st.value !== undefined && st.rate) {
                st.value = Number((st.stock * st.rate).toFixed(2));
              }
            }
          });
          order.stockRestored = false;
          window.DS_Storage.saveDB(db);
        }
      }

      const restoredStatus = order.previous_status || 'Pending';
      order.status = restoredStatus;
      delete order.cancelType;
      order.reopenedAt = new Date().toISOString();
      order.reopenedBy = activeUser.name;

      window.DS_Storage.saveOrders(orders);

      this.renderReportTable();
      this.renderRecentOrdersTable();
      if (window.DS_Dispatch && typeof window.DS_Dispatch.renderApprovalTable === 'function') {
        window.DS_Dispatch.renderApprovalTable();
      }

      DS_App.toast(`✓ Order ${orderId} reopened successfully. Status restored to ${restoredStatus}.`, 'success');
    },

    openAdminNoteModal: function (orderId) {
      const order = this.getOrderById(orderId);
      if (!order) return;

      const idInp = document.getElementById('adminNoteOrderId');
      if (idInp) idInp.value = orderId;

      const summary = document.getElementById('adminNoteOrderSummary');
      if (summary) {
        summary.innerHTML = `Order: <strong>${order.id}</strong> • Retailer: <strong>${DS_App.escapeHtml(order.storeName || order.party)}</strong> • Total: <strong>${DS_App.money(order.total)}</strong>`;
      }

      const txt = document.getElementById('adminNoteText');
      if (txt) {
        txt.value = '';
        setTimeout(() => txt.focus(), 150);
      }

      DS_App.openModal('adminNoteModal');
    },

    closeAdminNoteModal: function () {
      DS_App.closeModal('adminNoteModal');
    },

    saveAdminNote: async function (e) {
      if (e && e.preventDefault) e.preventDefault();

      const orderId = document.getElementById('adminNoteOrderId')?.value;
      const note = (document.getElementById('adminNoteText')?.value || '').trim();

      if (!orderId || !note) {
        DS_App.toast('Please write a note before saving!', 'error');
        return;
      }

      const orders = window.DS_Storage.getOrders();
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const activeUser = window.DS_Auth && window.DS_Auth.getUser() ? window.DS_Auth.getUser() : { name: 'Admin' };

      // Sync with backend API
      if (window.DS_API && typeof window.DS_API.addOrderAdminNote === 'function') {
        try {
          await window.DS_API.addOrderAdminNote(orderId, note, activeUser.name);
        } catch (err) {
          console.warn('[DS_Orders] addOrderAdminNote notice:', err);
        }
      }

      if (!Array.isArray(order.adminNotes)) order.adminNotes = [];
      order.adminNotes.push({
        note: note,
        created_at: new Date().toISOString(),
        admin_user: activeUser.name
      });
      order.admin_note = note;

      window.DS_Storage.saveOrders(orders);
      this.closeAdminNoteModal();
      this.renderReportTable();

      DS_App.toast(`✓ Admin note saved to order ${orderId}`, 'success');
    },

    // ========================================================================
    // ORDER DETAILS & ITEM MANIFEST MODAL
    // ========================================================================
    viewOrderDetails: async function (orderId) {
      const order = this.getOrderById(orderId);
      if (!order) {
        DS_App.toast('Order not found', 'error');
        return;
      }

      const subTitle = document.getElementById('orderDetailsSubtitle');
      if (subTitle) {
        subTitle.textContent = `${order.id} • ${DS_App.formatDate(order.date)} • ${order.storeName || order.party}`;
      }

      const body = document.getElementById('orderDetailsBody');
      if (body) {
        const items = order.items || [];
        const isCancelled = (order.status || '').includes('Cancelled') || order.cancelType;
        const isAdmin = window.DS_Auth ? window.DS_Auth.isAdmin() : true;

        // Fetch backend order history timeline
        let backendHistory = [];
        if (window.DS_API && typeof window.DS_API.getOrderHistory === 'function') {
          try {
            const hRes = await window.DS_API.getOrderHistory(orderId);
            if (hRes && hRes.history) backendHistory = hRes.history;
          } catch (e) {}
        }

        const stages = ['Pending', 'Confirmed', 'Processing', 'Ready for Delivery', 'Dispatched', 'Delivered'];
        const currentStageIdx = stages.indexOf(order.status);

        body.innerHTML = `
          <!-- Header Overview Card -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px; margin-bottom:14px;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
              <div>
                <h4 style="margin:0 0 4px; font-size:16px; color:var(--ds-text);">${DS_App.escapeHtml(order.storeName || order.party)}</h4>
                <div style="font-size:12px; color:var(--ds-text-muted);">
                  📍 Route: <strong>${DS_App.escapeHtml(order.route || '-')}</strong> • Sales Officer: <strong>${DS_App.escapeHtml(order.salesPerson || '-')}</strong>
                </div>
                <div style="font-size:12.5px; color:var(--ds-text); margin-top:4px;">
                  <strong>Invoice / Bill No:</strong> <span style="font-family:monospace; color:#1d4ed8; font-weight:800; background:#eff6ff; padding:2px 8px; border-radius:4px; font-size:12px;">🧾 ${DS_App.escapeHtml(order.invoice_no || order.bill_no || 'Pending')}</span>
                </div>
                ${order.givenName ? `<div style="font-size:12px; color:var(--ds-text-muted); margin-top:2px;">Contact: ${DS_App.escapeHtml(order.givenName)} (${order.givenContact || '-'})</div>` : ''}
              </div>
              <div style="text-align:right;">
                <span class="badge ${isCancelled ? 'badge-cancelled-by-party' : order.status === 'Delivered' ? 'badge-delivered' : 'badge-submitted'}" style="font-size:12px; padding:4px 10px;">
                  ${order.status || 'Pending'}
                </span>
                <div style="font-size:18px; font-weight:800; color:var(--ds-primary); margin-top:4px;">${DS_App.money(order.total)}</div>
                <div style="font-size:11px; color:var(--ds-text-muted);">${DS_App.qty(order.qty)} Total Units</div>
              </div>
            </div>
          </div>

          <!-- Order Lifecycle Progress Bar (if not cancelled) -->
          ${!isCancelled ? `
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:12px; margin-bottom:14px;">
              <div style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:10px;">
                🔄 Order Fulfillment Lifecycle
              </div>
              <div style="display:flex; justify-content:space-between; position:relative; gap:4px;">
                ${stages.map((stName, idx) => {
                  const isDone = currentStageIdx >= idx;
                  const isCurrent = currentStageIdx === idx;
                  return `
                    <div style="flex:1; text-align:center; position:relative;">
                      <div style="width:24px; height:24px; border-radius:50%; margin:0 auto 4px; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; background:${isDone ? '#15803d' : '#e2e8f0'}; color:${isDone ? '#ffffff' : '#64748b'};">
                        ${isDone ? '✓' : idx + 1}
                      </div>
                      <div style="font-size:10px; font-weight:${isCurrent ? '800' : '500'}; color:${isCurrent ? '#1e3a8a' : '#64748b'};">
                        ${stName}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Cancellation Alert Box if Cancelled -->
          ${isCancelled ? `
            <div style="background:${order.cancelType === 'own' ? '#f5f3ff' : '#fff1f2'}; border:1px solid ${order.cancelType === 'own' ? '#ddd6fe' : '#fecdd3'}; border-radius:10px; padding:14px 16px; margin-bottom:14px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                <strong style="color:${order.cancelType === 'own' ? '#5b21b6' : '#9f1239'}; font-size:14px;">
                  ${order.cancelType === 'own' ? '⚠️ Cancelled by Company / Admin' : '❌ Cancelled by Customer'}
                </strong>
                ${isAdmin ? `
                  <button type="button" class="btn btn-success btn-sm" onclick="DS_Orders.closeOrderDetailsModal(); DS_Orders.reopenOrder('${order.id}');" style="padding:3px 8px; font-size:11px;">
                    ↺ Reopen Order
                  </button>
                ` : ''}
              </div>
              <div style="font-size:12.5px; color:var(--ds-text); margin-top:4px;">
                <strong>Reason Category:</strong> ${DS_App.escapeHtml(order.cancelReason || 'Customer Refused')}
              </div>
              <div style="font-size:12.5px; color:var(--ds-text); margin-top:2px;">
                <strong>Mandatory Remark / Note:</strong> ${DS_App.escapeHtml(order.cancelRemark || '-')}
              </div>
              <div style="font-size:11px; color:var(--ds-text-muted); margin-top:8px; border-top:1px dashed #cbd5e1; padding-top:6px;">
                Cancelled by: <strong>${DS_App.escapeHtml(order.cancelledBy || order.cancelled_by_user || 'Admin')}</strong> (${order.cancelled_by_id || 'ADMIN'}) • At: <strong>${order.cancelledAt ? DS_App.formatDate(order.cancelledAt) : '-'}</strong>
                ${order.stockRestored ? ' • <span style="color:#15803d; font-weight:700;">✓ Warehouse Inventory Restored</span>' : ''}
              </div>
            </div>
          ` : ''}

          <!-- Admin Notes Section -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; margin-bottom:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <strong style="font-size:12px; color:#4338ca; text-transform:uppercase;">🔒 Confidential Admin Internal Notes</strong>
              ${isAdmin ? `
                <button type="button" class="btn btn-secondary btn-sm" onclick="DS_Orders.openAdminNoteModal('${order.id}')" style="font-size:11px; padding:2px 8px; color:#4338ca;">
                  ➕ Add Admin Note
                </button>
              ` : ''}
            </div>
            ${Array.isArray(order.adminNotes) && order.adminNotes.length ? `
              <div style="display:flex; flex-direction:column; gap:6px;">
                ${order.adminNotes.map(an => `
                  <div style="background:#ffffff; border:1px solid #e0e7ff; border-radius:6px; padding:8px 10px; font-size:12px;">
                    <div style="color:#1e293b;">${DS_App.escapeHtml(an.note)}</div>
                    <div style="font-size:10px; color:#6366f1; margin-top:4px;">
                      By <strong>${DS_App.escapeHtml(an.admin_user || 'Admin')}</strong> • ${an.created_at ? DS_App.formatDate(an.created_at) : ''}
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div style="font-size:11px; color:#94a3b8; font-style:italic;">No internal notes added yet.</div>
            `}
          </div>

          <!-- Items Manifest Table -->
          <div style="font-size:12px; font-weight:800; text-transform:uppercase; color:var(--ds-text-muted); margin-bottom:6px;">
            🛒 Ordered FMCG SKUs (${items.length} Items)
          </div>
          <div class="ds-table-wrap" style="border:1px solid #e2e8f0; border-radius:8px; margin-bottom:14px;">
            <table class="ds-table" style="font-size:12px;">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item / Product Name</th>
                  <th>Brand</th>
                  <th class="num">Unit Price</th>
                  <th class="num">Booking Qty</th>
                  <th class="num">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((it, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td><strong>${DS_App.escapeHtml(it.name || it.item || '-')}</strong></td>
                    <td><span class="badge" style="background:#e0f2fe; color:#0369a1; font-size:10px;">${DS_App.escapeHtml(it.brand || '-')}</span></td>
                    <td class="num">${DS_App.money(it.price || it.rate)}</td>
                    <td class="num"><strong>${DS_App.qty(it.qty)} ${it.unit || ''}</strong></td>
                    <td class="num"><strong>${DS_App.money(it.total || (it.qty * (it.price || it.rate || 0)))}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Status Audit Trail Timeline -->
          ${backendHistory.length ? `
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:12px;">
              <strong style="font-size:12px; color:#475569; text-transform:uppercase; display:block; margin-bottom:8px;">
                📜 Order Status Audit Trail
              </strong>
              <div style="font-size:11px; display:flex; flex-direction:column; gap:6px;">
                ${backendHistory.map(h => `
                  <div style="border-left:2px solid #3b82f6; padding-left:8px;">
                    <span style="font-weight:700;">${h.to_status}</span> 
                    <span style="color:#64748b;">(from ${h.from_status || 'Initial'})</span>
                    <span style="color:#94a3b8;"> • by ${h.changed_by} at ${h.created_at}</span>
                    ${h.remarks ? `<div style="color:#334155; font-style:italic;">"${DS_App.escapeHtml(h.remarks)}"</div>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        `;
      }

      const actionsWrap = document.getElementById('orderDetailsFooterActions');
      if (actionsWrap) {
        const isCancelled = (order.status || '').includes('Cancelled') || order.cancelType;
        const isDelivered = order.status === 'Delivered';
        const isAdmin = window.DS_Auth ? window.DS_Auth.isAdmin() : true;

        actionsWrap.innerHTML = `
          <button type="button" class="btn btn-primary btn-sm" onclick="DS_Orders.copyOrderText('${order.id}')">
            📋 WhatsApp Slip
          </button>
          ${isCancelled && isAdmin ? `
            <button type="button" class="btn btn-success btn-sm" onclick="DS_Orders.closeOrderDetailsModal(); DS_Orders.reopenOrder('${order.id}');" style="background:#15803d; color:#fff;">
              ↺ Reopen Order
            </button>
          ` : ''}
          ${!isCancelled && !isDelivered ? `
            <button type="button" class="btn btn-danger btn-sm" onclick="DS_Orders.closeOrderDetailsModal(); DS_Orders.openCancelOrderModal('${order.id}');" style="background:#be123c; border-color:#be123c; color:#fff;">
              ❌ Cancel Order
            </button>
          ` : ''}
        `;
      }

      DS_App.openModal('orderDetailsModal');
    },

    closeOrderDetailsModal: function () {
      DS_App.closeModal('orderDetailsModal');
    },

    // ========================================================================
    // EXPORT TO EXCEL
    // ========================================================================
    exportOrdersToExcel: function () {
      if (typeof XLSX === 'undefined') {
        DS_App.toast('Excel export library not loaded', 'error');
        return;
      }
      const orders = this.getFilteredOrders();
      if (!orders.length) {
        DS_App.toast('No orders to export matching current filters!', 'warning');
        return;
      }

      function safeCell(v) {
        let s = String(v ?? '').trim();
        if (/^[=+\-@\t\r]/.test(s)) {
          return "'" + s;
        }
        return s;
      }

      const rows = orders.map(o => ({
        'Order ID': safeCell(o.id),
        'Date': safeCell(o.date),
        'Time': safeCell(o.dateTime ? o.dateTime.split(' ')[1] : ''),
        'Party / Store Name': safeCell(o.storeName || o.party || ''),
        'Beat Route': safeCell(o.route || ''),
        'Sales Officer': safeCell(o.salesPerson || o.sales_person || ''),
        'Contact Person': safeCell(o.givenName || o.contact_person || ''),
        'Phone': safeCell(o.givenContact || o.contact_phone || ''),
        'Units': Number(o.qty) || 0,
        'Total Amount (₹)': Number(o.total) || 0,
        'Status': safeCell(o.status || 'Pending'),
        'Payment Status': safeCell(o.payment || 'Unpaid'),
        'Cancel Type': safeCell(o.cancelType || (o.status && o.status.includes('Customer') ? 'Customer' : o.status && o.status.includes('Company') ? 'Company/Admin' : '')),
        'Cancel Category': safeCell(o.cancelReason || ''),
        'Cancel Remark / Note': safeCell(o.cancelRemark || ''),
        'Cancelled By': safeCell(o.cancelledBy || o.cancelled_by_user || ''),
        'Cancelled At': safeCell(o.cancelledAt ? DS_App.formatDate(o.cancelledAt) : ''),
        'Admin Notes Count': Array.isArray(o.adminNotes) ? o.adminNotes.length : (o.admin_note ? 1 : 0)
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Orders_Report');
      const filename = `DS_Orders_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      DS_App.toast(`✓ Exported ${orders.length} orders to ${filename}`, 'success');
    }
  };

  window.DS_Orders = DS_Orders;

  if (document.getElementById('orderCatalogList')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => DS_Orders.initPunching());
    } else {
      DS_Orders.initPunching();
    }
  }

  if (document.getElementById('orderReportsTableBody')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => DS_Orders.initReports());
    } else {
      DS_Orders.initReports();
    }
  }

})(window);
