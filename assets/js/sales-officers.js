/**
 * ==========================================================================
 * DS ENTERPRISES — STAFF, ROLES & PERMISSIONS MATRIX CONTROLLER
 * File: assets/js/sales-officers.js
 * Architecture: Enterprise Roles & Responsibility Matrix, Staff Directory,
 *               Admin Role Assignment, Fine-Grained Permissions & Testing Switch
 * ==========================================================================
 */

(function (window) {
  'use strict';

  const PERMISSION_DEFINITIONS = [
    {
      group: 'Product Catalog & Warehouse Inventory',
      items: [
        { key: 'canManageProducts', label: 'Product Catalog CRUD', desc: 'Create, update & delete products, brands and packaging' },
        { key: 'canAdjustStock', label: 'Stock Inward & Adjust', desc: 'Record physical stock adjustments, inward stock & reorder levels' },
        { key: 'canViewMargins', label: 'View Margins & Costs', desc: 'Inspect purchase rates, gross margin % and profitability calculations' }
      ]
    },
    {
      group: 'Field Orders & Logistics Fulfillment',
      items: [
        { key: 'canPunchOrders', label: 'Field Order Booking', desc: 'Punch store orders in beat routes and manage shopping carts' },
        { key: 'canApproveOrders', label: 'Order Status Approval', desc: 'Authorize booked orders and advance them to Approved status' },
        { key: 'canManageDispatch', label: 'Dispatch & Van Manifests', desc: 'Generate dispatch delivery challans and van loading sheets' }
      ]
    },
    {
      group: 'Collections & Receivables',
      items: [
        { key: 'canCollectPayments', label: 'Payment Recovery', desc: 'Record cash/UPI payments in the field and trigger WhatsApp slips' },
        { key: 'canViewOutstanding', label: 'Party Outstanding Ledgers', desc: 'Access retail store outstanding balances and aging buckets' }
      ]
    },
    {
      group: 'Business Intelligence & Export',
      items: [
        { key: 'canViewAnalytics', label: 'Sales & Beat Analytics', desc: 'Access deep party-wise, beat route and brand sales matrices' },
        { key: 'canExportReports', label: 'Export Excel & PDF', desc: 'Download system ledgers and invoices to Excel (.xlsx) and PDF' }
      ]
    },
    {
      group: 'Administration & Master Control',
      items: [
        { key: 'canManageStaff', label: 'Staff & Role Admin', desc: 'Register staff members, assign security roles & configure credentials' },
        { key: 'canImportData', label: 'Excel / Tally Ingest', desc: 'Ingest 4-file workbooks to update inventory, parties and sales' },
        { key: 'canResetData', label: 'Database Reset & Wipe', desc: 'Reset test orders or clear operational ledger database' }
      ]
    }
  ];

  const ALL_PERM_KEYS = [
    'canManageProducts', 'canAdjustStock', 'canViewMargins',
    'canPunchOrders', 'canApproveOrders', 'canManageDispatch',
    'canCollectPayments', 'canViewOutstanding',
    'canViewAnalytics', 'canExportReports',
    'canManageStaff', 'canImportData', 'canResetData'
  ];

  const DS_SalesOfficers = {
    currentTab: 'directory',

    getRoleConfig: function () {
      if (window.DS_Auth && typeof window.DS_Auth.getRoleConfig === 'function') {
        return window.DS_Auth.getRoleConfig();
      }
      if (window.DS_Auth && window.DS_Auth.ROLE_CONFIG) {
        return window.DS_Auth.ROLE_CONFIG;
      }
      return {
        admin: { id: 'admin', label: 'Administrator', emoji: '👑', badgeClass: 'admin', badgeStyle: 'background:linear-gradient(135deg, #f59e0b, #d97706); color:#fff;' },
        ims_manager: { id: 'ims_manager', label: 'IMS Warehouse Lead', emoji: '📦', badgeClass: 'ims', badgeStyle: 'background:linear-gradient(135deg, #d97706, #b45309); color:#fff;' },
        dispatcher: { id: 'dispatcher', label: 'Dispatch & Logistics', emoji: '🚚', badgeClass: 'dispatcher', badgeStyle: 'background:linear-gradient(135deg, #2563eb, #1d4ed8); color:#fff;' },
        so: { id: 'so', label: 'Field Sales Officer', emoji: '👤', badgeClass: 'so', badgeStyle: 'background:linear-gradient(135deg, #0d9488, #0f766e); color:#fff;' },
        accounts: { id: 'accounts', label: 'Accounts & Recovery', emoji: '💰', badgeClass: 'accounts', badgeStyle: 'background:linear-gradient(135deg, #059669, #047857); color:#fff;' },
        billing_operator: { id: 'billing_operator', label: 'Billing Desk', emoji: '🧾', badgeClass: 'billing_operator', badgeStyle: 'background:linear-gradient(135deg, #7c3aed, #6d28d9); color:#fff;' },
        viewer: { id: 'viewer', label: 'Auditor / Viewer', emoji: '👁️', badgeClass: 'viewer', badgeStyle: 'background:linear-gradient(135deg, #64748b, #475569); color:#fff;' }
      };
    },

    init: function () {
      this.setupPermissions();
      this.populateRouteSuggestions();
      this.populateRouteFilter();
      this.renderDirectory();
      this.renderMatrix();
      this.checkUrlParams();
    },

    populateRouteFilter: function () {
      const sel = document.getElementById('filterStaffRoute');
      if (!sel) return;
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { party: [] };
      const parties = db.party || [];
      const officers = window.DS_Storage ? window.DS_Storage.getOfficers() : [];
      const routes = [...new Set([
        ...parties.map(p => p.route),
        ...officers.map(o => o.route)
      ].filter(Boolean))].sort();

      const cur = sel.value;
      sel.innerHTML = '<option value="">All Beat Routes</option>' + routes.map(r => `
        <option value="${DS_App.escapeHtml(r)}" ${cur === r ? 'selected' : ''}>${DS_App.escapeHtml(r)}</option>
      `).join('');
    },

    resetFilters: function () {
      const rf = document.getElementById('filterStaffRole'); if (rf) rf.value = '';
      const rtf = document.getElementById('filterStaffRoute'); if (rtf) rtf.value = '';
      const st = document.getElementById('searchStaffText'); if (st) st.value = '';
      this.renderDirectory();
    },

    checkUrlParams: function () {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'register' || params.get('register') === 'true') {
        setTimeout(() => this.openAddModal(), 150);
      } else if (params.get('tab') === 'matrix') {
        this.switchTab('matrix');
      } else if (params.get('tab') === 'routemap') {
        this.switchTab('routemap');
      }
    },

    setupPermissions: function () {
      const isAdmin = window.DS_Auth ? (window.DS_Auth.isAdmin() || window.DS_Auth.hasPermission('canManageStaff') || window.DS_Auth.getCurrentRole() === 'admin') : true;
      const addBtn = document.getElementById('btnOpenAddOfficer');
      const adminNotice = document.getElementById('soAdminOnlyNotice');

      if (addBtn) addBtn.style.display = 'inline-flex';
      if (adminNotice) adminNotice.style.display = isAdmin ? 'none' : 'block';
    },

    switchTab: function (tab) {
      this.currentTab = tab;
      const viewDir = document.getElementById('viewStaffDirectory');
      const viewMat = document.getElementById('viewRolesMatrix');
      const viewRoute = document.getElementById('viewRouteMap');
      const btnDir = document.getElementById('tabStaffDirectoryBtn');
      const btnMat = document.getElementById('tabRolesMatrixBtn');
      const btnRoute = document.getElementById('tabRouteMapBtn');

      if (viewDir) viewDir.style.display = (tab === 'directory') ? 'block' : 'none';
      if (viewMat) viewMat.style.display = (tab === 'matrix') ? 'block' : 'none';
      if (viewRoute) viewRoute.style.display = (tab === 'routemap') ? 'block' : 'none';

      if (btnDir) btnDir.className = (tab === 'directory') ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
      if (btnMat) btnMat.className = (tab === 'matrix') ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
      if (btnRoute) btnRoute.className = (tab === 'routemap') ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';

      if (tab === 'matrix') {
        this.renderMatrix();
      } else if (tab === 'routemap') {
        this.renderRouteMapAssignmentTable();
      } else {
        this.renderDirectory();
      }
    },

    getFilteredOfficers: function () {
      if (!window.DS_Storage) return [];
      const officers = window.DS_Storage.getOfficers();
      const roleFilter = document.getElementById('filterStaffRole')?.value || '';
      const routeFilter = document.getElementById('filterStaffRoute')?.value || '';
      const search = (document.getElementById('searchStaffText')?.value || '').trim().toLowerCase();

      return officers.filter(o => {
        if (roleFilter && (o.role || 'so') !== roleFilter) return false;
        if (routeFilter && String(o.route || '') !== routeFilter) return false;
        if (search) {
          const matchName = String(o.name || '').toLowerCase().includes(search);
          const matchUser = String(o.userId || o.id || '').toLowerCase().includes(search);
          const matchRoute = String(o.route || '').toLowerCase().includes(search);
          const matchPhone = String(o.phone || '').includes(search);
          if (!matchName && !matchUser && !matchRoute && !matchPhone) return false;
        }
        return true;
      });
    },

    renderDirectory: function () {
      const container = document.getElementById('soDirectoryGrid');
      const countEl = document.getElementById('staffTotalCount');
      if (!container || !window.DS_Storage) return;

      const officers = this.getFilteredOfficers();
      const allOfficers = window.DS_Storage.getOfficers();
      if (countEl) countEl.textContent = allOfficers.length;

      const db = window.DS_Storage.getDB();
      const sales = Array.isArray(db.sales) ? db.sales : [];
      const isAdmin = window.DS_Auth ? (window.DS_Auth.isAdmin() || window.DS_Auth.hasPermission('canManageStaff')) : false;
      const roleConfig = this.getRoleConfig();

      if (!officers.length) {
        container.innerHTML = `
          <div style="grid-column:1/-1; text-align:center; padding:50px 20px; color:var(--ds-text-muted);">
            <div style="font-size:42px; margin-bottom:10px;">👥</div>
            <h3>No Staff Found</h3>
            <p>Try clearing filters or click "+ Register New Staff / User" above.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = officers.map(officer => {
        const roleKey = officer.role || 'so';
        const roleInfo = roleConfig[roleKey] || roleConfig.so;
        const perms = officer.permissions || roleInfo.defaults || {};

        // Calculate sales for SOs
        const officerSales = sales
          .filter(s => (s.salesPerson && s.salesPerson.toLowerCase() === officer.name.toLowerCase()) || s.soId === officer.id)
          .reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

        const target = Number(officer.target) || 0;
        const percent = target > 0 ? Math.min(100, Math.round((officerSales / target) * 100)) : 0;
        const initial = officer.name ? officer.name.charAt(0).toUpperCase() : 'S';

        // Count granted permissions
        const grantedCount = ALL_PERM_KEYS.filter(k => Boolean(perms[k])).length;
        const isFullyAuthorized = (grantedCount === ALL_PERM_KEYS.length);

        // Responsibility Pills
        const permPills = [];
        if (perms.canManageProducts) permPills.push('<span style="background:#e0f2fe; color:#0369a1; padding:2px 5px; border-radius:3px; font-size:9.5px; font-weight:700;">Products</span>');
        if (perms.canAdjustStock) permPills.push('<span style="background:#fef3c7; color:#b45309; padding:2px 5px; border-radius:3px; font-size:9.5px; font-weight:700;">Stock Inward</span>');
        if (perms.canViewMargins) permPills.push('<span style="background:#ecfdf5; color:#047857; padding:2px 5px; border-radius:3px; font-size:9.5px; font-weight:700;">Margins</span>');
        if (perms.canApproveOrders) permPills.push('<span style="background:#f3e8ff; color:#7e22ce; padding:2px 5px; border-radius:3px; font-size:9.5px; font-weight:700;">Approvals</span>');
        if (perms.canManageDispatch) permPills.push('<span style="background:#dbeafe; color:#1d4ed8; padding:2px 5px; border-radius:3px; font-size:9.5px; font-weight:700;">Dispatch</span>');
        if (perms.canPunchOrders) permPills.push('<span style="background:#eff6ff; color:#1d4ed8; padding:2px 5px; border-radius:3px; font-size:9.5px; font-weight:700;">Order Punch</span>');
        if (perms.canCollectPayments) permPills.push('<span style="background:#f0fdf4; color:#15803d; padding:2px 5px; border-radius:3px; font-size:9.5px; font-weight:700;">Collections</span>');
        if (perms.canViewOutstanding) permPills.push('<span style="background:#fef9c3; color:#854d0e; padding:2px 5px; border-radius:3px; font-size:9.5px; font-weight:700;">Outstanding</span>');
        if (perms.canViewAnalytics) permPills.push('<span style="background:#e0e7ff; color:#4338ca; padding:2px 5px; border-radius:3px; font-size:9.5px; font-weight:700;">Analytics</span>');
        if (perms.canExportReports) permPills.push('<span style="background:#f1f5f9; color:#475569; padding:2px 5px; border-radius:3px; font-size:9.5px; font-weight:700;">Export</span>');
        if (perms.canManageStaff) permPills.push('<span style="background:#faf5ff; color:#9333ea; padding:2px 5px; border-radius:3px; font-size:9.5px; font-weight:700;">Staff Admin</span>');
        if (perms.canImportData) permPills.push('<span style="background:#fef2f2; color:#991b1b; padding:2px 5px; border-radius:3px; font-size:9.5px; font-weight:700;">Ingest</span>');
        if (perms.canResetData) permPills.push('<span style="background:#fee2e2; color:#b91c1c; padding:2px 5px; border-radius:3px; font-size:9.5px; font-weight:700;">Reset</span>');

        return `
          <div class="store-card" style="display:flex; flex-direction:column; justify-content:space-between; padding:12px; border-radius:8px; background:#ffffff; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.03);">
            <div>
              <!-- Header with Initial Avatar and Role Badge -->
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <div style="width:36px; height:36px; border-radius:6px; background:${roleInfo.badgeStyle || 'linear-gradient(135deg, #1e5eff, #0d9488)'}; color:#ffffff; display:grid; place-items:center; font-size:15px; font-weight:800; box-shadow:0 2px 6px rgba(0,0,0,0.08);">
                    ${initial}
                  </div>
                  <div>
                    <h4 style="margin:0 0 1px; font-size:13.5px; font-weight:800; color:var(--ds-text);">${officer.name}</h4>
                    <span style="display:inline-block; font-size:10px; padding:1px 5px; border-radius:3px; background:#f1f5f9; color:#475569; font-family:monospace; font-weight:700;">
                      ${officer.id}
                    </span>
                  </div>
                </div>

                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:3px;">
                  <!-- Role Pill -->
                  <span class="badge" style="${roleInfo.badgeStyle} font-size:10.5px; font-weight:800; padding:2px 6px; border-radius:4px;">
                    ${roleInfo.label}
                  </span>
                  ${isFullyAuthorized ? `
                    <span style="display:inline-flex; align-items:center; gap:2px; font-size:9.5px; font-weight:800; padding:1px 5px; border-radius:3px; background:#dcfce7; color:#15803d; border:1px solid #86efac;">
                      Authorized
                    </span>
                  ` : `
                    <span style="display:inline-flex; align-items:center; gap:2px; font-size:9.5px; font-weight:800; padding:1px 5px; border-radius:3px; background:#fef3c7; color:#b45309; border:1px solid #fde68a;">
                      ${grantedCount}/13 Active
                    </span>
                  `}
                </div>
              </div>

              <!-- Login Credentials Setup (Admin View) -->
              <div style="background:#f8fafc; padding:6px 8px; border-radius:6px; margin-bottom:8px; font-size:11.5px; border:1px solid #f1f5f9;">
                <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                  <span style="color:var(--ds-text-muted);">Login User ID:</span>
                  <strong style="color:var(--ds-primary); font-family:monospace;">${officer.userId || officer.id.toLowerCase()}</strong>
                </div>
                <div style="display:flex; justify-content:space-between;">
                  <span style="color:var(--ds-text-muted);">Password:</span>
                  <strong style="color:#334155; font-family:monospace;">${officer.password || '••••'}</strong>
                </div>
              </div>

              <!-- Route & Contact Details -->
              <div style="display:flex; flex-direction:column; gap:4px; font-size:11.5px; color:var(--ds-text-secondary); margin-bottom:8px;">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span>Beat / Dept:</span>
                  <strong style="color:var(--ds-text);">${officer.route || 'General Beat'}</strong>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <span>Phone:</span>
                  <a href="tel:${officer.phone}" style="color:var(--ds-accent); text-decoration:none; font-weight:600;">${officer.phone || '-'}</a>
                </div>
              </div>

              <!-- Granted Responsibilities Pills -->
              <div style="margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                  <span style="font-size:10.5px; text-transform:uppercase; font-weight:800; color:var(--ds-text-muted);">
                    Granted Responsibilities:
                  </span>
                  <span style="font-size:10px; font-weight:700; color:#0284c7; background:#e0f2fe; padding:1px 5px; border-radius:8px;">
                    ${grantedCount} / 13 Active
                  </span>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:3px;">
                  ${permPills.length ? permPills.join('') : '<span style="font-size:10.5px; color:#94a3b8;">No permissions assigned</span>'}
                </div>
              </div>
            </div>

            <!-- Target Achievement & Action Buttons -->
            <div>
              ${target > 0 ? `
                <div style="margin-bottom:8px;">
                  <div style="display:flex; justify-content:space-between; font-size:10.5px; margin-bottom:3px; font-weight:700;">
                    <span style="color:var(--ds-text-muted);">Target Achievement</span>
                    <span style="color:var(--ds-emerald); font-weight:800;">₹ ${officerSales.toLocaleString('en-IN')} / ₹ ${target.toLocaleString('en-IN')} (${percent}%)</span>
                  </div>
                  <div style="height:5px; background:#e2e8f0; border-radius:6px; overflow:hidden;">
                    <div style="height:100%; width:${percent}%; background:linear-gradient(90deg, #10b981, #059669); border-radius:6px;"></div>
                  </div>
                </div>
              ` : ''}

              <div style="display:flex; gap:6px; justify-content:space-between; align-items:center; border-top:1px solid #f1f5f9; padding-top:6px; flex-wrap:wrap;">
                <div style="display:flex; gap:4px; align-items:center;">
                  ${!isFullyAuthorized ? `
                    <button type="button" class="btn btn-sm" onclick="DS_SalesOfficers.quickAuthorizeOfficer('${officer.id}')" style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; font-weight:700; font-size:10.5px; padding:2px 6px;" title="Is staff member ko sabhi 13 permissions instant grant karein">
                      Authorize All
                    </button>
                  ` : '<span style="font-size:10.5px; color:#10b981; font-weight:700;">Authorized</span>'}
                </div>
                ${isAdmin ? `
                  <div style="display:flex; gap:4px;">
                    <button type="button" class="btn btn-secondary btn-sm" style="font-size:11px; padding:2px 6px;" onclick="DS_SalesOfficers.openEditModal('${officer.id}')">
                      Edit
                    </button>
                    <button type="button" class="btn btn-danger btn-sm" style="font-size:11px; padding:2px 6px;" onclick="DS_SalesOfficers.deleteOfficer('${officer.id}', '${officer.name}')">
                      Remove
                    </button>
                  </div>
                ` : `
                  <span style="font-size:11px; color:var(--ds-text-light);">Staff Profile</span>
                `}
              </div>
            </div>
          </div>
        `;
      }).join('');
    },

    renderMatrix: function () {
      const table = document.getElementById('rolesMatrixTable');
      if (!table) return;

      const roles = ['admin', 'ims_manager', 'dispatcher', 'so', 'accounts', 'billing_operator', 'viewer'];
      const roleConfig = this.getRoleConfig();

      // Update universal mode checkbox if present
      const chkUniversal = document.getElementById('chkUniversalAllAuth');
      if (chkUniversal && window.DS_Auth && typeof window.DS_Auth.isAllAuthorizedMode === 'function') {
        chkUniversal.checked = window.DS_Auth.isAllAuthorizedMode();
      }
      this.updateMatrixStatusBadge();

      let html = `
        <thead>
          <tr>
            <th style="min-width:240px; text-align:left;">
              <div style="font-weight:800; font-size:13px; color:var(--ds-text);">Module / Feature Permission</div>
              <div style="font-size:10px; color:var(--ds-text-muted); font-weight:500;">Click any check (✓ / ✕) to customize</div>
            </th>
            ${roles.map(r => {
              const cfg = roleConfig[r] || { label: r, emoji: '' };
              const isAdminRole = (r === 'admin');
              return `
                <th style="min-width:120px; text-align:center;">
                  <div style="font-size:17px; margin-bottom:2px;">${cfg.emoji || ''}</div>
                  <div style="font-size:12px; font-weight:800; color:var(--ds-text);">${cfg.label}</div>
                  ${!isAdminRole ? `
                    <div style="display:flex; justify-content:center; gap:4px; margin-top:6px;">
                      <button type="button" class="btn btn-xs" onclick="DS_SalesOfficers.authorizeEntireRole('${r}')" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; font-weight:700;" title="Authorize all features for ${cfg.label}">
                        ✓ All
                      </button>
                      <button type="button" class="btn btn-xs" onclick="DS_SalesOfficers.clearEntireRole('${r}')" style="background:#fee2e2; color:#dc2626; border:1px solid #fca5a5; font-weight:700;" title="Clear features for ${cfg.label}">
                        ✕ Clear
                      </button>
                    </div>
                  ` : `
                    <span style="display:inline-block; margin-top:6px; font-size:10px; font-weight:700; color:#d97706; background:#fef3c7; padding:1px 6px; border-radius:4px;">Master</span>
                  `}
                </th>
              `;
            }).join('')}
          </tr>
        </thead>
        <tbody>
      `;

      PERMISSION_DEFINITIONS.forEach(group => {
        html += `
          <tr class="matrix-group-header">
            <td colspan="${roles.length + 1}" style="padding:8px 14px; background:#f1f5f9; font-weight:800; color:var(--ds-primary); font-size:11px; text-transform:uppercase; letter-spacing:0.5px;">
              ${group.group}
            </td>
          </tr>
        `;

        group.items.forEach(item => {
          html += `
            <tr>
              <td>
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                  <div>
                    <div style="font-weight:700; color:var(--ds-text);">${item.label}</div>
                    <div style="font-size:11px; color:var(--ds-text-muted); line-height:1.2; margin-top:2px;">${item.desc}</div>
                  </div>
                  <button type="button" class="btn btn-xs" onclick="DS_SalesOfficers.authorizePermissionForAll('${item.key}')" style="background:#f8fafc; color:#0369a1; border:1px solid #bae6fd; font-weight:700; white-space:nowrap;" title="Sabhi roles ko yeh feature authorize karein">
                    ✓ All Roles
                  </button>
                </div>
              </td>
              ${roles.map(r => {
                const cfg = roleConfig[r] || {};
                const allowed = cfg.defaults ? Boolean(cfg.defaults[item.key]) : false;
                const isAdminRole = (r === 'admin');
                if (isAdminRole) {
                  return `
                    <td style="text-align:center;">
                      <span class="ds-matrix-toggle-btn allowed" style="cursor:default;" title="👑 Administrator has permanent Master Access">✓</span>
                    </td>
                  `;
                }
                return `
                  <td style="text-align:center;">
                    <button type="button" class="ds-matrix-toggle-btn ${allowed ? 'allowed' : 'denied'}"
                            onclick="DS_SalesOfficers.toggleCell('${r}', '${item.key}')"
                            title="${allowed ? '✓ Authorized (Click to Restrict)' : '✕ Restricted (Click to Authorize)'}"
                            aria-label="Toggle ${item.label} for ${cfg.label}">
                      ${allowed ? '✓' : '✕'}
                    </button>
                  </td>
                `;
              }).join('')}
            </tr>
          `;
        });
      });

      html += '</tbody>';
      table.innerHTML = html;
    },

    toggleCell: function (roleKey, permKey) {
      if (roleKey === 'admin') return;
      if (!window.DS_Auth) return;
      const roleConfig = this.getRoleConfig();
      const current = Boolean(roleConfig[roleKey] && roleConfig[roleKey].defaults && roleConfig[roleKey].defaults[permKey]);
      const nextVal = !current;
      window.DS_Auth.setRolePermission(roleKey, permKey, nextVal);
      this.renderMatrix();
      if (window.DS_App) {
        DS_App.toast(`${nextVal ? '✓ Authorized' : '✕ Restricted'} ${permKey} for ${roleConfig[roleKey].label}`, nextVal ? 'success' : 'info');
      }
    },

    authorizeAllRoles: function () {
      if (!window.DS_Auth) return;
      window.DS_Auth.authorizeAllRoles();
      this.renderMatrix();
      this.renderDirectory();
      if (window.DS_App) {
        DS_App.toast('✓ Sabko Authorized! All 7 Enterprise Roles are now 100% Authorized with Full Privileges.', 'success');
      }
    },

    authorizeAllStaff: function () {
      if (!window.DS_Auth) return;
      const count = window.DS_Auth.authorizeAllStaff();
      this.renderDirectory();
      this.renderMatrix();
      if (window.DS_App) {
        DS_App.toast(`✓ Sab Staff Authorized! All ${count} staff accounts have been granted 100% Full Permissions (13/13).`, 'success');
      }
    },

    authorizeEntireRole: function (roleKey) {
      if (!window.DS_Auth) return;
      window.DS_Auth.authorizeRole(roleKey);
      this.renderMatrix();
      const roleConfig = this.getRoleConfig();
      if (window.DS_App) {
        DS_App.toast(`✓ All permissions authorized for ${roleConfig[roleKey].label}!`, 'success');
      }
    },

    clearEntireRole: function (roleKey) {
      if (!window.DS_Auth) return;
      window.DS_Auth.clearRole(roleKey);
      this.renderMatrix();
      const roleConfig = this.getRoleConfig();
      if (window.DS_App) {
        DS_App.toast(`✕ All permissions restricted for ${roleConfig[roleKey].label}.`, 'info');
      }
    },

    authorizePermissionForAll: function (permKey) {
      if (!window.DS_Auth) return;
      window.DS_Auth.authorizePermissionForAllRoles(permKey);
      this.renderMatrix();
      if (window.DS_App) {
        DS_App.toast(`✓ Permission [${permKey}] is now Authorized across ALL roles!`, 'success');
      }
    },

    toggleUniversalMode: function (enabled) {
      if (!window.DS_Auth) return;
      window.DS_Auth.setAllAuthorizedMode(enabled);
      this.renderMatrix();
      this.renderDirectory();
      if (window.DS_App) {
        if (enabled) {
          DS_App.toast('🔓 Universal Full Access Mode Enabled! All users will bypass all permission restrictions.', 'success');
        } else {
          DS_App.toast('🔒 Universal Full Access Mode Disabled. Dynamic matrix permissions restored.', 'info');
        }
      }
    },

    quickAuthorizeOfficer: function (officerId) {
      if (!window.DS_Storage) return;
      const allPerms = {};
      ALL_PERM_KEYS.forEach(k => { allPerms[k] = true; });
      const updated = window.DS_Storage.updateOfficer(officerId, { permissions: allPerms });
      this.renderDirectory();
      if (window.DS_App) {
        DS_App.toast(`✓ ${updated ? updated.name : 'Staff'} is now Fully Authorized with all 13 permissions!`, 'success');
      }
    },

    saveMatrixManual: function () {
      if (window.DS_Auth) window.DS_Auth.saveRoleConfig();
      this.renderMatrix();
      if (window.DS_App) {
        DS_App.toast('💾 Dynamic Roles & Permissions Matrix configuration successfully saved!', 'success');
      }
    },

    resetToDefaults: function () {
      if (!confirm('Are you sure you want to reset all role permissions back to original FMCG defaults?')) {
        return;
      }
      if (window.DS_Auth) window.DS_Auth.resetRoleConfigToDefaults();
      this.renderMatrix();
      this.renderDirectory();
      if (window.DS_App) {
        DS_App.toast('↺ Role permissions reset to original system defaults.', 'info');
      }
    },

    updateMatrixStatusBadge: function () {
      const badge = document.getElementById('matrixStatusBadge');
      if (!badge) return;
      const isUniversal = window.DS_Auth && typeof window.DS_Auth.isAllAuthorizedMode === 'function' && window.DS_Auth.isAllAuthorizedMode();
      if (isUniversal) {
        badge.textContent = 'Universal Full Access Mode Active';
        badge.style.background = '#dcfce7';
        badge.style.color = '#15803d';
      } else {
        badge.textContent = 'Dynamic Custom Permissions Active';
        badge.style.background = '#e0f2fe';
        badge.style.color = '#0369a1';
      }
    },

    openAddModal: function () {
      const isAuth = !window.DS_Auth || window.DS_Auth.isAdmin() || window.DS_Auth.hasPermission('canManageStaff') || window.DS_Auth.getCurrentRole() === 'admin';
      if (!isAuth) {
        DS_App.toast('Permission Denied: Administrator rights required to register staff!', 'error');
        return;
      }
      const form = document.getElementById('addOfficerForm');
      if (form) form.reset();
      const errBox = document.getElementById('officerModalError');
      if (errBox) errBox.style.display = 'none';

      document.getElementById('editOfficerId').value = '';
      document.getElementById('addOfficerTitle').textContent = 'Register Staff & Assign IMS Role';

      document.getElementById('staffRoleSelect').value = 'so';
      this.handleRoleSelect('so');

      DS_App.openModal('addOfficerModal');
    },

    openEditModal: function (officerId) {
      const isAuth = !window.DS_Auth || window.DS_Auth.isAdmin() || window.DS_Auth.hasPermission('canManageStaff') || window.DS_Auth.getCurrentRole() === 'admin';
      if (!isAuth) {
        DS_App.toast('Permission Denied: Administrator rights required to edit staff accounts!', 'error');
        return;
      }

      const officers = window.DS_Storage ? window.DS_Storage.getOfficers() : [];
      const officer = officers.find(o => o.id === officerId);
      if (!officer) return;

      const errBox = document.getElementById('officerModalError');
      if (errBox) errBox.style.display = 'none';

      document.getElementById('editOfficerId').value = officer.id;
      document.getElementById('regOfficerId').value = officer.id;
      document.getElementById('newOfficerName').value = officer.name || '';
      document.getElementById('newOfficerUserId').value = officer.userId || officer.id.toLowerCase();
      document.getElementById('newOfficerPassword').value = officer.password || '1234';
      document.getElementById('newOfficerPhone').value = officer.phone || '';
      document.getElementById('newOfficerRoute').value = officer.route || '';
      document.getElementById('newOfficerTarget').value = officer.target || 0;

      const role = officer.role || 'so';
      document.getElementById('staffRoleSelect').value = role;

      const roleConfig = this.getRoleConfig();
      const roleDef = roleConfig[role] || roleConfig.so;
      const perms = officer.permissions || roleDef.defaults || {};

      ALL_PERM_KEYS.forEach(k => {
        const el = document.getElementById('perm' + k.charAt(3).toUpperCase() + k.slice(4));
        if (el) el.checked = Boolean(perms[k]);
      });

      this.updateRoleHint(role);
      document.getElementById('addOfficerTitle').textContent = `Edit Role & Permissions — ${officer.name}`;
      DS_App.openModal('addOfficerModal');
    },

    updateRoleHint: function (role) {
      const hint = document.getElementById('roleDescriptionHint');
      const roleConfig = this.getRoleConfig();
      const cfg = roleConfig[role];
      if (hint && cfg) {
        hint.textContent = `${cfg.description || ''}`;
      }
    },

    handleRoleSelect: function (role) {
      const roleConfig = this.getRoleConfig();
      const defaults = (roleConfig[role] && roleConfig[role].defaults) ? roleConfig[role].defaults : {};

      ALL_PERM_KEYS.forEach(k => {
        const el = document.getElementById('perm' + k.charAt(3).toUpperCase() + k.slice(4));
        if (el) el.checked = Boolean(defaults[k]);
      });

      // Update ID prefix if adding new
      const editId = document.getElementById('editOfficerId').value;
      if (!editId) {
        const officers = window.DS_Storage ? window.DS_Storage.getOfficers() : [];
        const prefixes = {
          admin: 'ADM-',
          ims_manager: 'IMS-',
          dispatcher: 'DISP-',
          so: 'SO-',
          accounts: 'ACC-',
          billing_operator: 'BILL-',
          viewer: 'AUD-'
        };
        const p = prefixes[role] || 'SO-';
        document.getElementById('regOfficerId').value = `${p}${100 + officers.length + 1}`;
      }

      this.updateRoleHint(role);
    },

    resetPermsToRoleDefaults: function () {
      const role = document.getElementById('staffRoleSelect').value;
      const roleConfig = this.getRoleConfig();
      const defaults = (roleConfig[role] && roleConfig[role].defaults) ? roleConfig[role].defaults : {};

      ALL_PERM_KEYS.forEach(k => {
        const el = document.getElementById('perm' + k.charAt(3).toUpperCase() + k.slice(4));
        if (el) el.checked = Boolean(defaults[k]);
      });
      if (window.DS_App) DS_App.toast(`Permissions reset to standard ${role.toUpperCase()} defaults`, 'info');
    },

    toggleAllPerms: function (val) {
      ALL_PERM_KEYS.forEach(k => {
        const el = document.getElementById('perm' + k.charAt(3).toUpperCase() + k.slice(4));
        if (el) el.checked = Boolean(val);
      });
    },

    handleSaveSubmit: function (e) {
      if (e) e.preventDefault();

      const editId = document.getElementById('editOfficerId').value.trim();
      const name = document.getElementById('newOfficerName').value.trim();
      const userId = document.getElementById('newOfficerUserId').value.trim().toLowerCase();
      const password = document.getElementById('newOfficerPassword').value.trim();
      const phone = document.getElementById('newOfficerPhone').value.trim();
      const route = document.getElementById('newOfficerRoute').value.trim();
      const target = Number(document.getElementById('newOfficerTarget').value) || 0;
      const role = document.getElementById('staffRoleSelect').value;
      const errBox = document.getElementById('officerModalError');

      if (!name || !userId || !password || !phone) {
        if (errBox) {
          errBox.textContent = 'Please fill in Name, User ID, Password and Phone number!';
          errBox.style.display = 'block';
        }
        return;
      }

      const permissions = {};
      ALL_PERM_KEYS.forEach(k => {
        const el = document.getElementById('perm' + k.charAt(3).toUpperCase() + k.slice(4));
        permissions[k] = el ? el.checked : false;
      });

      if (editId) {
        window.DS_Storage.updateOfficer(editId, {
          name: name,
          userId: userId,
          password: password,
          phone: phone,
          route: route,
          target: target,
          role: role,
          permissions: permissions
        });
        DS_App.toast(`Updated Role & Permissions for ${name} (${role.toUpperCase()})`, 'success');
        DS_App.closeModal('addOfficerModal');
        this.renderDirectory();
      } else {
        const res = window.DS_Auth.registerOfficer({
          name: name,
          userId: userId,
          password: password,
          phone: phone,
          route: route,
          target: target,
          role: role,
          permissions: permissions
        });

        if (res.success) {
          DS_App.closeModal('addOfficerModal');
          this.renderDirectory();
        } else {
          if (errBox) {
            errBox.textContent = res.message || 'Registration failed!';
            errBox.style.display = 'block';
          }
        }
      }
    },

    deleteOfficer: function (officerId, officerName) {
      if (!confirm(`Are you sure you want to remove staff member "${officerName}"? Their login credentials and permissions will be revoked.`)) {
        return;
      }
      window.DS_Auth.deleteOfficer(officerId);
      this.renderDirectory();
    },

    quickTestSwitch: function (officerId) {
      // Test switch removed by admin request
      return false;
    },

    // ========================================================================
    // ROUTE MAP & EXCEL BEAT ASSIGNMENT CONTROLLER
    // ========================================================================
    populateRouteSuggestions: function () {
      const dl = document.getElementById('routeSuggestionsList');
      if (!dl) return;
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { party: [] };
      const parties = db.party || [];
      const officers = window.DS_Storage ? window.DS_Storage.getOfficers() : [];
      const routes = [...new Set([
        ...parties.map(p => p.route),
        ...officers.map(o => o.route)
      ].filter(Boolean))].sort();

      dl.innerHTML = routes.map(r => `<option value="${DS_App.escapeHtml(r)}"></option>`).join('');
    },

    downloadRouteMapTemplate: function () {
      if (typeof XLSX === 'undefined') {
        DS_App.toast('Excel library not loaded', 'error');
        return;
      }

      const officers = window.DS_Storage ? window.DS_Storage.getOfficers() : [];
      const sampleRows = officers.filter(o => o.role === 'so' || o.role === 'dispatcher' || o.active).map(o => ({
        'Sales Officer ID': o.id,
        'Sales Officer Name': o.name,
        'Assigned Route / Beat': o.route || 'Civil Lines Beat',
        'Day / Schedule': 'Monday, Thursday',
        'Area / Market': 'Central Market',
        'Target (₹)': o.target || 300000
      }));

      if (!sampleRows.length) {
        sampleRows.push({
          'Sales Officer ID': 'SO-101',
          'Sales Officer Name': 'Amit Sharma',
          'Assigned Route / Beat': 'Civil Lines Beat',
          'Day / Schedule': 'Monday, Thursday',
          'Area / Market': 'Mall Road, Civil Lines',
          'Target (₹)': 300000
        });
      }

      const ws = XLSX.utils.json_to_sheet(sampleRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Route_Map_Assignment');
      XLSX.writeFile(wb, 'DS_Beat_Route_Mapping_Template.xlsx');
      DS_App.toast('✓ Downloaded DS_Beat_Route_Mapping_Template.xlsx', 'success');
    },

    handleRouteMapExcelUpload: async function (e) {
      const file = e.target.files[0];
      if (!file) return;

      if (typeof XLSX === 'undefined') {
        DS_App.toast('Excel library not ready', 'error');
        return;
      }

      try {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { type: 'array' });
        const firstSheet = wb.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[firstSheet], { defval: '' });

        if (!rows.length) {
          DS_App.toast('The uploaded Excel file has no data rows!', 'error');
          return;
        }

        const officers = window.DS_Storage ? window.DS_Storage.getOfficers() : [];
        const norm = s => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

        const parsedAssignments = [];

        rows.forEach(r => {
          let idVal = '', nameVal = '', routeVal = '', dayVal = '';

          for (const [key, val] of Object.entries(r)) {
            const k = norm(key);
            if (['salesofficerid', 'soid', 'userid', 'staffid', 'id', 'code'].includes(k)) {
              idVal = String(val).trim();
            } else if (['salesofficername', 'salesperson', 'staffname', 'officername', 'name'].includes(k)) {
              nameVal = String(val).trim();
            } else if (['assignedroutebeat', 'assignedroute', 'routebeat', 'routename', 'route', 'beat', 'beatname'].includes(k)) {
              routeVal = String(val).trim();
            } else if (['dayschedule', 'day', 'schedule', 'frequency'].includes(k)) {
              dayVal = String(val).trim();
            }
          }

          if (!routeVal && (idVal || nameVal)) {
            const rk = Object.keys(r).find(k => norm(k).includes('route') || norm(k).includes('beat'));
            if (rk) routeVal = String(r[rk]).trim();
          }

          if (!idVal && !nameVal) return;

          let matched = null;
          if (idVal) {
            matched = officers.find(o => norm(o.id) === norm(idVal) || norm(o.userId) === norm(idVal));
          }
          if (!matched && nameVal) {
            matched = officers.find(o => norm(o.name) === norm(nameVal) || o.name.toLowerCase().includes(nameVal.toLowerCase()));
          }

          parsedAssignments.push({
            staffId: matched ? matched.id : (idVal || '-'),
            staffName: matched ? matched.name : (nameVal || '-'),
            assignedRoute: routeVal || 'General Beat',
            daySchedule: dayVal || 'Daily',
            matchedOfficer: matched
          });
        });

        this._pendingRouteAssignments = parsedAssignments;

        const previewArea = document.getElementById('routeMapPreviewArea');
        const previewBody = document.getElementById('routeMapPreviewBody');
        const previewTitle = document.getElementById('routeMapPreviewTitle');

        if (previewArea && previewBody) {
          previewArea.style.display = 'block';
          if (previewTitle) previewTitle.textContent = `Parsed ${parsedAssignments.length} Route Assignments from "${file.name}":`;

          previewBody.innerHTML = parsedAssignments.map(item => `
            <tr>
              <td><strong>${item.staffId}</strong></td>
              <td>${DS_App.escapeHtml(item.staffName)}</td>
              <td><strong style="color:var(--ds-primary);">${DS_App.escapeHtml(item.assignedRoute)}</strong></td>
              <td>${DS_App.escapeHtml(item.daySchedule)}</td>
              <td>
                ${item.matchedOfficer ? `
                  <span class="badge" style="background:#dcfce7; color:#15803d; font-weight:700;">✓ Matched (${item.matchedOfficer.id})</span>
                ` : `
                  <span class="badge" style="background:#fef2f2; color:#b91c1c; font-weight:700;">⚠️ Not in Staff</span>
                `}
              </td>
            </tr>
          `).join('');
        }

        DS_App.toast(`✓ Parsed ${parsedAssignments.length} rows from Excel. Review preview and click Confirm!`, 'success');

      } catch (err) {
        DS_App.toast(`Failed to parse Excel file: ${err.message}`, 'error');
      }
    },

    applyRouteMapAssignments: function () {
      if (!this._pendingRouteAssignments || !this._pendingRouteAssignments.length) {
        DS_App.toast('No pending route assignments to apply!', 'error');
        return;
      }

      const officers = window.DS_Storage ? window.DS_Storage.getOfficers() : [];
      let updatedCount = 0;

      this._pendingRouteAssignments.forEach(item => {
        if (item.matchedOfficer && item.assignedRoute) {
          const off = officers.find(o => o.id === item.matchedOfficer.id);
          if (off) {
            off.route = item.assignedRoute;
            if (!off.assignedRoutes) off.assignedRoutes = [];
            if (!off.assignedRoutes.includes(item.assignedRoute)) {
              off.assignedRoutes.push(item.assignedRoute);
            }
            if (item.daySchedule) off.routeSchedule = item.daySchedule;
            updatedCount++;
          }
        }
      });

      if (updatedCount > 0) {
        window.DS_Storage.saveOfficers(officers);
        this.renderDirectory();
        this.renderRouteMapAssignmentTable();

        const previewArea = document.getElementById('routeMapPreviewArea');
        if (previewArea) previewArea.style.display = 'none';

        const fileInp = document.getElementById('routeMapExcelInput');
        if (fileInp) fileInp.value = '';

        this._pendingRouteAssignments = [];

        DS_App.toast(`✓ Successfully assigned Beat Routes to ${updatedCount} staff members according to Excel!`, 'success');
      } else {
        DS_App.toast('No matching staff members found in the uploaded Excel.', 'warning');
      }
    },

    renderRouteMapAssignmentTable: function () {
      const tbody = document.getElementById('routeAssignmentTableBody');
      if (!tbody) return;

      const officers = window.DS_Storage ? window.DS_Storage.getOfficers() : [];
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { party: [] };
      const parties = db.party || [];

      // Get all available routes
      const allRoutes = [...new Set([
        ...parties.map(p => p.route),
        ...officers.map(o => o.route)
      ].filter(Boolean))].sort();

      if (!officers.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:18px; color:var(--ds-text-muted);">No staff records registered.</td></tr>';
        return;
      }

      tbody.innerHTML = officers.map(o => {
        const currentRoute = o.route || 'General Route';
        const storeCount = parties.filter(p => p.route === currentRoute).length;

        return `
          <tr>
            <td><strong>${o.id}</strong></td>
            <td>
              <div style="font-weight:700; color:var(--ds-text);">${DS_App.escapeHtml(o.name)}</div>
              <div style="font-size:11px; color:var(--ds-text-muted);">${o.userId || '-'} • ${o.phone || '-'}</div>
            </td>
            <td>
              <span class="badge" style="background:#eff6ff; color:#1d4ed8; font-size:10px; font-weight:700;">
                ${o.role ? o.role.toUpperCase() : 'SO'}
              </span>
            </td>
            <td>
              <span class="badge" style="background:#ecfdf5; color:#047857; font-weight:700; font-size:12px; border:1px solid #a7f3d0;">
                📍 ${DS_App.escapeHtml(currentRoute)}
              </span>
            </td>
            <td>
              <strong>${storeCount}</strong> Kirana Stores
            </td>
            <td>
              <select id="selRoute_${o.id}" class="form-control" style="font-size:12px; padding:4px 8px; font-weight:600;">
                ${allRoutes.map(r => `
                  <option value="${DS_App.escapeHtml(r)}" ${r === currentRoute ? 'selected' : ''}>${DS_App.escapeHtml(r)}</option>
                `).join('')}
              </select>
            </td>
            <td style="text-align:center;">
              <button type="button" class="btn btn-primary btn-sm" onclick="DS_SalesOfficers.quickAssignRoute('${o.id}', document.getElementById('selRoute_${o.id}').value)" style="font-size:11px; padding:4px 10px; font-weight:700;">
                ✓ Save Beat
              </button>
            </td>
          </tr>
        `;
      }).join('');
    },

    quickAssignRoute: function (officerId, newRoute) {
      if (!newRoute) return;
      const officers = window.DS_Storage ? window.DS_Storage.getOfficers() : [];
      const officer = officers.find(o => o.id === officerId);
      if (officer) {
        officer.route = newRoute;
        if (!officer.assignedRoutes) officer.assignedRoutes = [];
        if (!officer.assignedRoutes.includes(newRoute)) officer.assignedRoutes.push(newRoute);
        window.DS_Storage.saveOfficers(officers);
        this.renderDirectory();
        this.renderRouteMapAssignmentTable();
        DS_App.toast(`✓ Beat route "${newRoute}" assigned to ${officer.name}`, 'success');
      }
    }
  };

  window.DS_SalesOfficers = DS_SalesOfficers;
  window.DS_Officers = DS_SalesOfficers;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DS_SalesOfficers.init());
  } else {
    DS_SalesOfficers.init();
  }

})(window);
