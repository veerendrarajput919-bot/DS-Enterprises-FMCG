/**
 * ==========================================================================
 * DS ENTERPRISES — DELIVERY ROUTE ASSIGNMENT & MANIFEST CONTROLLER
 * File: assets/js/route-assignment.js
 * Architecture: Excel Import, Customer/Order Matcher, Stop Sequencing & Printing
 * ==========================================================================
 */

(function (window) {
  'use strict';

  let currentAssignments = [];
  let currentRoutes = [];
  let parsedExcelRows = [];
  let previewData = null;

  const DS_RouteAssignment = {
    init: function () {
      const today = new Date().toISOString().slice(0, 10);
      const dateInp = document.getElementById('routeFilterDate');
      if (dateInp && !dateInp.value) dateInp.value = today;

      const uploadDateInp = document.getElementById('uploadAssignDate');
      if (uploadDateInp && !uploadDateInp.value) uploadDateInp.value = today;

      const params = new URLSearchParams(window.location.search);
      const dateParam = params.get('date');
      if (dateParam) {
        const val = dateParam === 'today' ? today : dateParam;
        if (dateInp) dateInp.value = val;
        if (uploadDateInp) uploadDateInp.value = val;
      }
      const city1Param = params.get('city1') || params.get('city_1');
      if (city1Param) {
        const c1Sel = document.getElementById('routeFilterCity1');
        if (c1Sel) c1Sel.value = city1Param;
      }
      const cityParam = params.get('city');
      if (cityParam) {
        const cSel = document.getElementById('routeFilterCity');
        if (cSel) cSel.value = cityParam;
      }
      const routeParam = params.get('route_id') || params.get('route');
      if (routeParam) {
        const routeSel = document.getElementById('routeFilterSelect');
        if (routeSel) routeSel.value = routeParam;
      }

      this.bindEvents();
      this.loadRoutes();
      this.loadAssignments();
    },

    bindEvents: function () {
      const fileInp = document.getElementById('routeExcelFileInput');
      if (fileInp) {
        fileInp.addEventListener('change', (e) => this.handleFileSelect(e));
      }

      // Filter events
      ['routeFilterDate', 'routeFilterCity1', 'routeFilterCity', 'routeFilterSelect', 'routeFilterStatus', 'routeFilterPerson', 'routeSearchInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('input', () => this.applyFilters());
          el.addEventListener('change', () => this.applyFilters());
        }
      });
    },

    loadRoutes: async function () {
      const date = document.getElementById('routeFilterDate')?.value || new Date().toISOString().slice(0, 10);
      try {
        currentRoutes = await window.DS_API.getDeliveryRoutes(date);
        this.renderRouteCards(currentRoutes);
        this.populateRouteDropdowns(currentRoutes);
      } catch (e) {
        console.error('Failed to load routes:', e);
      }
    },

    renderRouteCards: function (routes) {
      const container = document.getElementById('routeSummaryCards');
      if (!container) return;

      if (!routes || !routes.length) {
        container.innerHTML = '<div style="grid-column:1/-1; color:var(--ds-text-muted); font-size:13px;">No active delivery routes found.</div>';
        return;
      }

      container.innerHTML = routes.map(r => {
        const pending = r.pending_count ?? 0;
        const delivered = r.delivered_count ?? 0;
        const total = r.stops_count ?? 0;
        const pct = total > 0 ? Math.round((delivered / total) * 100) : 0;

        return `
          <div class="ds-panel" style="margin-bottom:0; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:16px; position:relative; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
              <div>
                <span class="badge" style="background:#eff6ff; color:#1e40af; font-size:10px; margin-bottom:4px;">${DS_App.escapeHtml(r.id)}</span>
                <h4 style="margin:2px 0 0; font-size:14px; font-weight:800; color:#0f172a;">${DS_App.escapeHtml(r.name)}</h4>
                <div style="font-size:11px; color:var(--ds-text-muted); margin-top:2px;">📍 ${DS_App.escapeHtml(r.area || 'General Beat')}</div>
              </div>
              <div style="display:flex; gap:6px;">
                <a href="route-analysis.html?route=${encodeURIComponent(r.name || r.id)}" class="btn btn-secondary btn-sm" title="View Beat Tracker & Retailers" style="padding:4px 8px; font-size:11px; text-decoration:none; display:inline-flex; align-items:center; gap:2px;">
                  📍 Beat
                </a>
                <button type="button" class="btn btn-secondary btn-sm" onclick="DS_RouteAssignment.openPrintManifestModal('${DS_App.escapeHtml(r.id)}')" title="Print Route Delivery Manifest Sheet" style="padding:4px 8px; font-size:11px;">
                  🖨️ Manifest
                </button>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; background:#f8fafc; border-radius:8px; padding:10px; margin-bottom:12px; font-size:12px;">
              <div>
                <span style="color:var(--ds-text-muted); font-size:10px; text-transform:uppercase;">Stops / Orders</span>
                <div style="font-weight:800; font-size:15px; color:#0f172a;">${total} stops (${r.orders_count} orders)</div>
              </div>
              <div>
                <span style="color:var(--ds-text-muted); font-size:10px; text-transform:uppercase;">COD Collection</span>
                <div style="font-weight:800; font-size:15px; color:#16a34a;">${DS_App.money(r.total_amount || 0)}</div>
              </div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; margin-bottom:6px;">
              <span style="color:var(--ds-text-muted);">Assigned Delivery Person:</span>
              <strong style="color:#1e40af;">${DS_App.escapeHtml(r.default_delivery_person || 'Unassigned')}</strong>
            </div>

            <div style="background:#e2e8f0; border-radius:999px; height:6px; overflow:hidden;">
              <div style="background:#16a34a; width:${pct}%; height:100%; transition:width 0.3s ease;"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--ds-text-muted); margin-top:4px;">
              <span>${delivered} Delivered</span>
              <span>${pending} Pending (${pct}%)</span>
            </div>
          </div>
        `;
      }).join('');
    },

    populateRouteDropdowns: function (routes) {
      const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
      const parties = db.party || [];
      const sales = db.sales || [];
      const assignments = window.DS_Storage ? window.DS_Storage.getDeliveryAssignments() : [];

      const city1Set = new Set();
      const citySet = new Set();
      const routeSet = new Set();

      parties.forEach(p => {
        const c1 = p.City_1 || p.city1;
        const c = p.City || p.city;
        const r = p.Route || p.route;
        if (c1) city1Set.add(c1);
        if (c) citySet.add(c);
        if (r) routeSet.add(r);
      });

      sales.forEach(s => {
        const c1 = s.City_1 || s.city1;
        const c = s.City || s.city;
        const r = s.Route || s.route;
        if (c1) city1Set.add(c1);
        if (c) citySet.add(c);
        if (r) routeSet.add(r);
      });

      assignments.forEach(a => {
        if (a.city1) city1Set.add(a.city1);
        if (a.city) citySet.add(a.city);
        if (a.route_id) routeSet.add(a.route_id);
        if (a.route_name) routeSet.add(a.route_name);
      });

      (routes || []).forEach(r => {
        if (r.id) routeSet.add(r.id);
        if (r.name) routeSet.add(r.name);
      });

      const selC1 = document.getElementById('routeFilterCity1');
      if (selC1) {
        const cur = selC1.value;
        const sorted = [...city1Set].filter(Boolean).sort();
        selC1.innerHTML = '<option value="">All City 1</option>' + sorted.map(c => `<option value="${DS_App.escapeHtml(c)}">${DS_App.escapeHtml(c)}</option>`).join('');
        if (sorted.includes(cur)) selC1.value = cur;
      }

      const selC = document.getElementById('routeFilterCity');
      if (selC) {
        const cur = selC.value;
        const sorted = [...citySet].filter(Boolean).sort();
        selC.innerHTML = '<option value="">All Cities</option>' + sorted.map(c => `<option value="${DS_App.escapeHtml(c)}">${DS_App.escapeHtml(c)}</option>`).join('');
        if (sorted.includes(cur)) selC.value = cur;
      }

      const sel = document.getElementById('routeFilterSelect');
      if (sel) {
        const cur = sel.value;
        const routeItems = routes && routes.length ? routes : [...routeSet].map(r => ({ id: r, name: r }));
        sel.innerHTML = '<option value="">All Delivery Routes</option>' + 
          routeItems.map(r => `<option value="${DS_App.escapeHtml(r.id)}">${DS_App.escapeHtml(r.name || r.id)} (${DS_App.escapeHtml(r.id)})</option>`).join('');
        if (cur) sel.value = cur;
      }
    },

    loadAssignments: async function () {
      const date = document.getElementById('routeFilterDate')?.value || '';
      const city1 = document.getElementById('routeFilterCity1')?.value || '';
      const city = document.getElementById('routeFilterCity')?.value || '';
      const routeId = document.getElementById('routeFilterSelect')?.value || '';
      const status = document.getElementById('routeFilterStatus')?.value || '';
      const person = document.getElementById('routeFilterPerson')?.value || '';
      const search = document.getElementById('routeSearchInput')?.value || '';

      try {
        const res = await window.DS_API.getDeliveryAssignments({
          date: date,
          city1: city1,
          city: city,
          route_id: routeId,
          delivery_status: status,
          delivery_person: person,
          search: search,
          limit: 200
        });

        currentAssignments = res.assignments || [];
        this.renderAssignmentsTable(currentAssignments);
      } catch (e) {
        console.error('Failed to load assignments:', e);
      }
    },

    renderAssignmentsTable: function (assignments) {
      const tbody = document.getElementById('routeAssignmentsTableBody');
      const countEl = document.getElementById('assignmentsCountBadge');
      if (countEl) countEl.textContent = `${assignments.length} Stops`;

      if (!tbody) return;

      if (!assignments.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align:center; padding:32px; color:var(--ds-text-muted);">
              No delivery stops assigned matching current filters. Upload a Route Excel sheet or choose another date.
            </td>
          </tr>`;
        return;
      }

      tbody.innerHTML = assignments.map(a => {
        const statusClass = 
          a.delivery_status === 'Delivered' ? 'badge-delivered' :
          a.delivery_status === 'In Transit' ? 'badge-processing' :
          a.delivery_status === 'Failed' ? 'badge-cancelled-by-customer' : 'badge-pending';

        return `
          <tr data-id="${a.id}">
            <td style="width:70px; text-align:center;">
              <input type="number" class="form-control" value="${a.sequence || 1}" min="1" max="999" 
                style="width:55px; text-align:center; padding:4px; font-weight:800; font-size:12px; display:inline-block;"
                onchange="DS_RouteAssignment.handleSequenceChange(${a.id}, this.value)" title="Change sequence order" />
            </td>
            <td>
              <span class="badge" style="background:#f1f5f9; color:#475569; font-size:10px;">${DS_App.escapeHtml(a.route_id)}</span>
              <div style="font-weight:700; font-size:12px; margin-top:2px;">${DS_App.escapeHtml(a.route_name || a.route_id)}</div>
            </td>
            <td>
              ${a.order_id ? `<a href="order-report.html?search=${encodeURIComponent(a.order_id)}" style="font-weight:800; color:var(--ds-accent); font-size:12px;">${DS_App.escapeHtml(a.order_id)}</a>` : `<a href="order-punching.html?party=${encodeURIComponent(a.customer_name)}&route=${encodeURIComponent(a.route_id || a.route_name || '')}" class="btn btn-sm btn-primary" style="padding:2px 8px; font-size:10px; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:2px;">🛒 Punch Order</a>`}
              <div style="font-size:11px; color:#16a34a; font-weight:700;">${DS_App.money(a.order_amount || 0)}</div>
            </td>
            <td>
              <div style="font-weight:800; font-size:13px; color:#0f172a;">${DS_App.escapeHtml(a.customer_name)}</div>
              <div style="font-size:11px; color:var(--ds-text-muted);">${DS_App.escapeHtml(a.address || 'Local Market')} ${a.area ? `• ${DS_App.escapeHtml(a.area)}` : ''}</div>
              ${a.customer_phone ? `<a href="tel:${DS_App.escapeHtml(a.customer_phone)}" style="font-size:11px; color:#0284c7; text-decoration:none;">📞 ${DS_App.escapeHtml(a.customer_phone)}</a>` : ''}
            </td>
            <td>
              <div style="display:flex; align-items:center; gap:6px;">
                <input type="text" class="form-control" value="${DS_App.escapeHtml(a.delivery_person)}" 
                  style="font-size:12px; padding:4px 8px; max-width:180px;"
                  onchange="DS_RouteAssignment.handleReassignSingle(${a.id}, this.value)" title="Edit to reassign delivery person" />
              </div>
            </td>
            <td>
              <select class="form-control" style="font-size:11px; padding:4px 8px; font-weight:700;"
                onchange="DS_RouteAssignment.handleStatusChange(${a.id}, this.value)">
                <option value="Assigned" ${a.delivery_status === 'Assigned' ? 'selected' : ''}>Assigned (Pending)</option>
                <option value="In Transit" ${a.delivery_status === 'In Transit' ? 'selected' : ''}>In Transit 🚚</option>
                <option value="Delivered" ${a.delivery_status === 'Delivered' ? 'selected' : ''}>Delivered ✅</option>
                <option value="Failed" ${a.delivery_status === 'Failed' ? 'selected' : ''}>Failed / Returned ❌</option>
              </select>
            </td>
            <td>
              <span class="badge ${statusClass}">${DS_App.escapeHtml(a.delivery_status)}</span>
            </td>
          </tr>
        `;
      }).join('');
    },

    applyFilters: function () {
      this.loadRoutes();
      this.loadAssignments();
    },

    resetFilters: function () {
      const today = new Date().toISOString().slice(0, 10);
      const dateInp = document.getElementById('routeFilterDate');
      if (dateInp) dateInp.value = today;

      const selCity1 = document.getElementById('routeFilterCity1');
      if (selCity1) selCity1.value = '';

      const selCity = document.getElementById('routeFilterCity');
      if (selCity) selCity.value = '';

      const selRoute = document.getElementById('routeFilterSelect');
      if (selRoute) selRoute.value = '';

      const selStatus = document.getElementById('routeFilterStatus');
      if (selStatus) selStatus.value = '';

      const inpPerson = document.getElementById('routeFilterPerson');
      if (inpPerson) inpPerson.value = '';

      const inpSearch = document.getElementById('routeSearchInput');
      if (inpSearch) inpSearch.value = '';

      this.applyFilters();
    },

    // Handle stop sequence change
    handleSequenceChange: async function (assignmentId, newSeq) {
      const seqNum = parseInt(newSeq, 10);
      if (isNaN(seqNum) || seqNum < 1) return;

      try {
        await window.DS_API.reorderRouteStops([{ id: assignmentId, sequence: seqNum }]);
        DS_App.toast(`Stop sequence updated to #${seqNum}`, 'success');
        this.loadAssignments();
      } catch (e) {
        DS_App.toast('Failed to update sequence', 'error');
      }
    },

    // Handle delivery person reassign
    handleReassignSingle: async function (assignmentId, newPerson) {
      if (!newPerson.trim()) return;
      try {
        await window.DS_API.reassignDeliveryPerson({
          assignment_id: assignmentId,
          delivery_person: newPerson.trim()
        });
        DS_App.toast(`Reassigned to ${newPerson.trim()}`, 'success');
        this.loadRoutes();
      } catch (e) {
        DS_App.toast('Failed to reassign delivery person', 'error');
      }
    },

    // Handle delivery status update
    handleStatusChange: async function (assignmentId, newStatus) {
      try {
        await window.DS_API.updateDeliveryStopStatus(assignmentId, newStatus);
        DS_App.toast(`Stop status updated to ${newStatus}`, 'success');
        this.loadRoutes();
        this.loadAssignments();
      } catch (e) {
        DS_App.toast('Failed to update status', 'error');
      }
    },

    // ──────────────────────────────────────────────────────────────────────────
    // EXCEL IMPORT WORKFLOW (Requirement 5)
    // ──────────────────────────────────────────────────────────────────────────
    downloadTemplate: function () {
      const headers = ['Route ID', 'Route Name', 'Sequence', 'Customer ID', 'Customer Name', 'Address', 'Area', 'Order Number', 'Delivery Person'];
      const sampleRows = [
        {
          'Route ID': 'RT-NORTH',
          'Route Name': 'Civil Lines & Swaroop Nagar Beat',
          'Sequence': 1,
          'Customer ID': 'P001',
          'Customer Name': 'Shri Ram Kirana Store',
          'Address': '14/12 Civil Lines, Near Green Park',
          'Area': 'Civil Lines',
          'Order Number': 'ORD-2026-5001',
          'Delivery Person': 'Rahul Sharma (SO-101)'
        },
        {
          'Route ID': 'RT-NORTH',
          'Route Name': 'Civil Lines & Swaroop Nagar Beat',
          'Sequence': 2,
          'Customer ID': 'P003',
          'Customer Name': 'Kanpur Provision Mart',
          'Address': '7/110 Swaroop Nagar',
          'Area': 'Swaroop Nagar',
          'Order Number': 'ORD-2026-5003',
          'Delivery Person': 'Rahul Sharma (SO-101)'
        },
        {
          'Route ID': 'RT-SOUTH',
          'Route Name': 'Govind Nagar & Kidwai Nagar Beat',
          'Sequence': 1,
          'Customer ID': 'P002',
          'Customer Name': 'Gupta General Store',
          'Address': 'Shop 4 Govind Nagar Mkt',
          'Area': 'Govind Nagar',
          'Order Number': 'ORD-2026-5002',
          'Delivery Person': 'Amit Verma (SO-102)'
        },
        {
          'Route ID': 'RT-WEST',
          'Route Name': 'Kalyanpur & IIT Beat',
          'Sequence': 1,
          'Customer ID': 'P004',
          'Customer Name': 'Radhey Radhey Traders',
          'Address': 'Main Market Kalyanpur',
          'Area': 'Kalyanpur',
          'Order Number': 'ORD-2026-5004',
          'Delivery Person': 'Suresh Kumar (SO-103)'
        }
      ];

      DS_Filters.exportToExcel(sampleRows, 'DS_Delivery_Route_Assignment_Template.xlsx', 'RouteAssignments');
    },

    openUploadModal: function () {
      parsedExcelRows = [];
      previewData = null;
      const fileInp = document.getElementById('routeExcelFileInput');
      if (fileInp) fileInp.value = '';

      const prevWrap = document.getElementById('routePreviewContainer');
      if (prevWrap) prevWrap.style.display = 'none';

      const confirmBtn = document.getElementById('btnConfirmRouteImport');
      if (confirmBtn) confirmBtn.style.display = 'none';

      DS_App.openModal('routeUploadModal');
    },

    closeUploadModal: function () {
      DS_App.closeModal('routeUploadModal');
    },

    handleFileSelect: function (e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheet];
          parsedExcelRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          if (!parsedExcelRows.length) {
            DS_App.toast('The uploaded Excel file contains no data rows', 'warning');
            return;
          }

          DS_App.toast(`Loaded ${parsedExcelRows.length} rows from ${file.name}. Generating validation preview...`, 'info');
          this.generateImportPreview(file.name);

        } catch (err) {
          console.error(err);
          DS_App.toast('Failed to parse Excel workbook: ' + err.message, 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    },

    generateImportPreview: async function (fileName) {
      const allowNew = document.getElementById('chkAllowNewRoutes')?.checked !== false;
      const assignDate = document.getElementById('uploadAssignDate')?.value || new Date().toISOString().slice(0, 10);

      try {
        const res = await window.DS_API.previewRouteAssignments(parsedExcelRows, allowNew, assignDate);
        if (!res || !res.success) {
          DS_App.toast('Preview validation failed: ' + (res?.error || 'Unknown error'), 'error');
          return;
        }

        previewData = res;
        this.renderPreviewTables(res);

      } catch (err) {
        DS_App.toast('Validation request failed: ' + err.message, 'error');
      }
    },

    renderPreviewTables: function (res) {
      const container = document.getElementById('routePreviewContainer');
      const confirmBtn = document.getElementById('btnConfirmRouteImport');
      if (!container) return;

      container.style.display = 'block';

      const s = res.summary;
      const statHtml = `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:14px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; text-align:center;">
            <div style="font-size:10px; color:var(--ds-text-muted); text-transform:uppercase;">Total Uploaded</div>
            <div style="font-size:18px; font-weight:900;">${s.total_rows}</div>
          </div>
          <div style="background:#ecfdf5; border:1px solid #bbf7d0; border-radius:8px; padding:10px; text-align:center;">
            <div style="font-size:10px; color:#166534; text-transform:uppercase;">✓ Ready to Assign</div>
            <div style="font-size:18px; font-weight:900; color:#15803d;">${s.valid_count}</div>
          </div>
          <div style="background:#fff1f2; border:1px solid #fecdd3; border-radius:8px; padding:10px; text-align:center;">
            <div style="font-size:10px; color:#9f1239; text-transform:uppercase;">⚠️ Unmatched / Invalid</div>
            <div style="font-size:18px; font-weight:900; color:#be123c;">${s.invalid_count}</div>
          </div>
          <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:10px; text-align:center;">
            <div style="font-size:10px; color:#1e40af; text-transform:uppercase;">Routes Affected</div>
            <div style="font-size:18px; font-weight:900; color:#1d4ed8;">${s.routes_affected}</div>
          </div>
        </div>
      `;

      let matchedHtml = '';
      if (res.matched_records && res.matched_records.length) {
        matchedHtml = `
          <div style="margin-bottom:14px;">
            <h5 style="margin:0 0 6px; font-size:13px; font-weight:700; color:#166534;">✓ Valid Stops Ready for Delivery Assignment (${res.matched_records.length})</h5>
            <div class="ds-table-wrap" style="max-height:220px; overflow-y:auto;">
              <table class="ds-table" style="font-size:11.5px;">
                <thead>
                  <tr>
                    <th>Seq</th>
                    <th>Route</th>
                    <th>Customer Name</th>
                    <th>Order No</th>
                    <th>Assigned Delivery Person</th>
                    <th class="num">Order Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${res.matched_records.map(m => `
                    <tr>
                      <td style="font-weight:800; text-align:center;">#${m.sequence}</td>
                      <td><strong>${DS_App.escapeHtml(m.route_id)}</strong> (${DS_App.escapeHtml(m.route_name)})</td>
                      <td>${DS_App.escapeHtml(m.customer_name)}</td>
                      <td><strong>${DS_App.escapeHtml(m.order_number || 'N/A')}</strong></td>
                      <td><span class="badge" style="background:#e0f2fe; color:#0369a1;">${DS_App.escapeHtml(m.delivery_person)}</span></td>
                      <td class="num">${DS_App.money(m.order_amount || 0)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      let unmatchedHtml = '';
      if (res.unmatched_records && res.unmatched_records.length) {
        unmatchedHtml = `
          <div style="margin-bottom:14px; background:#fff1f2; border:1px solid #fecdd3; border-radius:8px; padding:12px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <h5 style="margin:0; font-size:13px; font-weight:700; color:#9f1239;">⚠️ Unmatched Rows & Warnings (${res.unmatched_records.length})</h5>
              <button type="button" class="btn btn-secondary btn-sm" onclick="DS_RouteAssignment.downloadErrorReport()" style="font-size:11px; padding:3px 8px;">
                ⬇ Download Error Report
              </button>
            </div>
            <div class="ds-table-wrap" style="max-height:160px; overflow-y:auto;">
              <table class="ds-table" style="font-size:11px;">
                <thead>
                  <tr>
                    <th>Row #</th>
                    <th>Customer / Order</th>
                    <th>Reason / Validation Issue</th>
                  </tr>
                </thead>
                <tbody>
                  ${res.unmatched_records.map(u => `
                    <tr>
                      <td style="font-weight:800; text-align:center;">Row ${u.row}</td>
                      <td>${DS_App.escapeHtml(u.data?.customer_name || u.data?.order_number || 'N/A')}</td>
                      <td style="color:#be123c; font-weight:600;">${DS_App.escapeHtml(u.reason)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      container.innerHTML = statHtml + matchedHtml + unmatchedHtml;

      if (confirmBtn) {
        confirmBtn.style.display = (res.matched_records && res.matched_records.length > 0) ? 'inline-block' : 'none';
        confirmBtn.textContent = `✓ Confirm & Assign ${res.matched_records.length} Delivery Stops`;
      }
    },

    downloadErrorReport: function () {
      if (!previewData || !previewData.unmatched_records || !previewData.unmatched_records.length) {
        DS_App.toast('No error records to export', 'info');
        return;
      }
      const exportRows = previewData.unmatched_records.map(u => ({
        'Excel Row': u.row,
        'Error Reason': u.reason,
        'Customer Name': u.data?.customer_name || '',
        'Order Number': u.data?.order_number || '',
        'Route ID': u.data?.route_id || '',
        'Delivery Person': u.data?.delivery_person || ''
      }));

      DS_Filters.exportToCSV(exportRows, 'Route_Assignment_Error_Report.csv');
    },

    confirmImport: async function () {
      if (!previewData || !previewData.matched_records || !previewData.matched_records.length) {
        DS_App.toast('No valid records to assign', 'error');
        return;
      }

      const assignDate = document.getElementById('uploadAssignDate')?.value || new Date().toISOString().slice(0, 10);
      const btn = document.getElementById('btnConfirmRouteImport');
      if (btn) btn.disabled = true;

      try {
        const res = await window.DS_API.executeRouteAssignments({
          assignments: previewData.matched_records,
          date: assignDate,
          admin_user: window.DS_Auth ? window.DS_Auth.getSalesPerson() : 'Admin'
        });

        if (res && res.success) {
          DS_App.toast(`✓ ${res.message}`, 'success');
          this.closeUploadModal();
          this.loadRoutes();
          this.loadAssignments();
        } else {
          DS_App.toast('Import failed: ' + (res?.error || 'Unknown error'), 'error');
        }
      } catch (err) {
        DS_App.toast('Execution error: ' + err.message, 'error');
      } finally {
        if (btn) btn.disabled = false;
      }
    },

    // ──────────────────────────────────────────────────────────────────────────
    // PRINTABLE ROUTE DELIVERY SHEET (Requirement 5)
    // ──────────────────────────────────────────────────────────────────────────
    openPrintManifestModal: async function (routeId) {
      const date = document.getElementById('routeFilterDate')?.value || new Date().toISOString().slice(0, 10);

      try {
        const res = await window.DS_API.getRouteManifest(routeId, date);
        if (!res || !res.success) {
          DS_App.toast('Failed to load route delivery manifest', 'error');
          return;
        }

        this.renderPrintManifest(res);
        DS_App.openModal('routeManifestPrintModal');

      } catch (err) {
        DS_App.toast('Manifest error: ' + err.message, 'error');
      }
    },

    renderPrintManifest: function (manifestData) {
      const container = document.getElementById('routeManifestPrintBody');
      if (!container) return;

      const r = manifestData.route;
      const s = manifestData.summary;
      const date = manifestData.assignment_date;
      const dp = manifestData.delivery_person;

      container.innerHTML = `
        <div style="font-family:'Inter', sans-serif; color:#0f172a; padding:10px;">
          <!-- Official Company Header -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #0f172a; padding-bottom:12px; margin-bottom:14px;">
            <div>
              <h2 style="margin:0; font-size:20px; font-weight:900; color:#10213f; letter-spacing:0.5px;">DS ENTERPRISES</h2>
              <p style="margin:2px 0 0; font-size:11px; color:#475569;">FMCG Distribution & Field Sales Logistics System • GT Road, Kanpur, UP</p>
              <div style="font-size:11px; font-weight:700; color:#1e40af; margin-top:2px;">OFFICIAL DELIVERY CHALLAN & RUN SHEET</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:14px; font-weight:900; color:#0f172a;">${DS_App.escapeHtml(r.name)}</div>
              <div style="font-size:11px; color:#64748b;">Route ID: <strong>${DS_App.escapeHtml(r.id)}</strong></div>
              <div style="font-size:11px; color:#64748b;">Delivery Date: <strong>${date}</strong></div>
            </div>
          </div>

          <!-- Manifest Meta Summary Bar -->
          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:10px 14px; margin-bottom:16px; font-size:12px;">
            <div>
              <span style="color:#64748b; font-size:10px; text-transform:uppercase;">Assigned Delivery Person:</span>
              <div style="font-weight:800; font-size:13px; color:#1e40af;">${DS_App.escapeHtml(dp)}</div>
            </div>
            <div>
              <span style="color:#64748b; font-size:10px; text-transform:uppercase;">Total Delivery Stops:</span>
              <div style="font-weight:800; font-size:13px;">${s.total_stops} Retail Stores</div>
            </div>
            <div>
              <span style="color:#64748b; font-size:10px; text-transform:uppercase;">Total Physical Units:</span>
              <div style="font-weight:800; font-size:13px;">${s.total_units} Units</div>
            </div>
            <div>
              <span style="color:#64748b; font-size:10px; text-transform:uppercase;">Total Cash / COD to Collect:</span>
              <div style="font-weight:900; font-size:14px; color:#16a34a;">${DS_App.money(s.total_cod_amount)}</div>
            </div>
          </div>

          <!-- Stops List Table -->
          <table class="ds-table" style="width:100%; font-size:11.5px; border-collapse:collapse; margin-bottom:20px;">
            <thead>
              <tr style="background:#0f172a; color:#ffffff;">
                <th style="padding:6px 8px; text-align:center; width:45px;">Stop</th>
                <th style="padding:6px 8px;">Order No</th>
                <th style="padding:6px 8px;">Retailer / Store Name & Address</th>
                <th style="padding:6px 8px;">Phone</th>
                <th style="padding:6px 8px; text-align:right;">Amount</th>
                <th style="padding:6px 8px; text-align:center;">Payment</th>
                <th style="padding:6px 8px; text-align:center; width:120px;">Receiver Sign & Stamp</th>
              </tr>
            </thead>
            <tbody>
              ${manifestData.stops.map(st => `
                <tr style="border-bottom:1px solid #e2e8f0;">
                  <td style="font-weight:900; text-align:center; background:#f8fafc; font-size:13px;">#${st.sequence}</td>
                  <td style="font-weight:800; color:#1e40af;">${DS_App.escapeHtml(st.order_id || '-')}</td>
                  <td>
                    <strong style="font-size:12px;">${DS_App.escapeHtml(st.customer_name)}</strong>
                    <div style="font-size:10.5px; color:#475569;">${DS_App.escapeHtml(st.address || '')}</div>
                  </td>
                  <td>${DS_App.escapeHtml(st.contact_phone || '-')}</td>
                  <td style="text-align:right; font-weight:800; color:#0f172a;">${DS_App.money(st.total_amount || 0)}</td>
                  <td style="text-align:center;">
                    <span style="font-size:10px; padding:2px 6px; border-radius:4px; font-weight:700; ${st.payment_status === 'Paid' ? 'background:#dcfce7; color:#166534;' : 'background:#fee2e2; color:#991b1b;'}">
                      ${st.payment_status === 'Paid' ? 'PAID' : 'COD DUE'}
                    </span>
                  </td>
                  <td style="border-left:1px dashed #cbd5e1; height:42px;"></td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Signatures Footer -->
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; margin-top:30px; padding-top:20px; border-top:1px solid #cbd5e1; font-size:11px; text-align:center;">
            <div>
              <div style="border-bottom:1px solid #94a3b8; height:30px; margin-bottom:4px;"></div>
              <strong>Warehouse Dispatch Lead</strong>
            </div>
            <div>
              <div style="border-bottom:1px solid #94a3b8; height:30px; margin-bottom:4px;"></div>
              <strong>Delivery Person Signature</strong>
            </div>
            <div>
              <div style="border-bottom:1px solid #94a3b8; height:30px; margin-bottom:4px;"></div>
              <strong>Accounts Verification (Cash Inward)</strong>
            </div>
          </div>
        </div>
      `;
    },

    printManifest: function () {
      window.print();
    },

    exportAssignmentsToExcel: function () {
      if (!currentAssignments || !currentAssignments.length) {
        DS_App.toast('No delivery assignments to export', 'warning');
        return;
      }

      const rows = currentAssignments.map(a => ({
        'Stop Sequence': a.sequence,
        'Route ID': a.route_id,
        'Route Name': a.route_name || a.route_id,
        'Order Number': a.order_id || '',
        'Customer ID': a.customer_id || '',
        'Customer Name': a.customer_name,
        'Address': a.address || '',
        'Area': a.area || '',
        'Phone': a.customer_phone || '',
        'Order Amount': a.order_amount || 0,
        'Delivery Person': a.delivery_person,
        'Delivery Status': a.delivery_status,
        'Assignment Date': a.assignment_date
      }));

      DS_Filters.exportToExcel(rows, `Delivery_Assignments_${new Date().toISOString().slice(0, 10)}.xlsx`, 'Assignments');
    }
  };

  window.DS_RouteAssignment = DS_RouteAssignment;

})(window);
