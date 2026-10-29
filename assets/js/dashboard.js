/**
 * ==========================================================================
 * DS ENTERPRISES — DASHBOARD CONTROLLER
 * File: assets/js/dashboard.js
 * Architecture: Executive KPIs, Dynamic Chart.js Analytics, Sales Officer
 *               Beat View & Activity Feeds
 * ==========================================================================
 */

(function (window) {
  'use strict';

  let trendChartInstance = null;
  let brandChartInstance = null;
  let routeChartInstance = null;

  const isPagesDir = window.location.pathname.includes('/pages/');
  const pagePrefix = isPagesDir ? '' : 'pages/';

  const DS_Dashboard = {
    render: function () {
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { sales: [], unpaid: [], stock: [], party: [] };
      const orders = window.DS_Storage ? window.DS_Storage.getOrders() : [];
      const officers = window.DS_Storage ? window.DS_Storage.getOfficers() : [];
      const isSo = window.DS_Auth ? window.DS_Auth.isSo() : false;

      this.renderKPIs(db, orders, officers);

      const adminBanner = document.getElementById('adminRegistrationBanner');
      if (adminBanner) {
        const isAdmin = window.DS_Auth && (window.DS_Auth.isAdmin() || window.DS_Auth.getCurrentRole() === 'admin' || window.DS_Auth.hasPermission('canManageStaff'));
        adminBanner.style.display = isAdmin ? 'block' : 'none';
      }

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
    },

    renderKPIs: async function (db, orders, officers) {
      // 1. Try fetching backend live aggregated metrics
      if (window.DS_API && window.DS_API.getDashboardKPIs) {
        try {
          const metrics = await window.DS_API.getDashboardKPIs();
          if (metrics) {
            const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

            setTxt('kpiTotalBills', `${metrics.total_bills?.value ?? 0} Bills`);
            setTxt('kpiTotalInvoices', `${metrics.total_invoices?.value ?? 0} Invoices`);
            setTxt('kpiTodayOrders', `${metrics.today_orders?.value ?? 0} Orders`);
            setTxt('kpiPendingOrders', `${metrics.pending_orders?.value ?? 0} Orders`);
            setTxt('kpiDeliveredOrders', `${metrics.delivered_orders?.value ?? 0} Orders`);

            setTxt('kpiCancelCustomer', `${metrics.cancelled_by_customer?.value ?? 0} Orders`);
            if (metrics.cancelled_by_customer?.amount > 0) {
              setTxt('kpiCancelCustomerSub', `${DS_App.money(metrics.cancelled_by_customer.amount)} denied`);
            }

            setTxt('kpiCancelCompany', `${metrics.cancelled_by_company?.value ?? 0} Orders`);
            if (metrics.cancelled_by_company?.amount > 0) {
              setTxt('kpiCancelCompanySub', `${DS_App.money(metrics.cancelled_by_company.amount)} internal`);
            }

            setTxt('kpiTotalSales', DS_App.money(metrics.total_sales?.value ?? 0));
            if (metrics.total_sales?.mtd) {
              setTxt('kpiTotalSalesSub', `MTD: ${DS_App.money(metrics.total_sales.mtd)}`);
            }

            setTxt('kpiOutstanding', DS_App.money(metrics.pending_payments?.value ?? 0));
            setTxt('kpiTotalRoutes', `${metrics.total_delivery_routes?.value ?? 0} Routes`);
            setTxt('kpiAssignedDeliveries', `${metrics.assigned_deliveries?.value ?? 0} Stops`);
            setTxt('kpiUnassignedDeliveries', `${metrics.unassigned_deliveries?.value ?? 0} Orders`);
            setTxt('kpiImportSuccess', `${metrics.successful_excel_imports?.value ?? 0} Batches`);
            setTxt('kpiImportFailed', `${metrics.failed_excel_imports?.value ?? 0} Batches`);
            return;
          }
        } catch (e) {
          console.warn('[Dashboard] Backend metrics fetch fallback to local:', e);
        }
      }

      // 2. Offline Fallback Calculation
      const todayStr = new Date().toISOString().slice(0, 10);
      const totalSales = (db.sales || []).reduce((acc, s) => acc + (Number(s.amount ?? s.AmountNum ?? s.total_amount) || 0), 0);
      const totalOutstanding = (db.unpaid || []).reduce((acc, u) => acc + (Number(u.balanceAmount || u.totalAmount || u.amount) || 0), 0);
      const todayOrders = (orders || []).filter(o => (o.date === todayStr || (o.dateTime && o.dateTime.startsWith(todayStr)))).length;
      const pendingOrders = (orders || []).filter(o => ['Submitted', 'Pending', 'Confirmed', 'Processing'].includes(o.status));
      const deliveredOrders = (orders || []).filter(o => o.status === 'Delivered').length;
      const cancelCustOrders = (orders || []).filter(o => o.status === 'Cancelled by Customer' || o.cancelType === 'party');
      const cancelCoOrders = (orders || []).filter(o => o.status === 'Cancelled by Company/Admin' || o.cancelType === 'own');
      const unassignedOrders = (orders || []).filter(o => ['Ready for Delivery', 'Approved', 'Confirmed'].includes(o.status)).length;

      const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setTxt('kpiTotalBills', `${(db.sales || []).length} Bills`);
      setTxt('kpiTotalInvoices', `${(db.sales || []).length} Invoices`);
      setTxt('kpiTodayOrders', `${todayOrders} Orders`);
      setTxt('kpiPendingOrders', `${pendingOrders.length} Orders`);
      setTxt('kpiDeliveredOrders', `${deliveredOrders} Orders`);
      setTxt('kpiCancelCustomer', `${cancelCustOrders.length} Orders`);
      setTxt('kpiCancelCompany', `${cancelCoOrders.length} Orders`);
      setTxt('kpiTotalSales', DS_App.money(totalSales));
      setTxt('kpiOutstanding', DS_App.money(totalOutstanding));
      setTxt('kpiTotalRoutes', '5 Routes');
      setTxt('kpiAssignedDeliveries', '1 Stops');
      setTxt('kpiUnassignedDeliveries', `${unassignedOrders} Orders`);
      setTxt('kpiImportSuccess', '1 Batches');
      setTxt('kpiImportFailed', '0 Batches');
    },

    renderSoHero: function (db, officers) {
      const hero = document.getElementById('dsSoHeroSection');
      if (!hero) return;
      hero.style.display = 'block';

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

    renderBeatStores: function (db, isSo) {
      const container = document.getElementById('dsBeatStoresList');
      const section = document.getElementById('dsBeatStoresSection');
      if (!container) return;

      let stores = db.party || [];
      if (isSo) {
        const activeSo = window.DS_Auth.getActiveSo();
        stores = stores.filter(p => !activeSo.route || p.route === activeSo.route);
        if (section) section.style.display = 'block';
      }

      const orders = window.DS_Storage ? window.DS_Storage.getOrders() : [];
      const todayYmd = new Date().toISOString().split('T')[0];

      if (stores.length === 0) {
        container.innerHTML = '<div style="color:var(--ds-text-muted); font-size:13px; padding:12px;">No stores assigned for this beat route.</div>';
        return;
      }

      container.innerHTML = stores.slice(0, 8).map(st => {
        const hasOrder = orders.some(o => (o.party === st.name || o.storeName === st.name) && (o.date === todayYmd));
        return `
          <div class="store-card">
            <div class="store-card-header">
              <div>
                <h4 class="store-name">${DS_App.escapeHtml(st.name)}</h4>
                <div class="store-route">${DS_App.escapeHtml(st.route)} • ${st.category || 'Retail Kirana'}</div>
              </div>
              <span class="badge ${hasOrder ? 'badge-delivered' : 'badge-submitted'}">
                ${hasOrder ? 'Ordered Today' : 'Pending Visit'}
              </span>
            </div>
            <div style="font-size:12px; color:var(--ds-text-secondary); margin:6px 0;">
              Contact: <strong>${DS_App.escapeHtml(st.contact || '-')}</strong> (${DS_App.escapeHtml(st.phone || '-')})
            </div>
            <div class="store-card-footer">
              <div>Outstanding: <span class="store-out-amt">${DS_App.money(st.outstanding || 0)}</span></div>
              <div style="display:flex; gap:6px;">
                <a href="${pagePrefix}order-punching.html?party=${encodeURIComponent(st.name)}" class="btn btn-primary btn-sm">Punch Order</a>
                <a href="${pagePrefix}payment-collections.html?party=${encodeURIComponent(st.name)}" class="btn btn-success btn-sm">Collect ₹</a>
              </div>
            </div>
          </div>
        `;
      }).join('');
    },

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
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:16px; color:var(--ds-text-muted);">No orders placed yet.</td></tr>';
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
            <button type="button" class="btn btn-primary btn-sm" onclick="DS_Dashboard.copyOrderText('${o.id}')" title="Copy Order Text for WhatsApp">📋 Copy</button>
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

    quickWhatsApp: function (orderId) {
      return this.copyOrderText(orderId);
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
        container.innerHTML = '<div style="color:var(--ds-text-muted); font-size:12px;">No sales data available.</div>';
        return;
      }

      container.innerHTML = sorted.map(([brand, amt]) => {
        const pct = Math.round((amt / maxVal) * 100);
        return `
          <div style="margin-bottom:12px;">
            <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:700; margin-bottom:4px;">
              <span>${DS_App.escapeHtml(brand)}</span>
              <span style="color:var(--ds-accent);">${DS_App.money(amt)}</span>
            </div>
            <div style="height:7px; background:var(--ds-border-light, #edf2f7); border-radius:9999px; overflow:hidden;">
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
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px; color:var(--ds-text-muted);">All items in stock at safe levels.</td></tr>';
        return;
      }

      tbody.innerHTML = lowItems.slice(0, 5).map(item => `
        <tr>
          <td><strong>${DS_App.escapeHtml(item.code || '-')}</strong></td>
          <td><strong>${DS_App.escapeHtml(item.name)}</strong></td>
          <td><span class="badge" style="background:#e0f2fe; color:#0369a1;">${DS_App.escapeHtml(item.brand || '-')}</span></td>
          <td class="num"><strong style="color:var(--ds-danger-dark);">${DS_App.qty(item.stock)} ${item.unit || ''}</strong></td>
          <td>
            <a href="${pagePrefix}stock.html" class="btn btn-secondary btn-sm">Adjust</a>
          </td>
        </tr>
      `).join('');
    },

    renderCharts: function (db, orders) {
      if (typeof Chart === 'undefined') return;

      // 1. Sales Trend Chart (Last 7 Days)
      const trendCanvas = document.getElementById('dsSalesTrendChart');
      if (trendCanvas) {
        const days = [];
        const dayTurnover = {};

        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const ymd = d.toISOString().split('T')[0];
          const label = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
          days.push({ ymd, label });
          dayTurnover[ymd] = 0;
        }

        (db.sales || []).forEach(s => {
          const sDate = s.date || s.Date || '';
          if (dayTurnover[sDate] !== undefined) {
            dayTurnover[sDate] += (Number(s.amount ?? s.AmountNum) || 0);
          }
        });

        const labels = days.map(d => d.label);
        const data = days.map(d => dayTurnover[d.ymd]);

        if (trendChartInstance) trendChartInstance.destroy();

        trendChartInstance = new Chart(trendCanvas, {
          type: 'line',
          data: {
            labels: labels,
            datasets: [{
              label: 'Sales Turnover (₹)',
              data: data,
              borderColor: '#1e5eff',
              backgroundColor: 'rgba(30, 94, 255, 0.12)',
              fill: true,
              tension: 0.35,
              pointBackgroundColor: '#1e5eff',
              pointRadius: 4
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: {
                 beginAtZero: true,
                ticks: {
                  callback: (v) => '₹ ' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)
                }
              }
            }
          }
        });
      }

      // 2. Brand Share Doughnut Chart
      const brandCanvas = document.getElementById('dsBrandShareChart');
      if (brandCanvas) {
        const brandMap = {};
        (db.sales || []).forEach(s => {
          const b = s.brand || s.Brand || 'Other';
          brandMap[b] = (brandMap[b] || 0) + (Number(s.amount ?? s.AmountNum) || 0);
        });

        const sortedBrands = Object.entries(brandMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const bLabels = sortedBrands.map(b => b[0]);
        const bData = sortedBrands.map(b => b[1]);

        if (brandChartInstance) brandChartInstance.destroy();

        brandChartInstance = new Chart(brandCanvas, {
          type: 'doughnut',
          data: {
            labels: bLabels,
            datasets: [{
              data: bData,
              backgroundColor: ['#1e5eff', '#10b981', '#f59e0b', '#0d9488', '#8b5cf6', '#ec4899']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
            }
          }
        });
      }
    }
  };

  window.DS_Dashboard = DS_Dashboard;

  // Auto-render if on dashboard
  if (document.getElementById('kpiTotalSales')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => DS_Dashboard.render());
    } else {
      DS_Dashboard.render();
    }

    window.addEventListener('ds:db-updated', () => {
      DS_Dashboard.render();
    });
  }

})(window);
