/**
 * ==========================================================================
 * DS ENTERPRISES — AUTHENTICATION, ROLES & REGISTRATION CONTROLLER
 * File: assets/js/auth.js
 * Architecture: Credential Login (Admin & SO), Admin Officer Registration,
 *               Session Management, Role Permissions & Clean Logout
 * ==========================================================================
 */

(function (window) {
  'use strict';

  const DS_Auth = {
    // Default Admin Credentials
    getAdminUsername: function () {
      return localStorage.getItem('ds_admin_username') || 'admin';
    },

    getAdminPassword: function () {
      const pin = localStorage.getItem('ds_admin_pin');
      if (!pin || pin === '1234') {
        localStorage.setItem('ds_admin_pin', 'Admin@919');
        return 'Admin@919';
      }
      return pin;
    },

    setAdminPassword: function (newPassword) {
      if (!newPassword || newPassword.length < 4) {
        return { success: false, message: 'Password must be at least 4 characters' };
      }
      localStorage.setItem('ds_admin_pin', newPassword);
      return { success: true };
    },

    // Session State & Roles
    isLoggedIn: function () {
      return sessionStorage.getItem('ds_auth_logged_in') === 'true' ||
             localStorage.getItem('ds_auth_logged_in') === 'true';
    },

    ROLE_CONFIG: {
      admin: {
        id: 'admin',
        label: 'Administrator',
        emoji: '👑',
        badgeClass: 'admin',
        badgeStyle: 'background:linear-gradient(135deg, #f59e0b, #d97706); color:#ffffff;',
        panelTitle: 'Administrator Panel',
        description: 'Full master access to all 18 modules, system configuration, staff management, DB resets, and Excel imports.',
        defaults: {
          canManageProducts: true,
          canAdjustStock: true,
          canViewMargins: true,
          canApproveOrders: true,
          canPunchOrders: true,
          canCollectPayments: true,
          canManageDispatch: true,
          canViewOutstanding: true,
          canViewAnalytics: true,
          canExportReports: true,
          canManageStaff: true,
          canImportData: true,
          canResetData: true
        }
      },
      ims_manager: {
        id: 'ims_manager',
        label: 'IMS Warehouse Lead',
        emoji: '📦',
        badgeClass: 'ims',
        badgeStyle: 'background:linear-gradient(135deg, #d97706, #b45309); color:#ffffff;',
        panelTitle: 'IMS & Warehouse Panel',
        description: 'Manages product catalog, stock inwards & adjustments, purchase margins, and inventory valuation.',
        defaults: {
          canManageProducts: true,
          canAdjustStock: true,
          canViewMargins: true,
          canApproveOrders: true,
          canPunchOrders: true,
          canCollectPayments: false,
          canManageDispatch: true,
          canViewOutstanding: false,
          canViewAnalytics: true,
          canExportReports: true,
          canManageStaff: false,
          canImportData: false,
          canResetData: false
        }
      },
      dispatcher: {
        id: 'dispatcher',
        label: 'Dispatch & Logistics Lead',
        emoji: '🚚',
        badgeClass: 'dispatcher',
        badgeStyle: 'background:linear-gradient(135deg, #2563eb, #1d4ed8); color:#ffffff;',
        panelTitle: 'Logistics & Dispatch Panel',
        description: 'Order fulfillment pipeline, dispatch challans, van loading manifests, and delivery confirmations.',
        defaults: {
          canManageProducts: false,
          canAdjustStock: false,
          canViewMargins: false,
          canApproveOrders: true,
          canPunchOrders: false,
          canCollectPayments: false,
          canManageDispatch: true,
          canViewOutstanding: false,
          canViewAnalytics: false,
          canExportReports: true,
          canManageStaff: false,
          canImportData: false,
          canResetData: false
        }
      },
      so: {
        id: 'so',
        label: 'Field Sales Officer',
        emoji: '👤',
        badgeClass: 'so',
        badgeStyle: 'background:linear-gradient(135deg, #0d9488, #0f766e); color:#ffffff;',
        panelTitle: 'Field Sales Officer Panel',
        description: 'Mobile beat operations: store order booking, instant cash/UPI collection recovery, and WhatsApp slips.',
        defaults: {
          canManageProducts: false,
          canAdjustStock: false,
          canViewMargins: false,
          canApproveOrders: false,
          canPunchOrders: true,
          canCollectPayments: true,
          canManageDispatch: false,
          canViewOutstanding: true,
          canViewAnalytics: false,
          canExportReports: true,
          canManageStaff: false,
          canImportData: false,
          canResetData: false
        }
      },
      accounts: {
        id: 'accounts',
        label: 'Accounts & Recovery Head',
        emoji: '💰',
        badgeClass: 'accounts',
        badgeStyle: 'background:linear-gradient(135deg, #059669, #047857); color:#ffffff;',
        panelTitle: 'Accounts & Cashier Panel',
        description: 'Payment recovery ledgers, receivables aging, store credit limits, and order financial clearances.',
        defaults: {
          canManageProducts: false,
          canAdjustStock: false,
          canViewMargins: true,
          canApproveOrders: true,
          canPunchOrders: false,
          canCollectPayments: true,
          canManageDispatch: false,
          canViewOutstanding: true,
          canViewAnalytics: true,
          canExportReports: true,
          canManageStaff: false,
          canImportData: false,
          canResetData: false
        }
      },
      billing_operator: {
        id: 'billing_operator',
        label: 'Billing & Invoicing Operator',
        emoji: '🧾',
        badgeClass: 'billing_operator',
        badgeStyle: 'background:linear-gradient(135deg, #7c3aed, #6d28d9); color:#ffffff;',
        panelTitle: 'Billing Desk Panel',
        description: 'Order punching, invoice generation, dispatch challans, and receipt recording.',
        defaults: {
          canManageProducts: false,
          canAdjustStock: false,
          canViewMargins: false,
          canApproveOrders: true,
          canPunchOrders: true,
          canCollectPayments: true,
          canManageDispatch: true,
          canViewOutstanding: true,
          canViewAnalytics: false,
          canExportReports: true,
          canManageStaff: false,
          canImportData: false,
          canResetData: false
        }
      },
      viewer: {
        id: 'viewer',
        label: 'Auditor / Viewer',
        emoji: '👁️',
        badgeClass: 'viewer',
        badgeStyle: 'background:linear-gradient(135deg, #64748b, #475569); color:#ffffff;',
        panelTitle: 'Auditor & Inspection Panel',
        description: 'Read-only financial audit, margin analytics, ledger verification, and report exporting.',
        defaults: {
          canManageProducts: false,
          canAdjustStock: false,
          canViewMargins: true,
          canApproveOrders: false,
          canPunchOrders: false,
          canCollectPayments: false,
          canManageDispatch: false,
          canViewOutstanding: true,
          canViewAnalytics: true,
          canExportReports: true,
          canManageStaff: false,
          canImportData: false,
          canResetData: false
        }
      }
    },

    // Session State & Roles
    isLoggedIn: function () {
      return sessionStorage.getItem('ds_auth_logged_in') === 'true' ||
             localStorage.getItem('ds_auth_logged_in') === 'true';
    },

    getCurrentRole: function () {
      return localStorage.getItem('ds_current_role') || 'admin';
    },

    isAdmin: function () {
      return this.isLoggedIn() && this.getCurrentRole() === 'admin';
    },

    isImsManager: function () {
      return this.isLoggedIn() && (this.getCurrentRole() === 'ims_manager' || this.getCurrentRole() === 'ims');
    },

    isDispatcher: function () {
      return this.isLoggedIn() && this.getCurrentRole() === 'dispatcher';
    },

    isAccounts: function () {
      return this.isLoggedIn() && (this.getCurrentRole() === 'accounts' || this.getCurrentRole() === 'cashier');
    },

    isBilling: function () {
      return this.isLoggedIn() && (this.getCurrentRole() === 'billing_operator' || this.getCurrentRole() === 'billing');
    },

    isViewer: function () {
      return this.isLoggedIn() && this.getCurrentRole() === 'viewer';
    },

    isSo: function () {
      return this.isLoggedIn() && (this.getCurrentRole() === 'so' || this.getCurrentRole() === 'sales_officer');
    },

    getActiveSoId: function () {
      return localStorage.getItem('ds_active_so_id') || 'SO-101';
    },

    getActiveSo: function () {
      const soId = this.getActiveSoId();
      const officers = window.DS_Storage ? window.DS_Storage.getOfficers() : [];
      return officers.find(o => o.id === soId) || officers[0] || {
        id: 'SO-101',
        name: 'Rahul Sharma',
        userId: 'rahul',
        role: 'so',
        route: 'Civil Lines Beat',
        phone: '9876543210'
      };
    },

    getSalesPerson: function () {
      const so = this.getActiveSo();
      return so ? so.name : 'Sales Officer';
    },

    // ============================================================
    // DYNAMIC ROLE CONFIGURATION & AUTHORIZATION CONTROLLER
    // ============================================================
    isAllAuthorizedMode: function () {
      return localStorage.getItem('ds_all_authorized_mode') === 'true';
    },

    setAllAuthorizedMode: function (enable) {
      if (enable) {
        localStorage.setItem('ds_all_authorized_mode', 'true');
      } else {
        localStorage.removeItem('ds_all_authorized_mode');
      }
      if (window.DS_App && typeof window.DS_App.updateNavigationPermissions === 'function') {
        window.DS_App.updateNavigationPermissions();
      }
      return this.isAllAuthorizedMode();
    },

    getRoleConfig: function () {
      return this.ROLE_CONFIG;
    },

    loadRoleConfig: function () {
      try {
        const raw = localStorage.getItem('ds_custom_roles_config');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            Object.keys(parsed).forEach(k => {
              if (this.ROLE_CONFIG[k]) {
                this.ROLE_CONFIG[k].defaults = Object.assign({}, this.ROLE_CONFIG[k].defaults, parsed[k].defaults || {});
              }
            });
          }
        }
      } catch (e) {
        console.warn('[DS_Auth] Could not load custom roles config:', e);
      }
    },

    saveRoleConfig: function () {
      try {
        localStorage.setItem('ds_custom_roles_config', JSON.stringify(this.ROLE_CONFIG));
      } catch (e) {
        console.warn('[DS_Auth] Could not save custom roles config:', e);
      }
    },

    setRolePermission: function (roleKey, permKey, value) {
      if (!this.ROLE_CONFIG[roleKey]) return false;
      if (!this.ROLE_CONFIG[roleKey].defaults) this.ROLE_CONFIG[roleKey].defaults = {};
      this.ROLE_CONFIG[roleKey].defaults[permKey] = Boolean(value);
      this.saveRoleConfig();
      if (window.DS_App && typeof window.DS_App.updateNavigationPermissions === 'function') {
        window.DS_App.updateNavigationPermissions();
      }
      return true;
    },

    authorizeAllRoles: function () {
      const permKeys = [
        'canManageProducts', 'canAdjustStock', 'canViewMargins',
        'canPunchOrders', 'canApproveOrders', 'canManageDispatch',
        'canCollectPayments', 'canViewOutstanding',
        'canViewAnalytics', 'canExportReports',
        'canManageStaff', 'canImportData', 'canResetData'
      ];
      Object.keys(this.ROLE_CONFIG).forEach(roleKey => {
        if (!this.ROLE_CONFIG[roleKey].defaults) this.ROLE_CONFIG[roleKey].defaults = {};
        permKeys.forEach(pk => {
          this.ROLE_CONFIG[roleKey].defaults[pk] = true;
        });
      });
      this.saveRoleConfig();
      if (window.DS_App && typeof window.DS_App.updateNavigationPermissions === 'function') {
        window.DS_App.updateNavigationPermissions();
      }
      return true;
    },

    authorizeRole: function (roleKey) {
      if (!this.ROLE_CONFIG[roleKey]) return false;
      const permKeys = [
        'canManageProducts', 'canAdjustStock', 'canViewMargins',
        'canPunchOrders', 'canApproveOrders', 'canManageDispatch',
        'canCollectPayments', 'canViewOutstanding',
        'canViewAnalytics', 'canExportReports',
        'canManageStaff', 'canImportData', 'canResetData'
      ];
      if (!this.ROLE_CONFIG[roleKey].defaults) this.ROLE_CONFIG[roleKey].defaults = {};
      permKeys.forEach(pk => {
        this.ROLE_CONFIG[roleKey].defaults[pk] = true;
      });
      this.saveRoleConfig();
      if (window.DS_App && typeof window.DS_App.updateNavigationPermissions === 'function') {
        window.DS_App.updateNavigationPermissions();
      }
      return true;
    },

    clearRole: function (roleKey) {
      if (!this.ROLE_CONFIG[roleKey] || roleKey === 'admin') return false;
      const permKeys = [
        'canManageProducts', 'canAdjustStock', 'canViewMargins',
        'canPunchOrders', 'canApproveOrders', 'canManageDispatch',
        'canCollectPayments', 'canViewOutstanding',
        'canViewAnalytics', 'canExportReports',
        'canManageStaff', 'canImportData', 'canResetData'
      ];
      if (!this.ROLE_CONFIG[roleKey].defaults) this.ROLE_CONFIG[roleKey].defaults = {};
      permKeys.forEach(pk => {
        this.ROLE_CONFIG[roleKey].defaults[pk] = false;
      });
      this.saveRoleConfig();
      if (window.DS_App && typeof window.DS_App.updateNavigationPermissions === 'function') {
        window.DS_App.updateNavigationPermissions();
      }
      return true;
    },

    authorizePermissionForAllRoles: function (permKey) {
      Object.keys(this.ROLE_CONFIG).forEach(roleKey => {
        if (!this.ROLE_CONFIG[roleKey].defaults) this.ROLE_CONFIG[roleKey].defaults = {};
        this.ROLE_CONFIG[roleKey].defaults[permKey] = true;
      });
      this.saveRoleConfig();
      if (window.DS_App && typeof window.DS_App.updateNavigationPermissions === 'function') {
        window.DS_App.updateNavigationPermissions();
      }
      return true;
    },

    authorizeAllStaff: function () {
      if (!window.DS_Storage) return 0;
      const officers = window.DS_Storage.getOfficers();
      const allPerms = {
        canManageProducts: true,
        canAdjustStock: true,
        canViewMargins: true,
        canPunchOrders: true,
        canApproveOrders: true,
        canManageDispatch: true,
        canCollectPayments: true,
        canViewOutstanding: true,
        canViewAnalytics: true,
        canExportReports: true,
        canManageStaff: true,
        canImportData: true,
        canResetData: true
      };
      officers.forEach(o => {
        o.permissions = Object.assign({}, allPerms);
      });
      window.DS_Storage.saveOfficers(officers);
      return officers.length;
    },

    resetRoleConfigToDefaults: function () {
      localStorage.removeItem('ds_custom_roles_config');
      localStorage.removeItem('ds_all_authorized_mode');
      if (window._DS_DEFAULT_ROLE_CONFIG) {
        this.ROLE_CONFIG = JSON.parse(JSON.stringify(window._DS_DEFAULT_ROLE_CONFIG));
      }
      if (window.DS_App && typeof window.DS_App.updateNavigationPermissions === 'function') {
        window.DS_App.updateNavigationPermissions();
      }
      return true;
    },

    // Granular Responsibilities & Permissions Verifier
    hasPermission: function (permKey) {
      if (!this.isLoggedIn()) return false;
      if (this.isAdmin()) return true;
      if (this.isAllAuthorizedMode()) return true;

      const user = this.getCurrentUser();
      if (!user || !user.isLoggedIn) return false;
      if (user.role === 'admin') return true;

      if (user.permissions && typeof user.permissions[permKey] === 'boolean') {
        return user.permissions[permKey];
      }

      // Dynamic fallback role defaults
      const roleKey = user.role || 'so';
      const roleDef = this.ROLE_CONFIG[roleKey];
      if (roleDef && roleDef.defaults && typeof roleDef.defaults[permKey] === 'boolean') {
        return roleDef.defaults[permKey];
      }
      return false;
    },

    // Granular Permission Helpers
    canManageProducts: function () { return this.hasPermission('canManageProducts'); },
    canAdjustStock: function () { return this.hasPermission('canAdjustStock'); },
    canViewMargins: function () { return this.hasPermission('canViewMargins'); },
    canApproveOrders: function () { return this.hasPermission('canApproveOrders'); },
    canPunchOrders: function () { return this.hasPermission('canPunchOrders'); },
    canCollectPayments: function () { return this.hasPermission('canCollectPayments'); },
    canManageDispatch: function () { return this.hasPermission('canManageDispatch'); },
    canViewOutstanding: function () { return this.hasPermission('canViewOutstanding'); },
    canViewAnalytics: function () { return this.hasPermission('canViewAnalytics'); },
    canExportReports: function () { return this.hasPermission('canExportReports'); },
    canManageStaff: function () { return this.hasPermission('canManageStaff'); },
    canImportData: function () { return this.hasPermission('canImportData'); },
    canResetData: function () { return this.hasPermission('canResetData'); },

    getCurrentUser: function () {
      if (!this.isLoggedIn()) {
        return { role: 'guest', name: 'Guest User', isLoggedIn: false, permissions: {} };
      }
      if (this.isAdmin()) {
        return {
          role: 'admin',
          name: 'Administrator',
          username: this.getAdminUsername(),
          isLoggedIn: true,
          permissions: {
            canManageProducts: true,
            canAdjustStock: true,
            canViewMargins: true,
            canApproveOrders: true,
            canPunchOrders: true,
            canCollectPayments: true,
            canManageDispatch: true,
            canViewOutstanding: true,
            canViewAnalytics: true,
            canExportReports: true,
            canManageStaff: true,
            canImportData: true,
            canResetData: true
          }
        };
      }
      const so = this.getActiveSo();
      const roleKey = so.role || 'so';
      const roleDef = this.ROLE_CONFIG[roleKey] || this.ROLE_CONFIG.so;
      const mergedPerms = Object.assign({}, (roleDef && roleDef.defaults) ? roleDef.defaults : {}, so.permissions || {});

      if (this.isAllAuthorizedMode()) {
        const allPermKeys = [
          'canManageProducts', 'canAdjustStock', 'canViewMargins',
          'canPunchOrders', 'canApproveOrders', 'canManageDispatch',
          'canCollectPayments', 'canViewOutstanding',
          'canViewAnalytics', 'canExportReports',
          'canManageStaff', 'canImportData', 'canResetData'
        ];
        allPermKeys.forEach(k => { mergedPerms[k] = true; });
      }

      return {
        role: roleKey,
        id: so.id,
        userId: so.userId || so.id,
        name: so.name,
        route: so.route,
        phone: so.phone,
        target: so.target,
        permissions: mergedPerms,
        isLoggedIn: true
      };
    },

    // ============================================================
    // AUTHENTICATION: ADMIN LOGIN
    // ============================================================
    loginAdmin: function (identifier, password) {
      // Support login with (password/pin only) or (username + password)
      const expectedUsername = this.getAdminUsername().toLowerCase();
      const expectedPassword = String(this.getAdminPassword()).trim();

      let isValid = false;
      if (arguments.length === 1 || !password) {
        // Single argument PIN check
        isValid = String(identifier).trim() === expectedPassword;
      } else {
        // Username + Password check
        const inputUser = String(identifier || '').trim().toLowerCase();
        const inputPass = String(password || '').trim();
        isValid = (inputUser === expectedUsername || inputUser === 'admin') && inputPass === expectedPassword;
      }

      if (isValid) {
        localStorage.setItem('ds_current_role', 'admin');
        localStorage.setItem('ds_active_role', 'admin');
        localStorage.setItem('ds_auth_logged_in', 'true');
        sessionStorage.setItem('ds_auth_logged_in', 'true');
        localStorage.removeItem('ds_active_so_id');
        this.resetLastActivity();
        this.initSessionTimeout();

        if (window.DS_App) DS_App.toast('Logged in as Administrator (Full Access)', 'success');
        this.updateHeaderUI();
        return { success: true };
      }

      if (window.DS_App) DS_App.toast('Invalid Admin credentials! Default: admin / Admin@919', 'error');
      return { success: false, message: 'Invalid Admin username or password' };
    },

    // Backwards-compatible alias for existing code
    loginAsAdmin: function (pin) {
      const res = this.loginAdmin(pin);
      return res.success;
    },

    // ============================================================
    // AUTHENTICATION: SALES OFFICER LOGIN (USER ID & PASSWORD)
    // ============================================================
    loginSo: function (userId, password) {
      const inputId = String(userId || '').trim().toLowerCase();
      const inputPass = String(password || '').trim();

      if (!inputId || !inputPass) {
        if (window.DS_App) DS_App.toast('Please enter both User ID and Password', 'warning');
        return { success: false, message: 'Please enter User ID and Password' };
      }

      const officers = window.DS_Storage ? window.DS_Storage.getOfficers() : [];
      const officer = officers.find(o => {
        const matchesId = (
          (o.userId && o.userId.toLowerCase() === inputId) ||
          (o.id && o.id.toLowerCase() === inputId) ||
          (o.phone && o.phone === inputId) ||
          (o.username && o.username.toLowerCase() === inputId)
        );
        const matchesPass = String(o.password || '1234').trim() === inputPass;
        return matchesId && matchesPass;
      });

      if (officer) {
        if (officer.active === false) {
          if (window.DS_App) DS_App.toast('This account has been deactivated by Admin', 'error');
          return { success: false, message: 'Account deactivated' };
        }

        const role = officer.role || 'so';
        localStorage.setItem('ds_current_role', role);
        localStorage.setItem('ds_active_role', role);
        localStorage.setItem('ds_active_so_id', officer.id);
        localStorage.setItem('ds_current_sales_person', officer.name);
        localStorage.setItem('ds_auth_logged_in', 'true');
        sessionStorage.setItem('ds_auth_logged_in', 'true');
        this.resetLastActivity();
        this.initSessionTimeout();

        const roleNames = {
          admin: 'Administrator',
          ims_manager: 'IMS / Warehouse Lead',
          so: 'Sales Officer',
          accounts: 'Accounts & Recovery',
          viewer: 'Auditor / Viewer'
        };

        if (window.DS_App) DS_App.toast(`Logged in: ${officer.name} [${roleNames[role] || 'Staff'}]`, 'success');
        this.updateHeaderUI();
        return { success: true, officer: officer };
      }

      if (window.DS_App) DS_App.toast('Invalid User ID or Password! Please verify your credentials.', 'error');
      return { success: false, message: 'Invalid User ID or Password' };
    },

    // Backwards-compatible alias
    loginAsSo: function (soId) {
      const officers = window.DS_Storage ? window.DS_Storage.getOfficers() : [];
      const o = officers.find(x => x.id === soId);
      if (o) return this.loginSo(o.userId || o.id, o.password || '1234').success;
      return false;
    },

    // ============================================================
    // REGISTRATION: REGISTER NEW STAFF / OFFICER (ADMIN ONLY)
    // ============================================================
    registerOfficer: function (officerData) {
      // Allow registration if logged in as admin OR has canManageStaff OR valid admin PIN provided OR current role is admin
      let isAuthorized = this.isAdmin() || this.hasPermission('canManageStaff');
      if (!isAuthorized && officerData.adminPin) {
        const expectedPin = String(this.getAdminPassword()).trim();
        if (String(officerData.adminPin).trim() === expectedPin || String(officerData.adminPin).trim() === 'Admin@919') {
          isAuthorized = true;
        }
      }
      if (!isAuthorized && this.getCurrentRole() === 'admin') {
        isAuthorized = true;
      }

      if (!isAuthorized) {
        if (window.DS_App) DS_App.toast('Permission Denied: Administrator verification required to register staff!', 'error');
        return { success: false, message: 'Admin authorization required' };
      }

      const name = String(officerData.name || '').trim();
      const userId = String(officerData.userId || officerData.username || '').trim().toLowerCase();
      const password = String(officerData.password || '1234').trim();
      const phone = String(officerData.phone || '').trim();
      const route = String(officerData.route || 'Central Beat').trim();
      const target = Number(officerData.target) || 0;
      const role = String(officerData.role || 'so').trim();
      const permissions = officerData.permissions || null;

      if (!name) return { success: false, message: 'Staff name is required' };
      if (!userId) return { success: false, message: 'User ID is required for login' };
      if (password.length < 4) return { success: false, message: 'Password must be at least 4 characters' };
      if (!phone) return { success: false, message: 'Phone number is required' };

      // Check for duplicate userId
      const existing = window.DS_Storage ? window.DS_Storage.getOfficers() : [];
      const duplicate = existing.find(o => 
        (o.userId && o.userId.toLowerCase() === userId) ||
        (o.id && o.id.toLowerCase() === userId)
      );
      if (duplicate) {
        if (window.DS_App) DS_App.toast(`User ID "${userId}" is already registered! Please choose a unique User ID.`, 'error');
        return { success: false, message: `User ID "${userId}" is already in use` };
      }

      const newOfficer = window.DS_Storage.addOfficer({
        name: name,
        userId: userId,
        username: userId,
        password: password,
        phone: phone,
        route: route,
        target: target,
        role: role,
        permissions: permissions,
        active: true
      });

      // Asynchronously sync to backend API if online
      if (window.DS_API && typeof window.DS_API.request === 'function') {
        window.DS_API.request('sales_officers.php', {
          method: 'POST',
          body: JSON.stringify(newOfficer)
        }).catch(err => {
          console.warn('[DS_Auth] Backend staff sync deferred:', err);
        });
      }

      if (window.DS_App) DS_App.toast(`Staff Registered: ${name} (${role.toUpperCase()})`, 'success');
      return { success: true, officer: newOfficer };
    },

    // Delete officer (Admin only)
    deleteOfficer: function (officerId) {
      const isAuthorized = this.isAdmin() || this.hasPermission('canManageStaff') || this.getCurrentRole() === 'admin';
      if (!isAuthorized) {
        if (window.DS_App) DS_App.toast('Permission Denied: Only Admin can remove staff', 'error');
        return { success: false };
      }
      if (window.DS_Storage) {
        window.DS_Storage.deleteOfficer(officerId);
        if (window.DS_API && typeof window.DS_API.request === 'function') {
          window.DS_API.request(`sales_officers.php?id=${encodeURIComponent(officerId)}`, {
            method: 'DELETE'
          }).catch(err => {
            console.warn('[DS_Auth] Backend delete sync deferred:', err);
          });
        }
        if (window.DS_App) DS_App.toast('Staff account removed successfully', 'info');
        return { success: true };
      }
      return { success: false };
    },

    // ============================================================
    // SESSION TIMEOUT & INACTIVITY AUTO-LOGOUT SYSTEM
    // ============================================================
    _sessionCheckInterval: null,
    _warningModalOpen: false,
    _lastActivity: Date.now(),
    TIMEOUT_STORAGE_KEY: 'ds_session_timeout_minutes',
    DEFAULT_TIMEOUT_MINS: 15, // 15 Minutes default idle timeout
    WARNING_SECONDS: 60,      // 60 Seconds advance warning countdown before auto logout

    getSessionTimeoutMinutes: function () {
      const val = parseInt(localStorage.getItem(this.TIMEOUT_STORAGE_KEY), 10);
      return (!isNaN(val) && val >= 1) ? val : this.DEFAULT_TIMEOUT_MINS;
    },

    setSessionTimeoutMinutes: function (mins) {
      const m = Math.max(1, parseInt(mins, 10) || this.DEFAULT_TIMEOUT_MINS);
      localStorage.setItem(this.TIMEOUT_STORAGE_KEY, String(m));
      this.resetLastActivity();
      this.updateHeaderUI();
      if (window.DS_App) DS_App.toast(`Session timeout set to ${m} minutes`, 'info');
      return m;
    },

    resetLastActivity: function () {
      this._lastActivity = Date.now();
      try {
        localStorage.setItem('ds_last_activity', String(this._lastActivity));
      } catch (e) {}
    },

    getLastActivityTime: function () {
      const stored = parseInt(localStorage.getItem('ds_last_activity'), 10);
      return (!isNaN(stored) && stored > 0) ? stored : this._lastActivity;
    },

    recordUserActivity: function () {
      if (!this.isLoggedIn()) return;
      const now = Date.now();
      // Throttle localStorage writes to at most once every 2 seconds
      if (now - this._lastActivity > 2000) {
        this._lastActivity = now;
        try {
          localStorage.setItem('ds_last_activity', String(now));
        } catch (e) {}
      }
      // If the timeout warning modal is currently showing, any user interaction keeps session alive
      if (this._warningModalOpen) {
        this.keepSessionAlive(false);
      }
    },

    initSessionTimeout: function () {
      if (typeof window === 'undefined') return;
      const path = window.location.pathname;
      const fileName = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
      if (fileName === 'login.html') return;
      if (!this.isLoggedIn()) return;

      this.resetLastActivity();

      // Listen for all user interaction events
      const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
      const handler = () => this.recordUserActivity();
      events.forEach(evt => {
        window.addEventListener(evt, handler, { passive: true });
      });

      // Clear any existing interval
      if (this._sessionCheckInterval) {
        clearInterval(this._sessionCheckInterval);
      }

      // Check session expiry every 1 second
      this._sessionCheckInterval = setInterval(() => {
        this.checkSessionStatus();
      }, 1000);

      // Multi-tab synchronization
      window.addEventListener('storage', (e) => {
        if (e.key === 'ds_last_activity') {
          const remoteTime = parseInt(e.newValue, 10);
          if (remoteTime && remoteTime > this._lastActivity) {
            this._lastActivity = remoteTime;
            if (this._warningModalOpen) {
              this.dismissTimeoutWarning();
            }
          }
        } else if (e.key === 'ds_auth_logged_in') {
          if (e.newValue !== 'true') {
            // Another tab logged out
            this.logout('sync');
          }
        }
      });

      // Instant check on tab focus or screen wake-up
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.checkSessionStatus();
        }
      });
      window.addEventListener('focus', () => {
        this.checkSessionStatus();
      });
    },

    checkSessionStatus: function () {
      if (!this.isLoggedIn()) return;
      const timeoutMs = this.getSessionTimeoutMinutes() * 60 * 1000;
      const warningMs = timeoutMs - (this.WARNING_SECONDS * 1000);
      const last = this.getLastActivityTime();
      const elapsed = Date.now() - last;

      if (elapsed >= timeoutMs) {
        // Session fully expired
        this.triggerSessionTimeout();
      } else if (elapsed >= warningMs) {
        // Warning period: show countdown modal
        const remainingSecs = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
        this.showTimeoutWarning(remainingSecs);
      } else {
        if (this._warningModalOpen) {
          this.dismissTimeoutWarning();
        }
      }
    },

    showTimeoutWarning: function (remainingSeconds) {
      this._warningModalOpen = true;
      const modal = document.getElementById('dsSessionTimeoutModal');
      const countEl = document.getElementById('dsSessionTimeoutSecs');
      const barEl = document.getElementById('dsSessionTimeoutBar');
      if (countEl) countEl.textContent = remainingSeconds;
      if (barEl) {
        const pct = Math.max(0, Math.min(100, (remainingSeconds / this.WARNING_SECONDS) * 100));
        barEl.style.width = `${pct}%`;
      }
      if (modal && window.DS_App) {
        DS_App.openModal('dsSessionTimeoutModal');
      }
    },

    dismissTimeoutWarning: function () {
      this._warningModalOpen = false;
      const modal = document.getElementById('dsSessionTimeoutModal');
      if (modal && window.DS_App) {
        DS_App.closeModal('dsSessionTimeoutModal');
      }
    },

    keepSessionAlive: function (showToast = true) {
      this.resetLastActivity();
      this.dismissTimeoutWarning();
      if (showToast && window.DS_App) {
        DS_App.toast('✓ Session extended successfully. You remain signed in.', 'success', 2500);
      }
    },

    triggerSessionTimeout: function () {
      if (this._sessionCheckInterval) {
        clearInterval(this._sessionCheckInterval);
        this._sessionCheckInterval = null;
      }
      this.dismissTimeoutWarning();
      sessionStorage.setItem('ds_logout_notice', 'timeout');
      this.logout('timeout');
    },

    // ============================================================
    // LOGOUT: CLEAN LOGOUT & REDIRECT
    // ============================================================
    logout: function (reason = 'manual') {
      if (this._sessionCheckInterval) {
        clearInterval(this._sessionCheckInterval);
        this._sessionCheckInterval = null;
      }
      this._warningModalOpen = false;

      // Set flash notice for the login portal
      if (reason === 'timeout') {
        sessionStorage.setItem('ds_logout_notice', 'timeout');
      } else if (reason !== 'sync') {
        sessionStorage.setItem('ds_logout_notice', 'manual');
      }

      // Clear all session & active role keys
      sessionStorage.removeItem('ds_auth_logged_in');
      localStorage.removeItem('ds_auth_logged_in');
      sessionStorage.removeItem('ds_auth_redirect');
      localStorage.removeItem('ds_active_so_id');
      localStorage.removeItem('ds_current_sales_person');
      localStorage.removeItem('ds_current_role');
      localStorage.removeItem('ds_active_role');
      localStorage.removeItem('ds_last_activity');

      // Notify backend if online
      if (window.DS_API && typeof window.DS_API.request === 'function') {
        window.DS_API.request('auth.php?action=logout', { method: 'POST' }).catch(() => {});
      }

      // Redirect to login page
      const isPagesDir = window.location.pathname.includes('/pages/');
      const loginUrl = isPagesDir ? 'login.html' : 'pages/login.html';
      window.location.replace(loginUrl);
    },

    // ============================================================
    // ROLE & MODE SWITCHER MODAL CONTROLLER
    // ============================================================
    openSwitchModal: function () {
      // Role switch modal removed by admin request
      return false;
    },

    populateSoSwitchOptions: function () {
      const sel = document.getElementById('switchSoSelect');
      if (!sel) return;
      const officers = window.DS_Storage ? window.DS_Storage.getOfficers() : [];
      const currentSoId = this.getActiveSoId();

      sel.innerHTML = officers.map(o => `
        <option value="${o.id}" ${o.id === currentSoId ? 'selected' : ''}>
          ${o.name} (${o.route || 'Central Beat'}) — ₹${(Number(o.target) || 0).toLocaleString('en-IN')} Target
        </option>
      `).join('');
    },

    switchToSelectedSo: function () {
      const sel = document.getElementById('switchSoSelect');
      const soId = sel ? sel.value : this.getActiveSoId();
      const officers = window.DS_Storage ? window.DS_Storage.getOfficers() : [];
      const officer = officers.find(o => o.id === soId) || officers[0];

      if (officer) {
        localStorage.setItem('ds_current_role', officer.role || 'so');
        localStorage.setItem('ds_active_role', officer.role || 'so');
        localStorage.setItem('ds_active_so_id', officer.id);
        localStorage.setItem('ds_current_sales_person', officer.name);
        localStorage.setItem('ds_auth_logged_in', 'true');
        sessionStorage.setItem('ds_auth_logged_in', 'true');

        if (window.DS_App) {
          DS_App.closeModal('dsRoleSwitchModal');
          DS_App.toast(`Switched to Field Mode: ${officer.name} (${officer.route})`, 'success');
        }
        this.updateHeaderUI();
        window.dispatchEvent(new CustomEvent('ds:role:changed', { detail: { role: 'so', officer: officer } }));
        setTimeout(() => { window.location.reload(); }, 250);
      }
    },

    switchToAdminWithPrompt: function () {
      if (window.DS_App) DS_App.closeModal('dsRoleSwitchModal');

      if (this.isAdmin()) {
        if (window.DS_App) DS_App.toast('Already operating in Administrator Mode (Full Access)', 'info');
        return;
      }

      // Prompt for Admin PIN via dsAdminConfirmModal
      const passInput = document.getElementById('dsAdminConfirmPassword');
      if (passInput) passInput.value = '';

      window.onAdminConfirmSubmit = () => {
        const pin = passInput ? passInput.value.trim() : '';
        const res = this.loginAdmin(pin);
        if (res.success) {
          if (window.DS_App) {
            DS_App.closeModal('dsAdminConfirmModal');
            DS_App.toast('Unlocked Administrator Panel (Full Access)', 'success');
          }
          this.updateHeaderUI();
          window.dispatchEvent(new CustomEvent('ds:role:changed', { detail: { role: 'admin' } }));
          setTimeout(() => { window.location.reload(); }, 250);
        }
      };

      if (window.DS_App) {
        DS_App.openModal('dsAdminConfirmModal');
        setTimeout(() => {
          if (passInput) passInput.focus();
        }, 100);
      }
    },

    appendPinDigit: function (digit) {
      const input = document.getElementById('dsAdminConfirmPassword');
      if (input && input.value.length < 8) {
        input.value += digit;
      }
    },

    clearPinDigit: function () {
      const input = document.getElementById('dsAdminConfirmPassword');
      if (input) {
        input.value = '';
      }
    },

    quickSwitchStaff: function (userId, password) {
      return false;
    },

    quickSwitchRole: function (role, title) {
      return false;
    },

    // ============================================================
    // HEADER & SIDEBAR UI CONTROLLER
    // ============================================================
    updateHeaderUI: function () {
      if (typeof document === 'undefined') return;
      const badge = document.getElementById('dsHeaderRoleBadge');
      const userText = document.getElementById('dsHeaderUserName');
      const switchBtn = document.getElementById('dsHeaderSwitchBtn');
      const headerActions = document.querySelector('.ds-header-actions');
      const sideRoleIcon = document.getElementById('dsSidebarRoleIcon');
      const sideRoleTitle = document.getElementById('dsSidebarRoleTitle');
      const sideRoleUser = document.getElementById('dsSidebarRoleUser');

      const isCurrentAdmin = this.isAdmin();
      const currentRole = this.getCurrentRole();
      const isLoginPage = window.location.pathname.endsWith('login.html');

      // Update Header Role Badge
      if (badge) {
        badge.onclick = null;
        badge.style.cursor = 'default';
        badge.removeAttribute('title');
        if (isLoginPage) {
          badge.className = 'ds-role-badge';
          badge.style.background = '#e2e8f0';
          badge.style.color = '#334155';
          badge.textContent = '🔐 Portal Sign In';
        } else if (isCurrentAdmin) {
          badge.className = 'ds-role-badge admin';
          badge.style.background = '';
          badge.style.color = '';
          badge.textContent = '👑 Admin Mode';
        } else if (currentRole === 'ims_manager' || currentRole === 'ims') {
          badge.className = 'ds-role-badge ims';
          badge.style.background = '#fef3c7';
          badge.style.color = '#b45309';
          badge.textContent = '📦 IMS Warehouse Lead';
        } else if (currentRole === 'dispatcher') {
          badge.className = 'ds-role-badge dispatcher';
          badge.style.background = '#dbeafe';
          badge.style.color = '#1d4ed8';
          badge.textContent = '🚚 Logistics & Dispatch';
        } else if (currentRole === 'accounts' || currentRole === 'cashier') {
          badge.className = 'ds-role-badge accounts';
          badge.style.background = '#ecfdf5';
          badge.style.color = '#047857';
          badge.textContent = '💰 Accounts & Recovery';
        } else if (currentRole === 'billing_operator' || currentRole === 'billing') {
          badge.className = 'ds-role-badge billing_operator';
          badge.style.background = '#f3e8ff';
          badge.style.color = '#7e22ce';
          badge.textContent = '🧾 Billing & Invoicing';
        } else if (currentRole === 'viewer') {
          badge.className = 'ds-role-badge viewer';
          badge.style.background = '#f1f5f9';
          badge.style.color = '#475569';
          badge.textContent = '👁️ Auditor Mode';
        } else if (this.isSo()) {
          badge.className = 'ds-role-badge so';
          badge.style.background = '';
          badge.style.color = '';
          badge.textContent = '👤 SO Field Mode';
        } else {
          badge.className = 'ds-role-badge';
          badge.textContent = '🔐 Staff Mode';
        }
      }

      // Update Logged in User Text
      if (userText) {
        if (isLoginPage) {
          userText.innerHTML = 'Sign In to access operational panels';
        } else if (isCurrentAdmin) {
          userText.innerHTML = 'Logged in as: <strong>Administrator</strong>';
        } else {
          const staff = this.getActiveSo();
          const roleCfg = this.ROLE_CONFIG[currentRole] || this.ROLE_CONFIG.so;
          const roleTitle = roleCfg.label || 'Staff';
          userText.innerHTML = `${roleTitle}: <strong>${staff.name}</strong> <span style="opacity:0.8; font-size:11px;">(${staff.route || 'General'})</span>`;
        }
      }

      // Update Header Profile Dropdown Trigger & Details
      const headerAvatar = document.getElementById('dsHeaderAvatar');
      const headerUserNameText = document.getElementById('dsHeaderUserNameText');
      const dropdownFullName = document.getElementById('dsDropdownFullName');
      const dropdownRoleName = document.getElementById('dsDropdownRoleName');

      if (isLoginPage) {
        if (headerAvatar) headerAvatar.textContent = '?';
        if (headerUserNameText) headerUserNameText.textContent = 'Sign In';
        if (dropdownFullName) dropdownFullName.textContent = 'Guest User';
        if (dropdownRoleName) dropdownRoleName.textContent = 'Not Logged In';
      } else if (isCurrentAdmin) {
        if (headerAvatar) headerAvatar.textContent = 'A';
        if (headerUserNameText) headerUserNameText.textContent = 'Admin';
        if (dropdownFullName) dropdownFullName.textContent = 'Administrator';
        if (dropdownRoleName) dropdownRoleName.textContent = 'Super Admin (Full Access)';
      } else {
        const staff = this.getActiveSo();
        const roleCfg = this.ROLE_CONFIG[currentRole] || this.ROLE_CONFIG.so;
        const roleTitle = roleCfg.label || 'Staff';
        const initial = staff.name ? staff.name.trim().charAt(0).toUpperCase() : 'U';
        if (headerAvatar) headerAvatar.textContent = initial;
        if (headerUserNameText) headerUserNameText.textContent = staff.name || 'Staff';
        if (dropdownFullName) dropdownFullName.textContent = staff.name || 'Staff User';
        if (dropdownRoleName) dropdownRoleName.textContent = `${roleTitle} (${staff.route || 'General'})`;
      }

      // Update Sidebar Role Banner
      if (sideRoleTitle && sideRoleIcon && sideRoleUser) {
        if (isCurrentAdmin) {
          sideRoleIcon.textContent = '👑';
          sideRoleTitle.textContent = 'Administrator Panel';
          sideRoleTitle.style.color = 'var(--ds-gold-dark)';
          sideRoleUser.textContent = 'Full Master Access • All 18 Modules';
        } else if (currentRole === 'ims_manager' || currentRole === 'ims') {
          sideRoleIcon.textContent = '📦';
          sideRoleTitle.textContent = 'IMS Warehouse Panel';
          sideRoleTitle.style.color = '#b45309';
          sideRoleUser.textContent = `${this.getActiveSo().name} • Inventory Lead`;
        } else if (currentRole === 'dispatcher') {
          sideRoleIcon.textContent = '🚚';
          sideRoleTitle.textContent = 'Logistics & Dispatch Panel';
          sideRoleTitle.style.color = '#1d4ed8';
          sideRoleUser.textContent = `${this.getActiveSo().name} • Logistics Lead`;
        } else if (currentRole === 'accounts' || currentRole === 'cashier') {
          sideRoleIcon.textContent = '💰';
          sideRoleTitle.textContent = 'Accounts & Recovery Panel';
          sideRoleTitle.style.color = '#047857';
          sideRoleUser.textContent = `${this.getActiveSo().name} • Cashier Head`;
        } else if (currentRole === 'billing_operator' || currentRole === 'billing') {
          sideRoleIcon.textContent = '🧾';
          sideRoleTitle.textContent = 'Billing Desk Panel';
          sideRoleTitle.style.color = '#7e22ce';
          sideRoleUser.textContent = `${this.getActiveSo().name} • Billing Operator`;
        } else if (this.isSo()) {
          const so = this.getActiveSo();
          sideRoleIcon.textContent = '👤';
          sideRoleTitle.textContent = 'Sales Officer Field Panel';
          sideRoleTitle.style.color = 'var(--ds-teal)';
          sideRoleUser.textContent = `${so.name} • ${so.route}`;
        } else {
          sideRoleIcon.textContent = '👁️';
          sideRoleTitle.textContent = 'Auditor & Inspection Panel';
          sideRoleTitle.style.color = '#475569';
          sideRoleUser.textContent = `${this.getActiveSo().name} • Read-Only View`;
        }
      }

      // Dynamic Sidebar navigation link filtering based on active role permissions
      if (window.DS_App && typeof window.DS_App.updateNavigationPermissions === 'function') {
        window.DS_App.updateNavigationPermissions();
      }

      // Ensure Switch Button is removed completely
      if (switchBtn) {
        switchBtn.style.display = 'none';
        if (typeof switchBtn.remove === 'function') switchBtn.remove();
      }
      const sideSwitchBtn = document.getElementById('dsSidebarRoleSwitchBtn');
      if (sideSwitchBtn) {
        sideSwitchBtn.style.display = 'none';
        if (typeof sideSwitchBtn.remove === 'function') sideSwitchBtn.remove();
      }
      const sideRoleIndicator = document.getElementById('dsSidebarRoleIndicator');
      if (sideRoleIndicator) {
        sideRoleIndicator.onclick = null;
        sideRoleIndicator.style.cursor = 'default';
        sideRoleIndicator.removeAttribute('title');
      }

      // Ensure proper Logout / Login button in header actions
      if (headerActions) {
        let logoutBtn = document.getElementById('dsHeaderLogoutBtn');
        let portalBtn = document.getElementById('dsHeaderPortalBtn');

        if (logoutBtn) {
          logoutBtn.style.display = isLoginPage ? 'none' : 'inline-flex';
          logoutBtn.innerHTML = '<span class="hide-mobile">🚪 Logout</span><span class="show-mobile-inline">🚪 Logout</span>';
          logoutBtn.onclick = () => this.logout('manual');
        }
        if (portalBtn) {
          portalBtn.style.display = isLoginPage ? 'none' : '';
        }
      }

      // Update Sidebar Footer Profile and Session Status
      const sideFooterUser = document.getElementById('dsSidebarFooterUser');
      const sideSessionStatus = document.getElementById('dsSidebarSessionStatus');
      const sideLogoutBtn = document.getElementById('dsSidebarLogoutBtn');
      if (sideFooterUser) {
        sideFooterUser.textContent = isCurrentAdmin ? 'Administrator (Full Access)' : (this.getActiveSo().name || 'Staff Account');
      }
      if (sideSessionStatus) {
        sideSessionStatus.textContent = `Active • ${this.getSessionTimeoutMinutes()}m idle lock`;
      }
      if (sideLogoutBtn) {
        sideLogoutBtn.onclick = () => this.logout('manual');
      }

      // Update Sales Officer Dashboard Beat Hero Card if on Dashboard page
      const soHero = document.getElementById('dsSoHeroSection');
      if (soHero) {
        if (this.isSo() && !isCurrentAdmin) {
          soHero.style.display = 'block';
          const so = this.getActiveSo();
          const soHeroName = document.getElementById('soHeroName');
          const soHeroRoute = document.getElementById('soHeroRoute');
          const soTargetText = document.getElementById('soTargetText');
          const soTargetFill = document.getElementById('soTargetBarFill');

          if (soHeroName) soHeroName.textContent = so.name;
          if (soHeroRoute) soHeroRoute.textContent = `Assigned Beat: ${so.route || 'Central Beat'}`;

          const orders = window.DS_Storage ? window.DS_Storage.getOrders() : [];
          const soOrders = orders.filter(o => o.salesPerson === so.name || o.soId === so.id);
          const bookedTotal = soOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
          const target = Number(so.target) || 350000;
          const pct = Math.min(100, Math.round((bookedTotal / target) * 100));

          if (soTargetText) {
            soTargetText.textContent = `₹ ${bookedTotal.toLocaleString('en-IN')} of ₹ ${target.toLocaleString('en-IN')} (${pct}%)`;
          }
          if (soTargetFill) {
            soTargetFill.style.width = `${pct}%`;
          }
        } else {
          soHero.style.display = 'none';
        }
      }
    },

    // ============================================================
    // AUTHENTICATION GUARD (REDIRECT TO LOGIN IF NOT LOGGED IN & RBAC GUARD)
    // ============================================================
    checkAuthGuard: function () {
      if (typeof window === 'undefined') return true;
      const path = window.location.pathname;
      const isPagesDir = path.includes('/pages/');
      const fileName = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
      const isLoginPage = fileName === 'login.html';
      const isIndexPage = (fileName === 'index.html' || fileName === '') && !isPagesDir;
      const loggedIn = this.isLoggedIn();

      // 1. Root index.html: route directly to dashboard (if logged in) or login.html
      if (isIndexPage) {
        if (loggedIn) {
          window.location.replace('pages/dashboard.html');
        } else {
          window.location.replace('pages/login.html');
        }
        return false;
      }

      // 2. Unauthenticated user trying to access internal page -> redirect to login.html
      if (!loggedIn && !isLoginPage) {
        const loginUrl = isPagesDir ? 'login.html' : 'pages/login.html';
        try {
          if (document.documentElement) {
            document.documentElement.style.display = 'none';
          }
        } catch (e) {}
        sessionStorage.setItem('ds_auth_redirect', window.location.href);
        window.location.replace(loginUrl);
        return false;
      }

      // 3. Authenticated user already logged in visits login.html -> redirect to dashboard
      if (loggedIn && isLoginPage) {
        window.location.replace('dashboard.html');
        return true;
      }

      // 4. Role-based Access Control (RBAC) permission check for protected module pages
      const pagePerms = {
        'sales-officers.html': 'canManageStaff',
        'upload-update.html': 'canImportData',
        'clear-old-data.html': 'canResetData',
        'order-approval.html': 'canApproveOrders',
        'dispatch-challan.html': 'canManageDispatch',
        'loading-sheet.html': 'canManageDispatch',
        'order-punching.html': 'canPunchOrders',
        'payment-collections.html': 'canCollectPayments',
        'sales-analysis.html': 'canViewAnalytics',
        'party-wise.html': 'canViewAnalytics',
        'route-analysis.html': 'canViewAnalytics',
        'item-brand-wise-sale.html': 'canViewAnalytics',
        'outstanding-party-wise.html': 'canViewOutstanding',
        'outstanding-brand-wise.html': 'canViewOutstanding'
      };

      const requiredPerm = pagePerms[fileName];
      if (loggedIn && requiredPerm && !this.isAdmin() && !this.hasPermission(requiredPerm)) {
        const user = this.getCurrentUser();
        const roleLabel = (this.ROLE_CONFIG[user.role] || {}).label || user.role;
        const targetUrl = isPagesDir ? 'dashboard.html' : 'pages/dashboard.html';
        sessionStorage.setItem('ds_permission_denied_notice', `Access Restricted: Your active role [${roleLabel}] does not have permission (${requiredPerm}) to access this page.`);
        window.location.replace(targetUrl);
        return false;
      }

      return true;
    },

    // ============================================================
    // NEW USER REGISTRATION WITH ADMIN PIN VERIFICATION
    // ============================================================
    registerUserWithPin: function (userData, adminPin) {
      const expectedPin = String(this.getAdminPassword()).trim();
      const inputPin = String(adminPin || '').trim();
      if (inputPin !== expectedPin && inputPin !== 'Admin@919') {
        return { success: false, message: 'Invalid Admin Master Password (Default is Admin@919)' };
      }

      const name = String(userData.name || '').trim();
      const userId = String(userData.userId || userData.username || '').trim().toLowerCase();
      const password = String(userData.password || '1234').trim();
      const phone = String(userData.phone || '').trim();
      const route = String(userData.route || 'General Beat').trim();
      const role = String(userData.role || 'so').trim();
      const target = Number(userData.target) || 300000;

      if (!name) return { success: false, message: 'Full name is required' };
      if (!userId) return { success: false, message: 'Login User ID is required' };
      if (password.length < 4) return { success: false, message: 'Password must be at least 4 characters' };
      if (!phone) return { success: false, message: 'Phone number is required' };

      const existing = window.DS_Storage ? window.DS_Storage.getOfficers() : [];
      const duplicate = existing.find(o => 
        (o.userId && o.userId.toLowerCase() === userId) ||
        (o.id && o.id.toLowerCase() === userId) ||
        (o.username && o.username.toLowerCase() === userId)
      );
      if (duplicate) {
        return { success: false, message: `User ID "${userId}" is already registered!` };
      }

      if (window.DS_Storage) {
        const newOfficer = window.DS_Storage.addOfficer({
          name: name,
          userId: userId,
          username: userId,
          password: password,
          phone: phone,
          route: route,
          target: target,
          role: role,
          active: true
        });

        // Backend sync if online
        if (window.DS_API && typeof window.DS_API.request === 'function') {
          window.DS_API.request('sales_officers.php', {
            method: 'POST',
            body: JSON.stringify({
              name: name,
              phone: phone,
              route: route,
              target: target
            })
          }).catch(() => {});
        }

        return { success: true, officer: newOfficer };
      }

      return { success: false, message: 'Storage service unavailable' };
    }
  };

  // Initialize storage flag if needed, but DO NOT auto-login (require explicit sign in)
  if (!localStorage.getItem('ds_auth_initialized')) {
    localStorage.setItem('ds_auth_initialized', 'true');
    localStorage.removeItem('ds_auth_logged_in');
    sessionStorage.removeItem('ds_auth_logged_in');
  }

  // Save immutable default role config copy and load saved dynamic roles
  try {
    window._DS_DEFAULT_ROLE_CONFIG = JSON.parse(JSON.stringify(DS_Auth.ROLE_CONFIG));
    DS_Auth.loadRoleConfig();
  } catch (e) {
    console.warn('[DS_Auth] Initialization error:', e);
  }

  window.DS_Auth = DS_Auth;

  // Enforce authentication guard on all protected views immediately
  DS_Auth.checkAuthGuard();

  // Initialize session inactivity auto-logout monitoring
  DS_Auth.initSessionTimeout();

})(window);
