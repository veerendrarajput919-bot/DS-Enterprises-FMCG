/**
 * ==========================================================================
 * DS ENTERPRISES — DASHBOARD CONTROLLER & VISIBILITY ENGINE
 * File: assets/js/dashboard.js
 * Architecture: Executive KPIs, Dynamic Chart.js Analytics (5 Charts),
 *               Assigned Beat Retailers Network, Retailer Profile Modal,
 *               Activity Feeds & Hide/Unhide Customization Engine
 * ==========================================================================
 */

(function (window) {
  'use strict';

  let trendChartInstance = null;
  let brandChartInstance = null;
  let categoryChartInstance = null;
  let orderPerfChartInstance = null;
  let collectionChartInstance = null;

  const isPagesDir = window.location.pathname.includes('/pages/');
  const pagePrefix = isPagesDir ? '' : 'pages/';

  const WIDGET_DEFINITIONS = {
    // 6 Priority Primary KPI Tiles in requested sequence
    'kpi-total-sales': { label: 'Total Sales', group: 'primary', default: true },
    'kpi-outstanding': { label: 'Total Receivable', group: 'primary', default: true },
    'kpi-today-orders': { label: "Today's Orders", group: 'primary', default: true },
    'kpi-total-bills': { label: 'Total Bills', group: 'primary', default: true },
    'kpi-total-invoices': { label: 'Total Invoices', group: 'primary', default: true },
    'kpi-total-routes': { label: 'Total Delivery Routes', group: 'primary', default: true },

    // Remaining KPI Tiles
    'kpi-pending-orders': { label: 'Pending Orders', group: 'cards', default: true },
    'kpi-delivered-orders': { label: 'Delivered Orders', group: 'cards', default: true },
    'kpi-assigned-deliveries': { label: 'Assigned Delivery Stops', group: 'cards', default: true },
    'kpi-pending-dispatch': { label: 'Unassigned Delivery Orders', group: 'cards', default: true },
    'kpi-cancel-customer': { label: 'Cancelled by Customer', group: 'cards', default: true },
    'kpi-cancel-company': { label: 'Cancelled by Company/Own', group: 'cards', default: true },
    'kpi-import-success': { label: 'Successful Excel Imports', group: 'cards', default: true },
    'kpi-import-failed': { label: 'Failed Excel Imports', group: 'cards', default: true },

    // Dashboard Sections
    'section-admin-banner': { label: 'Admin Staff Registration Banner', group: 'sections', default: true },
    'section-so-hero': { label: 'Sales Officer Target Hero Card', group: 'sections', default: true },
    'section-quick-actions': { label: 'Quick Action Shortcuts Bar', group: 'sections', default: true },
    'section-charts': { label: 'Sales Analytics & Visualizations (5 Charts)', group: 'sections', default: true },
    'section-beat-stores': { label: "Assigned Beat Retailers Network", group: 'sections', default: true },
    'section-recent-orders': { label: 'Recent Punched Orders & Top Brands', group: 'sections', default: true },
    'section-low-stock': { label: 'Low Stock Warehouse Alerts', group: 'sections', default: true }
  };

  const DS_Dashboard = {
    render: function () {
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { sales: [], unpaid: [], stock: [], party: [] };
      const orders = window.DS_Storage ? window.DS_Storage.getOrders() : [];
      const officers = window.DS_Storage ? window.DS_Storage.getOfficers() : [];
      const isSo = window.DS_Auth ? window.DS_Auth.isSo() : false;

      this.renderKPIs(db, orders, officers);

      if (isSo) {
        this.renderSoHero(db, officers);
        this.renderBeatStores(db, true);
      } else {
        const hero = document.getElementById('dsSoHeroSection');
        if (hero) hero.style.display = 'none';
        this.renderBeatStores(db, false);
      }

      this.renderRecentOrders(orders);
      this.renderTopBrands(db);
      this.renderLowStockList(db);
      this.renderCharts(db, orders);

      // Apply persistent user display/customization preferences
      this.applyVisibilityPreferences();
    },

    // ============================================================
    // 1. DYNAMIC KPI CALCULATION ENGINE
    // ============================================================
    renderKPIs: async function (db, orders, officers) {
      const setTxt = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };

      // 1. Try fetching backend live aggregated metrics if online
      if (window.DS_API && window.DS_API.getDashboardKPIs) {
        try {
          const metrics = await window.DS_API.getDashboardKPIs();
          if (metrics) {
            setTxt('kpiTotalBills', `${metrics.total_bills?.value ?? 0} Bills`);
            setTxt('kpiTotalBillsSub', `${metrics.total_bills?.value ?? 0} Active Ledger`);

            setTxt('kpiTotalInvoices', `${metrics.total_invoices?.value ?? 0} Invoices`);
            setTxt('kpiTotalInvoicesSub', 'Tax Invoices');

            setTxt('kpiTodayOrders', `${metrics.today_orders?.value ?? 0} Orders`);
            setTxt('kpiTodayOrdersSub', `${metrics.today_orders?.value ?? 0} Live Field Bookings`);

            setTxt('kpiPendingOrders', `${metrics.pending_orders?.value ?? 0} Orders`);
            setTxt('kpiPendingOrdersSub', 'Awaiting Fulfillment');

            setTxt('kpiDeliveredOrders', `${metrics.delivered_orders?.value ?? 0} Orders`);
            setTxt('kpiDeliveredOrdersSub', 'Fulfilled & Closed');

            setTxt('kpiCancelCustomer', `${metrics.cancelled_by_customer?.value ?? 0} Orders`);
            if (metrics.cancelled_by_customer?.amount > 0) {
              setTxt('kpiCancelCustomerSub', `${DS_App.money(metrics.cancelled_by_customer.amount)} Denied`);
            } else {
              setTxt('kpiCancelCustomerSub', 'Party Denied');
            }

            setTxt('kpiCancelCompany', `${metrics.cancelled_by_company?.value ?? 0} Orders`);
            if (metrics.cancelled_by_company?.amount > 0) {
              setTxt('kpiCancelCompanySub', `${DS_App.money(metrics.cancelled_by_company.amount)} Internal`);
            } else {
              setTxt('kpiCancelCompanySub', 'Internal Reason');
            }

            setTxt('kpiTotalSales', DS_App.money(metrics.total_sales?.value ?? 0));
            setTxt('kpiTotalSalesSub', metrics.total_sales?.mtd ? `MTD: ${DS_App.money(metrics.total_sales.mtd)}` : 'Gross Billed Value');

            setTxt('kpiOutstanding', DS_App.money(metrics.pending_payments?.value ?? 0));
            setTxt('kpiOutstandingSub', 'Market Receivables');

            setTxt('kpiTotalRoutes', `${metrics.total_delivery_routes?.value ?? 0} Routes`);
            setTxt('kpiTotalRoutesSub', 'Active Beat Coverage');

            setTxt('kpiAssignedDeliveries', `${metrics.assigned_deliveries?.value ?? 0} Stops`);
            setTxt('kpiAssignedDeliveriesSub', 'Driver Allocated');

            setTxt('kpiUnassignedDeliveries', `${metrics.unassigned_deliveries?.value ?? 0} Orders`);
            setTxt('kpiPendingDispatch', `${metrics.unassigned_deliveries?.value ?? 0} Orders`);
            setTxt('kpiPendingDispatchSub', 'Awaiting Van Load');

            setTxt('kpiImportSuccess', `${metrics.successful_excel_imports?.value ?? 0} Batches`);
            setTxt('kpiImportSuccessSub', 'Ingested & Synced');

            setTxt('kpiImportFailed', `${metrics.failed_excel_imports?.value ?? 0} Batches`);
            setTxt('kpiImportFailedSub', 'Validation Errors');
            return;
          }
        } catch (e) {
          console.warn('[Dashboard] Backend metrics fallback to dynamic local:', e);
        }
      }

      // 2. Offline Dynamic Calculation from existing dataset
      const todayStr = new Date().toISOString().slice(0, 10);
      const sales = db.sales || [];
      const unpaid = db.unpaid || [];

      // Total Bills & Invoices
      const billSet = new Set(sales.map(s => s.billNo || s.bill_no || s.invoiceNo || s.invoice_no).filter(Boolean));
      const totalBillsCount = billSet.size || sales.length;
      const totalInvoicesCount = sales.length;

      // Sales Turnover & Outstanding
      const totalSales = sales.reduce((acc, s) => acc + (Number(s.amount ?? s.AmountNum ?? s.total_amount) || 0), 0);
      const totalOutstanding = unpaid.reduce((acc, u) => acc + (Number(u.balanceAmount || u.totalAmount || u.amount) || 0), 0);

      // Orders Breakdown
      const todayOrders = (orders || []).filter(o => (o.date === todayStr || (o.dateTime && o.dateTime.startsWith(todayStr)))).length;
      const pendingOrders = (orders || []).filter(o => ['Submitted', 'Pending', 'Confirmed', 'Processing'].includes(o.status)).length;
      const deliveredOrders = (orders || []).filter(o => o.status === 'Delivered').length;
      const cancelCustOrders = (orders || []).filter(o => o.status === 'Cancelled by Customer' || o.cancelType === 'party');
      const cancelCoOrders = (orders || []).filter(o => o.status === 'Cancelled by Company/Admin' || o.cancelType === 'own');

      // Delivery Routes & Assignments
      const routes = window.DS_Storage && typeof window.DS_Storage.getDeliveryRoutes === 'function' ? window.DS_Storage.getDeliveryRoutes(todayStr) : [];
      const uniqueRouteNames = new Set([
        ...(routes || []).map(r => r.name || r.id),
        ...((db.party || []).map(p => p.route).filter(Boolean))
      ]);
      const totalRoutesCount = uniqueRouteNames.size || 5;

      const assignments = window.DS_Storage && typeof window.DS_Storage.getDeliveryAssignments === 'function' ? window.DS_Storage.getDeliveryAssignments() : [];
      const assignedStopsCount = (assignments || []).filter(a => a.status !== 'Cancelled').length;
      const unassignedOrdersCount = (orders || []).filter(o => ['Ready for Delivery', 'Approved', 'Confirmed', 'Submitted', 'Pending'].includes(o.status) && !assignments.some(a => a.order_id === o.id)).length;

      // Excel Import Batches
      const batches = window.DS_Storage && typeof window.DS_Storage.getImportBatches === 'function' ? window.DS_Storage.getImportBatches() : [];
      const successBatches = (batches || []).filter(b => b.status === 'Success' || b.status === 'Completed').length || 1;
      const failedBatches = (batches || []).filter(b => b.status === 'Failed' || b.status === 'Error').length || 0;

      // Update All 14 KPI Cards & Badges
      setTxt('kpiTotalBills', `${totalBillsCount} Bills`);
      setTxt('kpiTotalBillsSub', `${totalBillsCount} Active Ledger`);

      setTxt('kpiTotalInvoices', `${totalInvoicesCount} Invoices`);
      setTxt('kpiTotalInvoicesSub', 'Tax Invoices');

      setTxt('kpiTodayOrders', `${todayOrders} Orders`);
      setTxt('kpiTodayOrdersSub', todayOrders > 0 ? `${todayOrders} Placed Today` : 'Live Field Bookings');

      setTxt('kpiPendingOrders', `${pendingOrders} Orders`);
      setTxt('kpiPendingOrdersSub', 'Awaiting Fulfillment');

      setTxt('kpiDeliveredOrders', `${deliveredOrders} Orders`);
      setTxt('kpiDeliveredOrdersSub', 'Fulfilled & Closed');

      setTxt('kpiCancelCustomer', `${cancelCustOrders.length} Orders`);
      const cancelCustSum = cancelCustOrders.reduce((sum, o) => sum + (Number(o.total || o.amount) || 0), 0);
      setTxt('kpiCancelCustomerSub', cancelCustSum > 0 ? `${DS_App.money(cancelCustSum)} Denied` : 'Party Denied');

      setTxt('kpiCancelCompany', `${cancelCoOrders.length} Orders`);
      const cancelCoSum = cancelCoOrders.reduce((sum, o) => sum + (Number(o.total || o.amount) || 0), 0);
      setTxt('kpiCancelCompanySub', cancelCoSum > 0 ? `${DS_App.money(cancelCoSum)} Internal` : 'Internal Reason');

      setTxt('kpiTotalSales', DS_App.money(totalSales));
      setTxt('kpiTotalSalesSub', 'Gross Billed Value');

      setTxt('kpiOutstanding', DS_App.money(totalOutstanding));
      setTxt('kpiOutstandingSub', 'Market Receivables');

      setTxt('kpiTotalRoutes', `${totalRoutesCount} Routes`);
      setTxt('kpiTotalRoutesSub', 'Active Beat Coverage');

      setTxt('kpiAssignedDeliveries', `${assignedStopsCount} Stops`);
      setTxt('kpiAssignedDeliveriesSub', 'Driver Allocated');

      setTxt('kpiUnassignedDeliveries', `${unassignedOrdersCount} Orders`);
      setTxt('kpiPendingDispatch', `${unassignedOrdersCount} Orders`);
      setTxt('kpiPendingDispatchSub', 'Awaiting Van Load');

      setTxt('kpiImportSuccess', `${successBatches} Batches`);
      setTxt('kpiImportSuccessSub', 'Ingested & Synced');

      setTxt('kpiImportFailed', `${failedBatches} Batches`);
      setTxt('kpiImportFailedSub', 'Validation Errors');
    },

    // ============================================================
    // 2. SALES OFFICER HERO SECTION
    // ============================================================
    renderSoHero: function (db, officers) {
      const hero = document.getElementById('dsSoHeroSection');
      if (!hero) return;

      const activeSo = window.DS_Auth.getActiveSo();
      const soSales = (db.sales || []).filter(s => s.soId === activeSo.id || s.salesPerson === activeSo.name);
      const achieved = soSales.reduce((acc, s) => acc + (Number(s.amount ?? s.AmountNum) || 0), 0);
      const target = Number(activeSo.target) || 300000;
      const pct = Math.min(100, Math.round((achieved / (target || 1)) * 100));

      const titleEl = document.getElementById('soHeroName');
      if (titleEl) titleEl.textContent = activeSo.name;

      const routeEl = document.getElementById('soHeroRoute');
      if (routeEl) routeEl.textContent = `Assigned Beat: ${activeSo.route} | Phone: ${activeSo.phone}`;

      const targetText = document.getElementById('soTargetText');
      if (targetText) targetText.textContent = `${DS_App.money(achieved)} of ${DS_App.money(target)} (${pct}%)`;

      const fill = document.getElementById('soTargetBarFill');
      if (fill) fill.style.width = `${pct}%`;
    },

    // ============================================================
    // 3. ASSIGNED BEAT RETAILERS NETWORK & FILTER ENGINE
    // ============================================================
    _allBeatStores: [],

    renderBeatStores: function (db, isSo) {
      const container = document.getElementById('dsBeatStoresList');
      if (!container) return;

      let stores = Array.isArray(db.party) && db.party.length > 0 ? db.party : [];
      if (isSo) {
        const activeSo = window.DS_Auth.getActiveSo();
        stores = stores.filter(p => !activeSo.route || p.route === activeSo.route);
      }

      this._allBeatStores = stores;

      // Populate Route dropdown filter if empty
      const routeSelect = document.getElementById('filterRetailerRoute');
      if (routeSelect && routeSelect.options.length <= 1) {
        const routes = [...new Set(stores.map(s => s.route).filter(Boolean))].sort();
        routes.forEach(r => {
          const opt = document.createElement('option');
          opt.value = r;
          opt.textContent = r;
          routeSelect.appendChild(opt);
        });
      }

      this.filterBeatStores();
    },

    filterBeatStores: function () {
      const container = document.getElementById('dsBeatStoresList');
      if (!container) return;

      const searchInp = document.getElementById('searchBeatRetailers');
      const routeSel = document.getElementById('filterRetailerRoute');
      const statusSel = document.getElementById('filterRetailerStatus');

      const q = searchInp ? searchInp.value.trim().toLowerCase() : '';
      const selectedRoute = routeSel ? routeSel.value : '';
      const selectedStatus = statusSel ? statusSel.value : '';

      const orders = window.DS_Storage ? window.DS_Storage.getOrders() : [];
      const collections = window.DS_Storage ? window.DS_Storage.getCollections() : [];
      const todayYmd = new Date().toISOString().split('T')[0];

      let filtered = (this._allBeatStores || []).filter(st => {
        // Route filter
        if (selectedRoute && st.route !== selectedRoute) return false;

        // Search text
        if (q) {
          const hay = `${st.name || ''} ${st.contact || ''} ${st.phone || ''} ${st.city || ''} ${st.route || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }

        // Determine visit status
        const storeOrdersToday = orders.filter(o => (o.party === st.name || o.storeName === st.name) && (o.date === todayYmd));
        const storeCollsToday = collections.filter(c => (c.party === st.name || c.partyName === st.name) && (c.date === todayYmd));

        let statusKey = 'pending';
        if (storeOrdersToday.some(o => o.status === 'Delivered')) {
          statusKey = 'completed';
        } else if (storeOrdersToday.length > 0 || storeCollsToday.length > 0) {
          statusKey = 'visited';
        }

        if (selectedStatus && selectedStatus !== statusKey) return false;

        return true;
      });

      if (filtered.length === 0) {
        container.innerHTML = '<div style="color:var(--ds-text-muted); font-size:12px; padding:16px; text-align:center; grid-column:1/-1;">No beat retailers found matching selected criteria.</div>';
        return;
      }

      container.innerHTML = filtered.map(st => {
        const storeOrdersToday = orders.filter(o => (o.party === st.name || o.storeName === st.name) && (o.date === todayYmd));
        const storeCollsToday = collections.filter(c => (c.party === st.name || c.partyName === st.name) && (c.date === todayYmd));

        let statusBadge = '<span class="badge" style="background:#fffbeb; color:#b45309; border:1px solid #fde68a;">Pending Visit</span>';
        if (storeOrdersToday.some(o => o.status === 'Delivered')) {
          statusBadge = '<span class="badge" style="background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0;">Completed</span>';
        } else if (storeOrdersToday.length > 0 || storeCollsToday.length > 0) {
          statusBadge = '<span class="badge" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;">Visited</span>';
        }

        const city1 = st.city1 || st.city || 'Kanpur';
        const city = st.city || 'Kanpur';

        return `
          <div class="store-card">
            <div class="store-card-header">
              <div>
                <h4 class="store-name">${DS_App.escapeHtml(st.name)}</h4>
                <div class="store-route">${DS_App.escapeHtml(st.route || 'General Beat')} • ${DS_App.escapeHtml(st.category || 'Retail Kirana')}</div>
              </div>
              ${statusBadge}
            </div>

            <!-- Retailer Meta Information Grid -->
            <div class="store-meta-grid">
              <div class="store-meta-item">
                <span class="store-meta-label">City 1 / City</span>
                <span class="store-meta-val">${DS_App.escapeHtml(city1)} / ${DS_App.escapeHtml(city)}</span>
              </div>
              <div class="store-meta-item">
                <span class="store-meta-label">Owner / Contact</span>
                <span class="store-meta-val">${DS_App.escapeHtml(st.contact || '-')}</span>
              </div>
              <div class="store-meta-item">
                <span class="store-meta-label">Mobile Number</span>
                <span class="store-meta-val">
                  <a href="tel:${DS_App.escapeHtml(st.phone)}" style="color:var(--ds-accent); font-weight:700; text-decoration:none;">
                    ${DS_App.escapeHtml(st.phone || '-')}
                  </a>
                </span>
              </div>
              <div class="store-meta-item">
                <span class="store-meta-label">Outstanding</span>
                <span class="store-meta-val" style="color:var(--ds-danger-dark); font-weight:800;">
                  ${DS_App.money(st.outstanding || 0)}
                </span>
              </div>
            </div>

            <!-- Card Actions -->
            <div class="store-card-footer">
              <div class="store-card-actions">
                <a href="${pagePrefix}order-punching.html?party=${encodeURIComponent(st.name)}" class="btn btn-primary btn-xs" style="font-weight:700;">
                  Punch Order
                </a>
                <a href="${pagePrefix}payment-collections.html?party=${encodeURIComponent(st.name)}" class="btn btn-success btn-xs" style="font-weight:700;">
                  Collect ₹
                </a>
                <button type="button" class="btn btn-secondary btn-xs" onclick="DS_Dashboard.openRetailerModal('${encodeURIComponent(st.id || st.name)}')" title="View complete store profile">
                  Details
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    },

    // ============================================================
    // 4. INTERACTIVE RETAILER PROFILE MODAL
    // ============================================================
    openRetailerModal: function (partyKey) {
      const decodedKey = decodeURIComponent(partyKey);
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { party: [], sales: [], unpaid: [] };
      const party = (db.party || []).find(p => p.id === decodedKey || p.name === decodedKey);

      if (!party) {
        if (window.DS_App) DS_App.toast('Retailer details not found', 'error');
        return;
      }

      const modal = document.getElementById('dsRetailerModal');
      const body = document.getElementById('retailerModalBody');
      const footer = document.getElementById('retailerModalFooter');
      const sub = document.getElementById('retailerModalSub');

      if (sub) sub.textContent = `${party.name} (${party.id || 'Party ID'})`;

      const creditLimit = Number(party.creditLimit) || 50000;
      const outstanding = Number(party.outstanding) || 0;
      const utilPct = Math.min(100, Math.round((outstanding / (creditLimit || 1)) * 100));
      const cleanPhone = String(party.phone || '').replace(/[^0-9]/g, '');

      // Get recent orders or invoices for this party
      const recentOrders = (window.DS_Storage ? window.DS_Storage.getOrders() : [])
        .filter(o => o.party === party.name || o.storeName === party.name)
        .slice(-3).reverse();

      body.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
          <div>
            <h4 style="margin:0 0 4px; font-size:18px; font-weight:800; color:#0f172a;">${DS_App.escapeHtml(party.name)}</h4>
            <div style="font-size:12px; color:#64748b;">
              ${DS_App.escapeHtml(party.category || 'Retail Kirana')} • ${DS_App.escapeHtml(party.subCategory || 'General')}
            </div>
          </div>
          <span class="badge" style="background:#eff6ff; color:#1d4ed8; font-weight:700; font-size:11px; padding:4px 8px;">
            ${DS_App.escapeHtml(party.route || 'General Route')}
          </span>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px; background:#f8fafc; padding:12px; border-radius:10px; border:1px solid #e2e8f0;">
          <div>
            <div style="font-size:10px; font-weight:700; text-transform:uppercase; color:#64748b;">Owner / Contact Person</div>
            <div style="font-size:13px; font-weight:700; color:#0f172a; margin-top:2px;">${DS_App.escapeHtml(party.contact || '-')}</div>
          </div>
          <div>
            <div style="font-size:10px; font-weight:700; text-transform:uppercase; color:#64748b;">Phone / Mobile</div>
            <div style="font-size:13px; font-weight:700; color:#0f172a; margin-top:2px; display:flex; gap:8px; align-items:center;">
              <a href="tel:${DS_App.escapeHtml(party.phone)}" style="color:#1d4ed8; text-decoration:none;">${DS_App.escapeHtml(party.phone || '-')}</a>
              ${cleanPhone ? `<a href="https://wa.me/91${cleanPhone}?text=${encodeURIComponent('Namaste ' + party.contact + ', DS Enterprises FMCG order enquiry.')}" target="_blank" class="btn btn-success btn-xs" style="padding:2px 6px; font-size:10px;">WhatsApp</a>` : ''}
            </div>
          </div>
          <div>
            <div style="font-size:10px; font-weight:700; text-transform:uppercase; color:#64748b;">City 1 / City</div>
            <div style="font-size:13px; font-weight:600; color:#334155; margin-top:2px;">${DS_App.escapeHtml(party.city1 || party.city || 'Kanpur')} / ${DS_App.escapeHtml(party.city || 'Kanpur')}</div>
          </div>
          <div>
            <div style="font-size:10px; font-weight:700; text-transform:uppercase; color:#64748b;">Shop Address</div>
            <div style="font-size:12px; font-weight:600; color:#334155; margin-top:2px;">${DS_App.escapeHtml(party.address || 'Address on record')}</div>
          </div>
        </div>

        <!-- Credit Ledger Progress -->
        <div style="margin-bottom:16px; background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-size:12px; font-weight:800; color:#991b1b;">Credit Exposure & Ledger Status</span>
            <span style="font-size:12px; font-weight:800; color:#b91c1c;">${utilPct}% of Limit Used</span>
          </div>
          <div style="height:7px; background:#fee2e2; border-radius:9999px; overflow:hidden; margin-bottom:8px;">
            <div style="width:${utilPct}%; height:100%; background:linear-gradient(90deg, #f59e0b, #ef4444); border-radius:9999px;"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:12px;">
            <span>Outstanding Due: <strong style="color:#b91c1c;">${DS_App.money(outstanding)}</strong></span>
            <span>Credit Limit: <strong>${DS_App.money(creditLimit)}</strong></span>
          </div>
        </div>

        <!-- Recent Order Bookings -->
        <div>
          <div style="font-size:12px; font-weight:800; color:#0f172a; margin-bottom:8px;">Recent Punched Orders</div>
          ${recentOrders.length > 0 ? `
            <div class="ds-table-wrap">
              <table class="ds-table" style="font-size:11.5px;">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th class="num">Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${recentOrders.map(ro => `
                    <tr>
                      <td><strong>${ro.id}</strong></td>
                      <td>${DS_App.formatDate(ro.date)}</td>
                      <td class="num"><strong>${DS_App.money(ro.total)}</strong></td>
                      <td><span class="badge badge-${(ro.status || 'submitted').toLowerCase()}">${ro.status || 'Submitted'}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<div style="font-size:12px; color:#64748b; font-style:italic;">No past orders logged for this store yet.</div>'}
        </div>
      `;

      footer.innerHTML = `
        <button type="button" class="btn btn-secondary btn-sm" onclick="DS_Dashboard.closeRetailerModal()">Close</button>
        <div style="display:flex; gap:6px;">
          <a href="${pagePrefix}payment-collections.html?party=${encodeURIComponent(party.name)}" class="btn btn-success btn-sm" style="font-weight:700;">
            Collect Payment
          </a>
          <a href="${pagePrefix}order-punching.html?party=${encodeURIComponent(party.name)}" class="btn btn-primary btn-sm" style="font-weight:700;">
            Punch New Order
          </a>
        </div>
      `;

      modal.style.display = 'flex';
      modal.classList.add('active');
    },

    closeRetailerModal: function () {
      const modal = document.getElementById('dsRetailerModal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    // ============================================================
    // 5. ACTIVITY LISTS (RECENT ORDERS, TOP BRANDS, LOW STOCK)
    // ============================================================
    renderRecentOrders: function (orders) {
      const tbody = document.getElementById('dsRecentOrdersTableBody');
      if (!tbody) return;

      const seen = new Set();
      const unique = [];
      for (const o of (orders || [])) {
        if (o && o.id && !seen.has(o.id)) {
          seen.add(o.id);
          unique.push(o);
        } else if (o && !o.id) {
          unique.push(o);
        }
      }

      const recent = unique.slice(-8).reverse();
      if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:12px; color:var(--ds-text-muted);">No orders placed yet.</td></tr>';
        return;
      }

      tbody.innerHTML = recent.map(o => `
        <tr>
          <td><strong>${o.id}</strong></td>
          <td>${DS_App.formatDate(o.date)}</td>
          <td><strong>${DS_App.escapeHtml(o.storeName || o.party)}</strong></td>
          <td>${DS_App.escapeHtml(o.route || '-')}</td>
          <td>${DS_App.escapeHtml(o.salesPerson || '-')}</td>
          <td class="num"><strong>${DS_App.money(o.total)}</strong></td>
          <td>
            <span class="badge badge-${(o.status || 'submitted').toLowerCase()}">${o.status || 'Submitted'}</span>
          </td>
          <td>
            <button type="button" class="btn btn-primary btn-xs" onclick="DS_Dashboard.copyOrderText('${o.id}')" title="Copy Order Text for WhatsApp">Copy</button>
          </td>
        </tr>
      `).join('');
    },

    copyOrderText: function (orderId) {
      const orders = window.DS_Storage ? window.DS_Storage.getOrders() : [];
      const order = orders.find(o => o.id === orderId);
      if (order && window.DS_WhatsApp) {
        window.DS_WhatsApp.copyOrderText(order);
      } else {
        if (window.DS_App) DS_App.toast('Order record not found', 'error');
      }
    },

    renderTopBrands: function (db) {
      const container = document.getElementById('dsTopBrandsList');
      if (!container) return;

      const sales = db.sales || [];
      const brandMap = {};
      sales.forEach(s => {
        const b = s.brand || s.Brand || 'Other';
        brandMap[b] = (brandMap[b] || 0) + (Number(s.amount ?? s.AmountNum) || 0);
      });

      const sorted = Object.entries(brandMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
      const maxVal = sorted.length > 0 ? sorted[0][1] : 1;

      if (sorted.length === 0) {
        container.innerHTML = '<div style="color:var(--ds-text-muted); font-size:11.5px;">No sales data available.</div>';
        return;
      }

      container.innerHTML = sorted.map(([brand, amt]) => {
        const pct = Math.round((amt / maxVal) * 100);
        return `
          <div style="margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; font-size:11.5px; font-weight:700; margin-bottom:2px;">
              <span>${DS_App.escapeHtml(brand)}</span>
              <span style="color:var(--ds-accent);">${DS_App.money(amt)}</span>
            </div>
            <div style="height:5px; background:var(--ds-border-light, #edf2f7); border-radius:9999px; overflow:hidden;">
              <div style="width:${pct}%; height:100%; background:linear-gradient(90deg, var(--ds-accent, #1e5eff), #38bdf8); border-radius:9999px;"></div>
            </div>
          </div>
        `;
      }).join('');
    },

    renderLowStockList: function (db) {
      const tbody = document.getElementById('dsLowStockTableBody');
      if (!tbody) return;

      const lowItems = (db.stock || []).filter(s => (Number(s.stock) || 0) <= (Number(s.minStock) || 50));
      if (lowItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:12px; color:var(--ds-text-muted);">All items in stock at safe levels.</td></tr>';
        return;
      }

      tbody.innerHTML = lowItems.slice(0, 5).map(item => `
        <tr>
          <td><strong>${DS_App.escapeHtml(item.code || '-')}</strong></td>
          <td><strong>${DS_App.escapeHtml(item.name)}</strong></td>
          <td><span class="badge" style="background:#e0f2fe; color:#0369a1;">${DS_App.escapeHtml(item.brand || '-')}</span></td>
          <td class="num"><strong style="color:var(--ds-danger-dark);">${DS_App.qty(item.stock)} ${item.unit || ''}</strong></td>
          <td>
            <a href="${pagePrefix}stock.html" class="btn btn-secondary btn-xs">Adjust</a>
          </td>
        </tr>
      `).join('');
    },

    // ============================================================
    // 6. 5 INTERACTIVE SALES ANALYTICS & CHARTS
    // ============================================================
    renderCharts: function (db, orders) {
      if (typeof Chart === 'undefined') return;

      const sales = db.sales || [];
      const collections = window.DS_Storage ? window.DS_Storage.getCollections() : [];

      // Generate 7-day chronological buckets
      const days = [];
      const dayTurnover = {};
      const dayOrdersBooked = {};
      const dayOrdersDelivered = {};
      const dayOrdersCancelled = {};
      const dayCollections = {};

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ymd = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        days.push({ ymd, label });

        dayTurnover[ymd] = 0;
        dayOrdersBooked[ymd] = 0;
        dayOrdersDelivered[ymd] = 0;
        dayOrdersCancelled[ymd] = 0;
        dayCollections[ymd] = 0;
      }

      // Populate Sales Turnover & Paid Collections
      sales.forEach(s => {
        const sDate = s.date || s.Date || s.invoice_date || '';
        const amt = Number(s.amount ?? s.AmountNum ?? s.total_amount) || 0;
        if (dayTurnover[sDate] !== undefined) {
          dayTurnover[sDate] += amt;
        }
        if (s.payment_status === 'Paid' && dayCollections[sDate] !== undefined) {
          dayCollections[sDate] += amt;
        }
      });

      // Populate Orders by Status
      (orders || []).forEach(o => {
        const oDate = o.date || (o.dateTime ? o.dateTime.slice(0, 10) : '');
        if (dayOrdersBooked[oDate] !== undefined) {
          dayOrdersBooked[oDate] += 1;
          if (o.status === 'Delivered') {
            dayOrdersDelivered[oDate] += 1;
          } else if (String(o.status).toLowerCase().includes('cancel')) {
            dayOrdersCancelled[oDate] += 1;
          }
        }
      });

      // Populate Direct Payments from Collections
      collections.forEach(c => {
        const cDate = c.date || (c.dateTime ? c.dateTime.slice(0, 10) : '');
        const cAmt = Number(c.amount) || 0;
        if (dayCollections[cDate] !== undefined) {
          dayCollections[cDate] += cAmt;
        }
      });

      const dayLabels = days.map(d => d.label);

      // --- Chart 1: 7-Day Sales Turnover Trend (Line) ---
      const trendCanvas = document.getElementById('dsSalesTrendChart');
      if (trendCanvas) {
        if (trendChartInstance) trendChartInstance.destroy();
        trendChartInstance = new Chart(trendCanvas, {
          type: 'line',
          data: {
            labels: dayLabels,
            datasets: [{
              label: 'Sales Turnover (₹)',
              data: days.map(d => dayTurnover[d.ymd]),
              borderColor: '#1e5eff',
              backgroundColor: 'rgba(30, 94, 255, 0.12)',
              fill: true,
              tension: 0.35,
              pointBackgroundColor: '#1e5eff',
              pointRadius: 4,
              borderWidth: 2.5
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: (v) => '₹ ' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v),
                  font: { size: 10 }
                }
              },
              x: { ticks: { font: { size: 10 } } }
            }
          }
        });
      }

      // --- Chart 2: Brand Revenue Analysis (Doughnut) ---
      const brandCanvas = document.getElementById('dsBrandShareChart');
      if (brandCanvas) {
        const brandMap = {};
        sales.forEach(s => {
          const b = s.brand || s.Brand || 'Other';
          brandMap[b] = (brandMap[b] || 0) + (Number(s.amount ?? s.AmountNum) || 0);
        });

        const sortedBrands = Object.entries(brandMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
        if (brandChartInstance) brandChartInstance.destroy();

        brandChartInstance = new Chart(brandCanvas, {
          type: 'doughnut',
          data: {
            labels: sortedBrands.map(b => b[0]),
            datasets: [{
              data: sortedBrands.map(b => b[1]),
              backgroundColor: ['#1e5eff', '#10b981', '#f59e0b', '#0d9488', '#8b5cf6', '#ec4899', '#06b6d4']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9.5 }, padding: 6 } }
            }
          }
        });
      }

      // --- Chart 3: Category-Wise Sales (Bar Chart) ---
      const categoryCanvas = document.getElementById('dsCategorySalesChart');
      if (categoryCanvas) {
        const catMap = {};
        sales.forEach(s => {
          const c = s.category || s.Category || 'General Kirana';
          catMap[c] = (catMap[c] || 0) + (Number(s.amount ?? s.AmountNum) || 0);
        });

        const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
        if (categoryChartInstance) categoryChartInstance.destroy();

        categoryChartInstance = new Chart(categoryCanvas, {
          type: 'bar',
          data: {
            labels: sortedCats.map(c => c[0]),
            datasets: [{
              label: 'Category Revenue (₹)',
              data: sortedCats.map(c => c[1]),
              backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'],
              borderRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: (v) => '₹ ' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v),
                  font: { size: 9 }
                }
              },
              x: {
                ticks: {
                  font: { size: 9 },
                  callback: function (val, idx) {
                    const str = this.getLabelForValue(val);
                    return str.length > 12 ? str.slice(0, 10) + '..' : str;
                  }
                }
              }
            }
          }
        });
      }

      // --- Chart 4: Daily Order Performance (Grouped Bar Chart) ---
      const orderPerfCanvas = document.getElementById('dsOrderPerformanceChart');
      if (orderPerfCanvas) {
        if (orderPerfChartInstance) orderPerfChartInstance.destroy();

        orderPerfChartInstance = new Chart(orderPerfCanvas, {
          type: 'bar',
          data: {
            labels: dayLabels,
            datasets: [
              {
                label: 'Booked',
                data: days.map(d => dayOrdersBooked[d.ymd]),
                backgroundColor: '#3b82f6',
                borderRadius: 3
              },
              {
                label: 'Delivered',
                data: days.map(d => dayOrdersDelivered[d.ymd]),
                backgroundColor: '#10b981',
                borderRadius: 3
              },
              {
                label: 'Cancelled',
                data: days.map(d => dayOrdersCancelled[d.ymd]),
                backgroundColor: '#f43f5e',
                borderRadius: 3
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'top', labels: { boxWidth: 8, font: { size: 9 }, padding: 4 } }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { stepSize: 1, font: { size: 9 } }
              },
              x: { ticks: { font: { size: 9 } } }
            }
          }
        });
      }

      // --- Chart 5: Payment Collection Trend (Area Line Chart) ---
      const collectionCanvas = document.getElementById('dsCollectionTrendChart');
      if (collectionCanvas) {
        if (collectionChartInstance) collectionChartInstance.destroy();

        collectionChartInstance = new Chart(collectionCanvas, {
          type: 'line',
          data: {
            labels: dayLabels,
            datasets: [{
              label: 'Recovered (₹)',
              data: days.map(d => dayCollections[d.ymd]),
              borderColor: '#0d9488',
              backgroundColor: 'rgba(13, 148, 136, 0.14)',
              fill: true,
              tension: 0.35,
              pointBackgroundColor: '#0d9488',
              pointRadius: 3.5,
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: (v) => '₹ ' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v),
                  font: { size: 9 }
                }
              },
              x: { ticks: { font: { size: 9 } } }
            }
          }
        });
      }
    },

    // ============================================================
    // 7. HIDE / UNHIDE DASHBOARD CUSTOMIZATION ENGINE
    // ============================================================
    getVisibilityPrefs: function () {
      try {
        const raw = localStorage.getItem('ds_dashboard_visibility');
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      const defaults = {};
      Object.keys(WIDGET_DEFINITIONS).forEach(k => {
        defaults[k] = WIDGET_DEFINITIONS[k].default;
      });
      return defaults;
    },

    saveVisibilityPrefs: function (prefs) {
      try {
        localStorage.setItem('ds_dashboard_visibility', JSON.stringify(prefs));
      } catch (e) {}
      this.applyVisibilityPreferences();
    },

    applyVisibilityPreferences: function () {
      const prefs = this.getVisibilityPrefs();
      Object.keys(WIDGET_DEFINITIONS).forEach(k => {
        const isVisible = prefs[k] !== false;
        const elements = document.querySelectorAll(`[data-widget="${k}"]`);
        elements.forEach(el => {
          if (k === 'section-admin-banner') {
            const isAdmin = window.DS_Auth && (window.DS_Auth.isAdmin() || window.DS_Auth.getCurrentRole() === 'admin' || window.DS_Auth.hasPermission('canManageStaff'));
            el.style.display = (isAdmin && isVisible) ? 'flex' : 'none';
            const textEl = document.getElementById('dsToggleAdminStripText');
            if (textEl) textEl.textContent = (isAdmin && isVisible) ? 'Admin Profile ▴' : 'Admin Profile ▾';
          } else if (k === 'section-so-hero') {
            const isSo = window.DS_Auth ? window.DS_Auth.isSo() : false;
            el.style.display = (isSo && isVisible) ? 'block' : 'none';
          } else {
            el.style.display = isVisible ? '' : 'none';
          }
        });
      });
    },

    toggleAdminBanner: function () {
      const banner = document.getElementById('adminRegistrationBanner');
      const textEl = document.getElementById('dsToggleAdminStripText');
      if (!banner) return;
      const isCurrentlyHidden = banner.style.display === 'none';
      const prefs = this.getVisibilityPrefs();
      if (isCurrentlyHidden) {
        banner.style.display = 'flex';
        prefs['section-admin-banner'] = true;
        if (textEl) textEl.textContent = 'Admin Profile ▴';
      } else {
        banner.style.display = 'none';
        prefs['section-admin-banner'] = false;
        if (textEl) textEl.textContent = 'Admin Profile ▾';
      }
      this.saveVisibilityPrefs(prefs);
    },

    dismissAdminTile: function () {
      const prefs = this.getVisibilityPrefs();
      prefs['section-admin-banner'] = false;
      this.saveVisibilityPrefs(prefs);
      const textEl = document.getElementById('dsToggleAdminStripText');
      if (textEl) textEl.textContent = 'Admin Profile ▾';
      if (window.DS_App) DS_App.toast('Admin Registration banner collapsed.', 'info', 2500);
    },

    openCustomizeModal: function () {
      const modal = document.getElementById('dsCustomizeModal');
      if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        this.renderCustomizeModal();
      }
    },

    closeCustomizeModal: function () {
      const modal = document.getElementById('dsCustomizeModal');
      if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
      }
    },

    showTop6Only: function () {
      const prefs = this.getVisibilityPrefs();
      Object.keys(WIDGET_DEFINITIONS).forEach(k => {
        if (WIDGET_DEFINITIONS[k].group === 'primary') {
          prefs[k] = true;
        } else if (WIDGET_DEFINITIONS[k].group === 'cards') {
          prefs[k] = false;
        }
      });
      this.saveVisibilityPrefs(prefs);
      this.renderCustomizeModal();
      if (window.DS_App) DS_App.toast('Showing Top 6 Primary Tiles only! Screen space optimized.', 'info', 2500);
    },

    selectAllTiles: function (visible) {
      const prefs = this.getVisibilityPrefs();
      Object.keys(WIDGET_DEFINITIONS).forEach(k => {
        if (WIDGET_DEFINITIONS[k].group === 'primary' || WIDGET_DEFINITIONS[k].group === 'cards') {
          prefs[k] = !!visible;
        }
      });
      this.saveVisibilityPrefs(prefs);
      this.renderCustomizeModal();
      if (window.DS_App) DS_App.toast(visible ? 'All KPI tiles are now visible!' : 'All tiles hidden.', 'info', 2500);
    },

    renderCustomizeModal: function () {
      const primaryContainer = document.getElementById('dsCustomizePrimaryCardsGrid');
      const cardsContainer = document.getElementById('dsCustomizeCardsGrid');
      const sectionsContainer = document.getElementById('dsCustomizeSectionsGrid');
      if (!cardsContainer || !sectionsContainer) return;

      const prefs = this.getVisibilityPrefs();
      let primaryHtml = '';
      let cardsHtml = '';
      let sectionsHtml = '';

      const makeRow = (key, item) => {
        const isChecked = prefs[key] !== false ? 'checked' : '';
        return `
          <div class="ds-customize-item">
            <span class="ds-customize-label">${item.label}</span>
            <label class="ds-toggle-switch">
              <input type="checkbox" data-widget-key="${key}" ${isChecked} onchange="DS_Dashboard.toggleWidgetVisibility('${key}', this.checked)">
              <span class="slider"></span>
            </label>
          </div>
        `;
      };

      Object.entries(WIDGET_DEFINITIONS).forEach(([key, item]) => {
        if (item.group === 'primary') {
          primaryHtml += makeRow(key, item);
        } else if (item.group === 'cards') {
          cardsHtml += makeRow(key, item);
        } else {
          sectionsHtml += makeRow(key, item);
        }
      });

      if (primaryContainer) primaryContainer.innerHTML = primaryHtml;
      cardsContainer.innerHTML = cardsHtml;
      sectionsContainer.innerHTML = sectionsHtml;
    },

    toggleWidgetVisibility: function (key, isVisible) {
      const prefs = this.getVisibilityPrefs();
      prefs[key] = isVisible;
      this.saveVisibilityPrefs(prefs);
    },

    resetVisibilityDefaults: function () {
      const defaults = {};
      Object.keys(WIDGET_DEFINITIONS).forEach(k => {
        defaults[k] = true;
      });
      this.saveVisibilityPrefs(defaults);
      this.renderCustomizeModal();
      if (window.DS_App) DS_App.toast('Dashboard visibility restored to defaults!', 'success', 2500);
    }
  };

  window.DS_Dashboard = DS_Dashboard;

  // Real-time Event Listeners for Auto-Updating Dashboard
  window.addEventListener('ds:order-created', () => {
    if (window.DS_Dashboard && typeof window.DS_Dashboard.render === 'function') {
      window.DS_Dashboard.render();
    }
  });

  window.addEventListener('ds:collection-created', () => {
    if (window.DS_Dashboard && typeof window.DS_Dashboard.render === 'function') {
      window.DS_Dashboard.render();
    }
  });

  window.addEventListener('ds:db-updated', () => {
    if (window.DS_Dashboard && typeof window.DS_Dashboard.render === 'function') {
      window.DS_Dashboard.render();
    }
  });

  window.addEventListener('storage', (e) => {
    if (e.key && e.key.startsWith('ds_')) {
      if (window.DS_Dashboard && typeof window.DS_Dashboard.render === 'function') {
        window.DS_Dashboard.render();
      }
    }
  });

  // Auto-render if on dashboard
  if (document.getElementById('kpiTotalSales') || document.querySelector('[data-widget="kpi-total-sales"]')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => DS_Dashboard.render());
    } else {
      DS_Dashboard.render();
    }
  }

})(window);
