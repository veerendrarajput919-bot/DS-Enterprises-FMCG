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
    <div style="display:flex; align-items:center; gap:8px; min-width:0;">
      <button type="button" class="ds-sidebar-toggle ds-mobile-toggle" id="dsSidebarToggleBtn" aria-label="Toggle Sidebar Navigation" onclick="if(window.DS_App) DS_App.toggleSidebar(event);">☰</button>
      <a href="dashboard.html" class="ds-brand" style="text-decoration:none; display:flex; align-items:center; gap:8px; min-width:0;">
        <img src="../assets/images/logo.png" alt="DS Enterprises Logo" 
             style="width:34px; height:34px; border-radius:8px; object-fit:contain; background:#ffffff; padding:2px; box-shadow:0 2px 6px rgba(0,0,0,0.25); flex-shrink:0;" />
        <div style="min-width:0;">
          <h1 class="ds-brand-title" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">DS Enterprises</h1>
          <p class="ds-brand-subtitle hide-mobile">FMCG Distribution & Sales System</p>
        </div>
      </a>
    </div>
    <div class="ds-header-center">
      <span id="dsHeaderRoleBadge" class="ds-role-badge admin">👑 Admin Mode</span>
      <div id="dsHeaderUserName" class="ds-header-user hide-mobile">Logged in as: <strong>Administrator</strong></div>
    </div>
    <div class="ds-header-actions">
      <button type="button" id="dsHeaderLogoutBtn" class="btn btn-danger btn-sm" onclick="DS_Auth.logout('manual')" title="Logout of session">🚪 Logout</button>
    </div>
  </div>
</header>`,
      sidebar: `
<aside class="ds-sidebar">
  <div class="ds-sidebar-top-bar show-mobile-flex" style="display:none; justify-content:space-between; align-items:center; padding:12px 14px; border-bottom:1px solid var(--ds-border); background:var(--ds-surface-subtle);">
    <div style="display:flex; align-items:center; gap:8px;">
      <img src="../assets/images/logo.png" alt="Logo" style="width:26px; height:26px; border-radius:6px; object-fit:contain;" />
      <span style="font-weight:800; font-size:14px; color:var(--ds-primary-dark);">DS Enterprises</span>
    </div>
    <button type="button" class="btn btn-sm btn-secondary" onclick="DS_App.closeMobileSidebar()" aria-label="Close navigation" style="padding:4px 8px; font-size:16px; font-weight:800; border-radius:6px; min-height:auto;">✕</button>
  </div>
  <div id="dsSidebarRoleIndicator" class="ds-sidebar-role-badge">
    <div style="display:flex; align-items:center; gap:8px;">
      <span id="dsSidebarRoleIcon" style="font-size:16px;">👑</span>
      <div>
        <div id="dsSidebarRoleTitle" style="font-weight:800; font-size:12px; line-height:1.2;">Admin Panel</div>
        <div id="dsSidebarRoleUser" style="font-size:10px; color:var(--ds-text-muted); line-height:1.1;">Administrator</div>
      </div>
    </div>
  </div>
  <div class="ds-nav-group">
    <div class="ds-nav-heading">Overview</div>
    <a href="dashboard.html" class="ds-nav-link" data-page="dashboard.html"><span class="ds-nav-icon">📊</span><span>Dashboard</span></a>
  </div>
  <div class="ds-nav-group">
    <div class="ds-nav-heading">Sales & Analytics</div>
    <a href="sales-analysis.html" class="ds-nav-link" data-page="sales-analysis.html" data-permission="canViewAnalytics"><span class="ds-nav-icon">📈</span><span>Sales Analysis</span></a>
    <a href="party-wise.html" class="ds-nav-link" data-page="party-wise.html" data-permission="canViewAnalytics"><span class="ds-nav-icon">🏪</span><span>Party-Wise Sale</span></a>
    <a href="route-analysis.html" class="ds-nav-link" data-page="route-analysis.html" data-permission="canViewAnalytics"><span class="ds-nav-icon">📍</span><span>Route & Beat</span></a>
    <a href="item-brand-wise-sale.html" class="ds-nav-link" data-page="item-brand-wise-sale.html" data-permission="canViewAnalytics"><span class="ds-nav-icon">📑</span><span>Item & Brand Matrix</span></a>
  </div>
  <div class="ds-nav-group">
    <div class="ds-nav-heading">Receivables & Collections</div>
    <a href="outstanding.html" class="ds-nav-link" data-page="outstanding.html" data-permission="canViewOutstanding"><span class="ds-nav-icon">⏳</span><span>Outstanding & Receivables</span><span class="badge" style="font-size:9px; margin-left:auto; background:#dcfce7; color:#166534; padding:1px 5px;">Unified</span></a>
    <a href="payment-collections.html" class="ds-nav-link" data-page="payment-collections.html" data-permission="canCollectPayments"><span class="ds-nav-icon">💵</span><span>Payment Collections</span></a>
  </div>
  <div class="ds-nav-group">
    <div class="ds-nav-heading">Inventory & Field Sales</div>
    <a href="stock.html" class="ds-nav-link" data-page="stock.html" data-permission="canManageProducts"><span class="ds-nav-icon">📦</span><span>IMS Stock & Products</span></a>
    <a href="order-punching.html" class="ds-nav-link" data-page="order-punching.html" data-permission="canPunchOrders"><span class="ds-nav-icon">🛒</span><span>Order Punching</span></a>
    <a href="order-report.html" class="ds-nav-link" data-page="order-report.html" data-permission="canPunchOrders"><span class="ds-nav-icon">📋</span><span>Order Reports</span></a>
    <a href="sales-officers.html" class="ds-nav-link" data-page="sales-officers.html" data-permission="canManageStaff"><span class="ds-nav-icon">👥</span><span>Staff, Roles & Permissions</span><span class="badge" style="font-size:9px; margin-left:auto; background:#fef3c7; color:#b45309; padding:1px 5px;">Admin</span></a>
  </div>
  <div class="ds-nav-group">
    <div class="ds-nav-heading">Fulfillment & Logistics</div>
    <a href="order-approval.html" class="ds-nav-link" data-page="order-approval.html" data-permission="canApproveOrders"><span class="ds-nav-icon">⚡</span><span>Order Approval</span></a>
    <a href="route-assignment.html" class="ds-nav-link" data-page="route-assignment.html" data-permission="canManageDispatch"><span class="ds-nav-icon">🗺️</span><span>Route & Delivery Assignment</span><span class="badge" style="font-size:9px; margin-left:auto; background:#dbeafe; color:#1e40af; padding:1px 5px;">New</span></a>
    <a href="dispatch.html" class="ds-nav-link" data-page="dispatch.html" data-permission="canManageDispatch"><span class="ds-nav-icon">🚚</span><span>Dispatch & Loading Sheets</span><span class="badge" style="font-size:9px; margin-left:auto; background:#dcfce7; color:#166534; padding:1px 5px;">Unified</span></a>
  </div>
  <div class="ds-nav-group">
    <div class="ds-nav-heading">Data & Settings</div>
    <a href="upload-update.html" class="ds-nav-link" data-page="upload-update.html" data-permission="canImportData"><span class="ds-nav-icon">📥</span><span>Excel Data Ingest</span><span class="badge" style="font-size:9px; margin-left:auto; background:#fef3c7; color:#b45309; padding:1px 5px;">Admin</span></a>
    <a href="clear-old-data.html" class="ds-nav-link" data-page="clear-old-data.html" data-permission="canResetData"><span class="ds-nav-icon">🧹</span><span>Data Management & Reset</span><span class="badge" style="font-size:9px; margin-left:auto; background:#fee2e2; color:#b91c1c; padding:1px 5px;">Admin</span></a>
    <a href="../index.html" class="ds-nav-link"><span class="ds-nav-icon">🏠</span><span>Master App Hub</span></a>
  </div>
  <div class="ds-sidebar-footer" style="padding:14px 12px; margin-top:auto; border-top:1px solid var(--ds-border); background:var(--ds-surface-subtle);">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
      <div style="min-width:0;">
        <div id="dsSidebarFooterUser" style="font-weight:700; font-size:12px; color:var(--ds-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Administrator</div>
        <div style="font-size:10px; color:var(--ds-text-muted); display:flex; align-items:center; gap:4px;">
          <span style="width:6px; height:6px; border-radius:50%; background:#10b981; display:inline-block;"></span>
          <span id="dsSidebarSessionStatus">Active • 15m idle lock</span>
        </div>
      </div>
    </div>
    <button type="button" id="dsSidebarLogoutBtn" class="btn btn-danger" onclick="DS_Auth.logout('manual')" style="width:100%; font-weight:700; font-size:12.5px; padding:9px; justify-content:center; display:flex; align-items:center; gap:6px;">
      🚪 Sign Out / Logout
    </button>
  </div>
