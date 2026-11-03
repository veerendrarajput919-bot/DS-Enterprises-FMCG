/**
 * ==========================================================================
 * DS ENTERPRISES — CORE APP ENGINE, COMPONENT LOADER & UI CONTROLLER
 * File: assets/js/app.js
 * Architecture: Component Injection, App Bootstrap, Navigation, Toast & Modal
 * ==========================================================================
 *
 * COMPONENT ARCHITECTURE:
 * Pages contain <div data-component="header|sidebar|footer|modal|notification">
 * DS_Components.loadAll() fetches HTML from /components/ and injects them.
 * DS_App.init() is called AFTER all components are injected.
 * ==========================================================================
 */

(function (window) {
  'use strict';

  // ============================================================
  // COMPONENT LOADER
  // ============================================================
  const DS_Components = {
    /**
     * Base path of components folder relative to current page.
     * Pages in /pages/ need ../components/; index.html needs ./components/
     */
    _basePath: function () {
      const path = window.location.pathname;
      if (path.includes('/pages/')) return '../components/';
      return './components/';
    },

    _fallbacks: {
      header: `
<header class="ds-header">
  <div class="ds-header-inner">
    <div class="ds-header-left">
      <button type="button" class="ds-mobile-toggle ds-sidebar-toggle" id="dsSidebarToggleBtn" aria-label="Toggle Navigation" onclick="if(window.DS_App) DS_App.toggleSidebar(event);">☰</button>
      <a href="dashboard.html" class="ds-brand" title="DS Enterprises Home">
        <span class="ds-brand-logo-text">DS</span>
        <span class="ds-brand-title">DS Enterprises</span>
      </a>
    </div>
    <div class="ds-header-center">
      <span id="dsHeaderRoleBadge" class="ds-role-badge admin">Admin</span>
    </div>
    <div class="ds-header-right">
      <div class="ds-header-profile-wrap">
        <button type="button" id="dsHeaderProfileBtn" class="ds-header-profile-btn" onclick="DS_App.toggleProfileDropdown(event)" aria-expanded="false" title="Account Menu">
          <span class="ds-header-avatar" id="dsHeaderAvatar">A</span>
          <span class="ds-header-username hide-mobile" id="dsHeaderUserNameText">Admin</span>
          <span class="ds-header-chevron hide-mobile">▾</span>
        </button>
        <div id="dsHeaderProfileMenu" class="ds-profile-dropdown" role="menu">
          <div class="ds-dropdown-header">
            <div class="ds-dropdown-name" id="dsDropdownFullName">Administrator</div>
            <div class="ds-dropdown-role" id="dsDropdownRoleName">Super Admin</div>
          </div>
          <div class="ds-dropdown-divider"></div>
          <a href="sales-officers.html?action=register" class="ds-dropdown-item" data-permission="canManageStaff">
            <span>Staff & Users</span>
          </a>
          <a href="clear-old-data.html" class="ds-dropdown-item" data-permission="canResetData">
            <span>Settings</span>
          </a>
          <button type="button" class="ds-dropdown-item" onclick="if(window.DS_Dashboard && DS_Dashboard.openCustomizeModal) DS_Dashboard.openCustomizeModal();">
            <span>Show / Hide Tiles</span>
          </button>
          <div class="ds-dropdown-divider"></div>
          <button type="button" class="ds-dropdown-item text-danger" onclick="DS_Auth.logout('manual')">
            <span>Sign Out</span>
          </button>
        </div>
      </div>
      <button type="button" class="btn btn-outline-danger btn-xs ds-quick-logout-btn" onclick="DS_Auth.logout('manual')" title="Sign out of system">
        <span class="hide-mobile">Logout</span>
      </button>
    </div>
  </div>
</header>`,
      sidebar: `
<aside class="ds-sidebar">
  <div class="ds-sidebar-top-bar">
    <div style="display:flex; align-items:center; gap:8px;">
      <span class="ds-brand-logo-text" style="font-size:12px; padding:3px 6px;">DS</span>
      <span style="font-weight:800; font-size:13px; color:var(--ds-primary-dark);">DS Enterprises</span>
    </div>
    <button type="button" class="ds-sidebar-close-btn" onclick="DS_App.closeMobileSidebar()" aria-label="Close navigation">✕</button>
  </div>
  <div id="dsSidebarRoleIndicator" class="ds-sidebar-role-badge">
    <div style="display:flex; align-items:center; gap:6px;">
      <span id="dsSidebarRoleIcon" style="font-size:11px; font-weight:800; color:var(--ds-primary);">●</span>
      <div style="min-width:0;">
        <div id="dsSidebarRoleTitle" style="font-weight:800; font-size:11px; line-height:1.2; color:var(--ds-text);">Admin Panel</div>
        <div id="dsSidebarRoleUser" style="font-size:9.5px; color:var(--ds-text-muted); line-height:1.1;">Administrator</div>
      </div>
    </div>
  </div>
  <div class="ds-sidebar-nav-scroll">
    <div class="ds-nav-group" data-group-id="sales-analytics">
      <button type="button" class="ds-nav-heading" onclick="DS_App.toggleSidebarGroup('sales-analytics')">
        <span class="ds-heading-text">Sales & Analytics</span>
        <span class="ds-heading-chevron">▾</span>
      </button>
      <div class="ds-nav-group-links" id="group-sales-analytics">
        <a href="dashboard.html" class="ds-nav-link" data-page="dashboard.html"><span class="ds-nav-icon">📊</span><span>Overview & Trends</span></a>
        <a href="sales-analysis.html" class="ds-nav-link" data-page="sales-analysis.html" data-permission="canViewAnalytics"><span class="ds-nav-icon">📈</span><span>Sales Analysis</span></a>
        <a href="party-wise.html" class="ds-nav-link" data-page="party-wise.html" data-permission="canViewAnalytics"><span class="ds-nav-icon">🏪</span><span>Party Wise Sale</span></a>
        <a href="route-analysis.html" class="ds-nav-link" data-page="route-analysis.html" data-permission="canViewAnalytics"><span class="ds-nav-icon">📍</span><span>Route & Beat</span></a>
        <a href="item-brand-wise-sale.html" class="ds-nav-link" data-page="item-brand-wise-sale.html" data-permission="canViewAnalytics"><span class="ds-nav-icon">📑</span><span>Item & Brand Matrix</span></a>
      </div>
    </div>
    <div class="ds-nav-group" data-group-id="receivables-collections">
      <button type="button" class="ds-nav-heading" onclick="DS_App.toggleSidebarGroup('receivables-collections')">
        <span class="ds-heading-text">Receivables & Collections</span>
        <span class="ds-heading-chevron">▾</span>
      </button>
      <div class="ds-nav-group-links" id="group-receivables-collections">
        <a href="bill-management.html" class="ds-nav-link" data-page="bill-management.html" data-permission="canViewOutstanding"><span class="ds-nav-icon">🧾</span><span>Bill Management</span></a>
        <a href="outstanding.html" class="ds-nav-link" data-page="outstanding.html" data-permission="canViewOutstanding"><span class="ds-nav-icon">⏳</span><span>Outstanding & Receivables</span></a>
        <a href="payment-collections.html" class="ds-nav-link" data-page="payment-collections.html" data-permission="canCollectPayments"><span class="ds-nav-icon">💵</span><span>Payment Collections</span></a>
      </div>
    </div>
    <div class="ds-nav-group" data-group-id="inventory-field-sales">
      <button type="button" class="ds-nav-heading" onclick="DS_App.toggleSidebarGroup('inventory-field-sales')">
        <span class="ds-heading-text">Inventory & Field Sales</span>
        <span class="ds-heading-chevron">▾</span>
      </button>
      <div class="ds-nav-group-links" id="group-inventory-field-sales">
        <a href="stock.html" class="ds-nav-link" data-page="stock.html" data-permission="canManageProducts"><span class="ds-nav-icon">📦</span><span>IMS Stock & Products</span></a>
        <a href="order-punching.html" class="ds-nav-link" data-page="order-punching.html" data-permission="canPunchOrders"><span class="ds-nav-icon">🛒</span><span>Order Punching</span></a>
        <a href="order-report.html" class="ds-nav-link" data-page="order-report.html" data-permission="canPunchOrders"><span class="ds-nav-icon">📋</span><span>Order Reports</span></a>
        <a href="sales-officers.html" class="ds-nav-link" data-page="sales-officers.html" data-permission="canManageStaff"><span class="ds-nav-icon">👥</span><span>Staff, Roles & Permissions</span></a>
      </div>
    </div>
    <div class="ds-nav-group" data-group-id="fulfillment-logistics">
      <button type="button" class="ds-nav-heading" onclick="DS_App.toggleSidebarGroup('fulfillment-logistics')">
        <span class="ds-heading-text">Fulfillment & Logistics</span>
        <span class="ds-heading-chevron">▾</span>
      </button>
      <div class="ds-nav-group-links" id="group-fulfillment-logistics">
        <a href="order-approval.html" class="ds-nav-link" data-page="order-approval.html" data-permission="canApproveOrders"><span class="ds-nav-icon">⚡</span><span>Order Approval</span></a>
        <a href="route-assignment.html" class="ds-nav-link" data-page="route-assignment.html" data-permission="canManageDispatch"><span class="ds-nav-icon">🗺️</span><span>Route & Delivery Assignment</span></a>
        <a href="dispatch.html" class="ds-nav-link" data-page="dispatch.html" data-permission="canManageDispatch"><span class="ds-nav-icon">🚚</span><span>Dispatch & Loading Sheets</span></a>
      </div>
    </div>
    <div class="ds-nav-group" data-group-id="data-settings">
      <button type="button" class="ds-nav-heading" onclick="DS_App.toggleSidebarGroup('data-settings')">
        <span class="ds-heading-text">Data & Settings</span>
        <span class="ds-heading-chevron">▾</span>
      </button>
      <div class="ds-nav-group-links" id="group-data-settings">
        <a href="upload-update.html" class="ds-nav-link" data-page="upload-update.html" data-permission="canImportData"><span class="ds-nav-icon">📥</span><span>Excel Data Ingest</span></a>
        <a href="clear-old-data.html" class="ds-nav-link" data-page="clear-old-data.html" data-permission="canResetData"><span class="ds-nav-icon">⚙️</span><span>Settings</span></a>
        <a href="sales-officers.html?action=register" class="ds-nav-link" data-page="sales-officers.html" data-permission="canManageStaff"><span class="ds-nav-icon">👤</span><span>User Management</span></a>
      </div>
    </div>
  </div>
</aside>
<div class="ds-sidebar-backdrop"></div>`,
      footer: `
<footer class="ds-footer">
  <div class="ds-footer-inner">
    <div><strong>DS Enterprises</strong> — FMCG Management & Field Sales System</div>
    <div><span>Offline-First Enterprise ERP</span></div>
  </div>
</footer>
<nav class="ds-bottom-nav" aria-label="Mobile Navigation Dock">
  <a href="dashboard.html" class="ds-bottom-nav-item" data-page="dashboard.html"><span class="ds-bottom-nav-icon">🏠</span><span class="ds-bottom-nav-label">Home</span></a>
  <a href="order-punching.html" class="ds-bottom-nav-item" data-page="order-punching.html"><span class="ds-bottom-nav-icon">🛒</span><span class="ds-bottom-nav-label">Punch</span></a>
  <a href="outstanding.html" class="ds-bottom-nav-item" data-page="outstanding.html"><span class="ds-bottom-nav-icon">⏳</span><span class="ds-bottom-nav-label">Due</span></a>
  <a href="dispatch.html" class="ds-bottom-nav-item" data-page="dispatch.html"><span class="ds-bottom-nav-icon">🚚</span><span class="ds-bottom-nav-label">Dispatch</span></a>
  <button type="button" class="ds-bottom-nav-item" onclick="if(window.DS_App) DS_App.toggleMobileSidebar();" aria-label="Open Mobile Menu"><span class="ds-bottom-nav-icon">☰</span><span class="ds-bottom-nav-label">Menu</span></button>
</nav>`,
      modal: `
<div id="dsAdminConfirmModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirmModalTitle">
  <div class="modal-card" style="width:min(420px, 95%);">
    <div class="modal-header">
      <h3 class="modal-title" id="confirmModalTitle">🔐 Admin Password Verification</h3>
      <button type="button" class="modal-close" aria-label="Close modal" onclick="DS_App.closeModal('dsAdminConfirmModal')">×</button>
    </div>
    <div class="modal-body" style="text-align:center;">
      <p style="font-size:13px; color:var(--ds-text-muted); margin-bottom:12px;">Enter Admin Master Password (Admin@919) to authorize administrative access:</p>
      <input type="password" id="dsAdminConfirmPassword" class="form-control" placeholder="Admin Master Password" maxlength="32"
        onkeydown="if (event.key === 'Enter' && window.onAdminConfirmSubmit) { event.preventDefault(); window.onAdminConfirmSubmit(); }"
        style="width:100%; font-size:16px; text-align:center; margin-bottom:16px; padding:10px 14px; font-weight:700;" />
      <div style="display:flex; justify-content:space-between; gap:8px;">
        <button type="button" class="btn btn-secondary" onclick="DS_App.closeModal('dsAdminConfirmModal')">Cancel</button>
        <button type="button" class="btn btn-primary" onclick="if (window.onAdminConfirmSubmit) window.onAdminConfirmSubmit();">Unlock Admin Panel</button>
      </div>
    </div>
  </div>
</div>
<div id="dsTextCopyModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="textCopyModalTitle">
  <div class="modal-card" style="width:min(520px, 95%);">
    <div class="modal-header">
      <h3 class="modal-title" id="textCopyModalTitle" style="display:flex; align-items:center; gap:8px;">
        <span>📋</span> <span>Formatted Message</span>
      </h3>
      <button type="button" class="modal-close" aria-label="Close dialog" onclick="DS_App.closeModal('dsTextCopyModal')">×</button>
    </div>
    <div class="modal-body">
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; color:#166534; padding:10px 12px; border-radius:8px; font-size:12px; font-weight:600; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
        <span style="font-size:16px;">✓</span> <span>Text copied to clipboard! Paste directly into WhatsApp message (Ctrl+V).</span>
      </div>
      <textarea id="dsCopyModalTextarea" readonly class="form-control"
        style="width:100%; height:230px; font-family:'Courier New', monospace; font-size:12px; line-height:1.45; white-space:pre-wrap; background:#f8fafc; resize:vertical; padding:10px; border:1px solid #cbd5e1;"></textarea>
      <div style="display:flex; gap:10px; margin-top:14px; flex-wrap:wrap;">
        <button type="button" class="btn btn-primary btn-lg" style="flex:1; min-width:180px;" onclick="DS_WhatsApp.copyFromModalTextarea()">
          📋 Copy Text Again
        </button>
        <button type="button" class="btn btn-secondary" onclick="DS_App.closeModal('dsTextCopyModal')">
          Done
        </button>
      </div>
    </div>
  </div>
</div>
<div id="dsSessionTimeoutModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="timeoutModalTitle" style="z-index: 10001;">
  <div class="modal-card" style="width:min(440px, 94%); border-top: 4px solid var(--ds-warning, #f59e0b); box-shadow: 0 25px 60px rgba(0,0,0,0.45);">
    <div class="modal-header" style="background: rgba(245, 158, 11, 0.08);">
      <h3 class="modal-title" id="timeoutModalTitle" style="color:#b45309; display:flex; align-items:center; gap:8px;">
        <span style="font-size:20px;">⏱️</span>
        <span>Session Expiring Soon</span>
      </h3>
      <button type="button" class="modal-close" aria-label="Close dialog" onclick="DS_Auth.keepSessionAlive()">×</button>
    </div>
    <div class="modal-body" style="text-align:center; padding: 22px 20px 16px;">
      <p style="font-size:14px; color:var(--ds-text, #334155); margin:0 0 14px; line-height:1.5;">
        You have been inactive for a while. For data security, your session will automatically log out in:
      </p>
      <div style="display:inline-flex; align-items:baseline; justify-content:center; gap:4px; background:#fef3c7; border:1px solid #fde68a; border-radius:12px; padding:10px 24px; margin-bottom:14px;">
        <span id="dsSessionTimeoutSecs" style="font-size:38px; font-weight:900; color:#b45309; font-variant-numeric:tabular-nums; line-height:1;">60</span>
        <span style="font-size:14px; font-weight:700; color:#b45309;">seconds</span>
      </div>
      <div style="width:100%; height:6px; background:#e2e8f0; border-radius:999px; overflow:hidden; margin-bottom:18px;">
        <div id="dsSessionTimeoutBar" style="height:100%; width:100%; background:linear-gradient(90deg, #f59e0b, #ef4444); transition:width 1s linear;"></div>
      </div>
      <p style="font-size:12px; color:var(--ds-text-muted, #64748b); margin:0 0 18px;">
        Click <strong>Stay Signed In</strong> to continue working without interruption.
      </p>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button type="button" class="btn btn-primary" style="flex:1; min-width:140px; padding:12px; font-weight:800; font-size:14px;" onclick="DS_Auth.keepSessionAlive()">
          ✓ Stay Signed In
        </button>
        <button type="button" class="btn btn-secondary" style="padding:12px 16px; font-weight:700; font-size:13px; color:#b91c1c; border-color:#fecaca;" onclick="DS_Auth.logout('manual')">
          🚪 Log Out Now
        </button>
      </div>
    </div>
  </div>
</div>`,
      notification: `<div class="ds-toast-container" id="dsGlobalToastContainer" aria-live="polite" aria-atomic="true"></div>`
    },

    /**
     * Fetch one component HTML file and inject into matching placeholder div
     * @param {string} name - component name (header|sidebar|footer|modal|notification)
     */
    load: function (name) {
      const placeholder = document.querySelector('[data-component="' + name + '"]');
      if (!placeholder) return Promise.resolve();

      const isRoot = !window.location.pathname.includes('/pages/');
      const url = this._basePath() + name + '.html';
      const self = this;

      function injectHtml(html) {
        if (isRoot) {
          html = html.replace(/\.\.\/assets\//g, './assets/');
          html = html.replace(/\.\.\/index\.html/g, 'index.html');
          html = html.replace(/href="([a-zA-Z0-9_\-]+\.html)"/g, function (match, p1) {
            if (p1 === 'index.html') return 'href="index.html"';
            return 'href="pages/' + p1 + '"';
          });
        }
        placeholder.outerHTML = html;
      }

      return fetch(url)
        .then(function (res) {
          if (!res.ok) throw new Error('Component fetch failed: ' + url);
          return res.text();
        })
        .then(function (html) {
          injectHtml(html);
        })
        .catch(function (err) {
          console.warn('[DS_Components] Fetch failed, using fallback for:', name, err.message);
          if (self._fallbacks && self._fallbacks[name]) {
            injectHtml(self._fallbacks[name]);
          } else {
            placeholder.remove();
          }
        });
    },

    /**
     * Load all components in dependency order, then boot DS_App.
     * header, sidebar, footer, modal, notification
     */
    loadAll: function () {
      const self = this;
      return Promise.all([
        self.load('header'),
        self.load('sidebar'),
        self.load('footer'),
        self.load('modal'),
        self.load('notification')
      ]).then(function () {
        // All components injected — now safe to boot the app
        if (window.DS_App) DS_App.init();
        window.dispatchEvent(new CustomEvent('ds:components:loaded'));
      });
    }
  };

  window.DS_Components = DS_Components;

  const DS_App = {
    init: function () {
      // Ensure storage is seeded & loaded
      if (window.DS_Storage) DS_Storage.init();

      // Setup UI listeners
      this.initNavigation();
      this.initSidebarGroups();
      this.initMobileSidebar();
      this.updateNavigationPermissions();
      if (window.DS_Auth) DS_Auth.updateHeaderUI();

      // Outside click listener for account profile dropdown
      document.addEventListener('click', (e) => {
        const menu = document.getElementById('dsHeaderProfileMenu');
        const btn = document.getElementById('dsHeaderProfileBtn');
        if (menu && menu.classList.contains('show')) {
          if (!menu.contains(e.target) && !btn?.contains(e.target)) {
            this.closeProfileDropdown();
          }
        }
      });

      // Restore desktop sidebar collapsed state
      if (window.innerWidth > 768) {
        try {
          if (localStorage.getItem('ds_sidebar_collapsed') === 'true') {
            document.querySelector('.ds-sidebar')?.classList.add('collapsed');
          }
        } catch (e) {}
      }

      // Check for permission denied flash notice
      const deniedNotice = sessionStorage.getItem('ds_permission_denied_notice');
      if (deniedNotice) {
        sessionStorage.removeItem('ds_permission_denied_notice');
        setTimeout(() => {
          this.toast(deniedNotice, 'warning', 4500);
        }, 300);
      }

      // Listen for role changed events
      window.addEventListener('ds:role:changed', () => {
        this.updateNavigationPermissions();
        if (window.DS_Auth) DS_Auth.updateHeaderUI();
      });

      // Listen for storage events (multi-tab sync)
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('ds_')) {
          this.updateNavigationPermissions();
          if (window.DS_Auth) DS_Auth.updateHeaderUI();
        }
      });
    },

    // Dynamic Navigation Visibility & RBAC Link Filtering across all panels & shortcuts
    updateNavigationPermissions: function () {
      if (!window.DS_Auth) return;
      const elements = document.querySelectorAll('.ds-nav-link, .quick-action-btn, .ds-bottom-nav-item, [data-permission], [data-role]');
      if (!elements.length) return;

      const pagePerms = {
        'outstanding.html': 'canViewOutstanding',
        'outstanding-party-wise.html': 'canViewOutstanding',
        'outstanding-brand-wise.html': 'canViewOutstanding',
        'dispatch.html': 'canManageDispatch',
        'dispatch-challan.html': 'canManageDispatch',
        'loading-sheet.html': 'canManageDispatch',
        'order-approval.html': 'canApproveOrders',
        'order-punching.html': 'canPunchOrders',
        'order-report.html': 'canPunchOrders',
        'payment-collections.html': 'canCollectPayments',
        'sales-analysis.html': 'canViewAnalytics',
        'party-wise.html': 'canViewAnalytics',
        'route-analysis.html': 'canViewAnalytics',
        'item-brand-wise-sale.html': 'canViewAnalytics',
        'sales-officers.html': 'canManageStaff',
        'upload-update.html': 'canImportData',
        'clear-old-data.html': 'canResetData',
        'stock.html': 'canManageProducts',
        'bill-management.html': 'canViewOutstanding',
        'route-assignment.html': 'canManageDispatch'
      };

      elements.forEach(el => {
        const requiredRole = el.getAttribute('data-role');
        let requiredPerm = el.getAttribute('data-permission');

        // Automatic fallback: resolve permission from href if not explicitly specified
        if (!requiredPerm && el.tagName === 'A') {
          const href = (el.getAttribute('href') || '').split('?')[0].split('#')[0];
          const fileName = href.substring(href.lastIndexOf('/') + 1);
          if (pagePerms[fileName]) {
            requiredPerm = pagePerms[fileName];
          }
        }

        let hasAccess = true;

        if (requiredRole === 'admin' && !window.DS_Auth.isAdmin()) {
          hasAccess = false;
        }
        if (requiredPerm && !window.DS_Auth.hasPermission(requiredPerm)) {
          hasAccess = false;
        }

        if (!hasAccess) {
          el.classList.add('ds-nav-restricted');
          el.style.display = 'none';
        } else {
          el.classList.remove('ds-nav-restricted');
          el.style.display = '';
        }
      });

      // Hide parent nav-groups if all links within them are restricted
      document.querySelectorAll('.ds-nav-group').forEach(group => {
        const totalLinks = group.querySelectorAll('.ds-nav-link');
        if (!totalLinks.length) return;
        const visibleLinks = Array.from(totalLinks).filter(l => l.style.display !== 'none');
        group.style.display = visibleLinks.length === 0 ? 'none' : '';
      });
    },

    // Formatters
    money: function (v) {
      return '₹ ' + (Number(v) || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    },

    qty: function (v) {
      return (Number(v) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    },

    escapeHtml: function (s) {
      return String(s ?? '').replace(/[&<>"']/g, m => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
      }[m]));
    },

    formatDate: function (dateStr) {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      if (isNaN(d)) return String(dateStr);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    },

    // User Profile Dropdown Controller
    toggleProfileDropdown: function (event) {
      if (event && event.stopPropagation) event.stopPropagation();
      const menu = document.getElementById('dsHeaderProfileMenu');
      const btn = document.getElementById('dsHeaderProfileBtn');
      if (!menu) return;
      const isOpen = menu.classList.toggle('show');
      if (btn) btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    },

    closeProfileDropdown: function () {
      const menu = document.getElementById('dsHeaderProfileMenu');
      const btn = document.getElementById('dsHeaderProfileBtn');
      if (menu) menu.classList.remove('show');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    },

    // Collapsible Sidebar Accordion Groups
    toggleSidebarGroup: function (groupId) {
      const groupEl = document.querySelector(`.ds-nav-group[data-group-id="${groupId}"]`);
      if (!groupEl) return;
      groupEl.classList.toggle('collapsed');
      this.saveSidebarGroupsState();
    },

    saveSidebarGroupsState: function () {
      try {
        const groups = document.querySelectorAll('.ds-nav-group[data-group-id]');
        const state = {};
        groups.forEach(g => {
          const id = g.getAttribute('data-group-id');
          if (id) state[id] = g.classList.contains('collapsed');
        });
        localStorage.setItem('ds_sidebar_groups_state', JSON.stringify(state));
      } catch (e) {}
    },

    initSidebarGroups: function () {
      try {
        const raw = localStorage.getItem('ds_sidebar_groups_state');
        const state = raw ? JSON.parse(raw) : {};
        document.querySelectorAll('.ds-nav-group[data-group-id]').forEach(g => {
          const id = g.getAttribute('data-group-id');
          if (id && state[id] === true) {
            g.classList.add('collapsed');
          } else {
            g.classList.remove('collapsed');
          }
        });
      } catch (e) {}

      // Keep active page group open
      const activeLink = document.querySelector('.ds-nav-link.active');
      if (activeLink) {
        const parentGroup = activeLink.closest('.ds-nav-group');
        if (parentGroup) {
          parentGroup.classList.remove('collapsed');
        }
      }
    },

    // Navigation & Active Link Highlight
    initNavigation: function () {
      const currentPath = window.location.pathname.replace(/\/$/, '');
      let fileName = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'index.html';
      // Map legacy redirects to unified hubs for active link display
      if (fileName === 'outstanding-party-wise.html' || fileName === 'outstanding-brand-wise.html') fileName = 'outstanding.html';
      if (fileName === 'dispatch-challan.html' || fileName === 'loading-sheet.html') fileName = 'dispatch.html';

      const links = document.querySelectorAll('.ds-nav-link');
      links.forEach(link => {
        const href = (link.getAttribute('href') || '').split('?')[0].split('#')[0];
        const linkFile = href.substring(href.lastIndexOf('/') + 1);
        if (linkFile && (linkFile === fileName || (fileName === '' && linkFile === 'index.html'))) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });

      this.initSidebarGroups();
    },

    // Responsive Sidebar Navigation (Mobile Drawer + Desktop Collapse)
    initMobileSidebar: function () {
      const toggle = document.querySelector('.ds-sidebar-toggle, .ds-mobile-toggle');
      const sidebar = document.querySelector('.ds-sidebar');
      let backdrop = document.querySelector('.ds-sidebar-backdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'ds-sidebar-backdrop';
        document.body.appendChild(backdrop);
      }

      if (toggle && sidebar) {
        toggle.onclick = (e) => {
          if (e && e.stopPropagation) e.stopPropagation();
          this.toggleSidebar(e);
        };
      }
      if (backdrop && sidebar) {
        backdrop.onclick = (e) => {
          if (e && e.stopPropagation) e.stopPropagation();
          this.closeMobileSidebar();
        };
      }
      if (sidebar) {
        sidebar.querySelectorAll('.ds-nav-link').forEach(link => {
          link.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
              this.closeMobileSidebar();
            }
          });
        });
      }
    },

    toggleSidebar: function (event) {
      if (event && event.stopPropagation) event.stopPropagation();
      const sidebar = document.querySelector('.ds-sidebar');
      if (!sidebar) return;
      if (window.innerWidth <= 768) {
        this.toggleMobileSidebar();
      } else {
        sidebar.classList.toggle('collapsed');
        const isCollapsed = sidebar.classList.contains('collapsed');
        try {
          localStorage.setItem('ds_sidebar_collapsed', isCollapsed ? 'true' : 'false');
        } catch (e) {}
      }
    },

    openMobileSidebar: function () {
      const sidebar = document.querySelector('.ds-sidebar');
      let backdrop = document.querySelector('.ds-sidebar-backdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'ds-sidebar-backdrop';
        document.body.appendChild(backdrop);
      }
      backdrop.onclick = () => this.closeMobileSidebar();
      if (sidebar) sidebar.classList.add('open');
      if (backdrop) backdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    },

    closeMobileSidebar: function () {
      document.querySelector('.ds-sidebar')?.classList.remove('open');
      document.querySelector('.ds-sidebar-backdrop')?.classList.remove('active');
      document.body.style.overflow = '';
    },

    toggleMobileSidebar: function () {
      const sidebar = document.querySelector('.ds-sidebar');
      if (sidebar && sidebar.classList.contains('open')) {
        this.closeMobileSidebar();
      } else {
        this.openMobileSidebar();
      }
    },

    // Toast Notifications
    toast: function (message, type = 'info', duration = 3200) {
      let container = document.querySelector('.ds-toast-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'ds-toast-container';
        document.body.appendChild(container);
      }

      const toastEl = document.createElement('div');
      toastEl.className = `ds-toast ${type}`;
      
      const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
      };

      toastEl.innerHTML = `
        <span style="font-weight:900; font-size:15px;">${icons[type] || 'ℹ'}</span>
        <span>${this.escapeHtml(message)}</span>
      `;
      container.appendChild(toastEl);

      setTimeout(() => {
        toastEl.style.opacity = '0';
        toastEl.style.transform = 'translateY(10px)';
        toastEl.style.transition = 'all 0.25s ease';
        setTimeout(() => toastEl.remove(), 250);
      }, duration);
    },

    // Modal Controller
    openModal: function (modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    },

    closeModal: function (modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
      }
    }
  };

  window.DS_App = DS_App;

  // Auto-boot: if page uses data-component placeholders → use component loader
  // Otherwise fall back to direct init (for pages that still have inline HTML).
  function bootApp() {
    const hasComponentPlaceholders = document.querySelector('[data-component]');
    if (hasComponentPlaceholders && typeof fetch !== 'undefined') {
      // Component-based pages: load components first, then init
      DS_Components.loadAll();
    } else {
      // Legacy / inline pages: init directly
      DS_App.init();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootApp);
  } else {
    bootApp();
  }

})(window);