</aside>
<div class="ds-sidebar-backdrop"></div>`,
      footer: `
<footer style="margin-top:40px; padding:20px 0; border-top:1px solid var(--ds-border); text-align:center; font-size:12px; color:var(--ds-text-muted);">
  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; max-width:1700px; margin:0 auto; padding:0 20px;">
    <div><strong>DS Enterprises</strong> — FMCG Management & Field Sales Automation System v4.0.0</div>
    <div><span>100% Offline Capable • Pure Client-Side ERP</span></div>
  </div>
</footer>
<nav class="ds-bottom-nav" aria-label="Mobile Navigation Dock">
  <a href="dashboard.html" class="ds-bottom-nav-item" data-page="dashboard.html"><span class="ds-bottom-nav-icon">📊</span><span>Home</span></a>
  <a href="order-punching.html" class="ds-bottom-nav-item" data-page="order-punching.html"><span class="ds-bottom-nav-icon">🛒</span><span>Punch</span></a>
  <a href="outstanding.html" class="ds-bottom-nav-item" data-page="outstanding.html"><span class="ds-bottom-nav-icon">⏳</span><span>Due</span></a>
  <a href="dispatch.html" class="ds-bottom-nav-item" data-page="dispatch.html"><span class="ds-bottom-nav-icon">🚚</span><span>Dispatch</span></a>
  <button type="button" class="ds-bottom-nav-item" onclick="if(window.DS_App) DS_App.toggleMobileSidebar();" aria-label="Open Mobile Menu"><span class="ds-bottom-nav-icon">☰</span><span>Menu</span></button>
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
      this.initMobileSidebar();
      this.updateNavigationPermissions();
      if (window.DS_Auth) DS_Auth.updateHeaderUI();

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
