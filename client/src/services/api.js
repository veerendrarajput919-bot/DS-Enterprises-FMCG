// API Client with automatic JWT Token Header & Error Handling

const BASE_URL = '/api';

export const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = {
    ...options.headers
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }
    return data;
  } catch (err) {
    console.error(`[API Error] ${endpoint}:`, err);
    throw err;
  }
};

const toQueryString = (params) => {
  if (!params) return '';
  if (typeof params === 'string') return params ? `?${params}` : '';
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      q.append(k, v);
    }
  });
  const res = q.toString();
  return res ? `?${res}` : '';
};

export const api = {
  // Auth
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => request('/auth/me'),
  updateProfile: (profile) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(profile) }),

  // Dashboard Metrics
  getDashboardMetrics: (period = '30d') => request(`/dashboard/metrics?period=${period}`),

  // Sales Analytics & Filtering
  filterSales: (filters) => request('/sales/filter', { method: 'POST', body: JSON.stringify(filters) }),

  // Parties / Customers
  getParties: (params) => request(`/parties${toQueryString(params)}`),
  getPartyById: (id) => request(`/parties/${id}`),
  createParty: (party) => request('/parties', { method: 'POST', body: JSON.stringify(party) }),
  updateParty: (id, party) => request(`/parties/${id}`, { method: 'PUT', body: JSON.stringify(party) }),
  deleteParty: (id) => request(`/parties/${id}`, { method: 'DELETE' }),

  // Invoices & Bills
  getInvoices: (params) => request(`/invoices${toQueryString(params)}`),
  createInvoice: (invoice) => request('/invoices', { method: 'POST', body: JSON.stringify(invoice) }),
  payInvoice: (id, payment) => request(`/invoices/${id}/pay`, { method: 'POST', body: JSON.stringify(payment) }),

  // Payments / Collections
  getPayments: (params) => request(`/payments${toQueryString(params)}`),
  createPayment: (payment) => request('/payments', { method: 'POST', body: JSON.stringify(payment) }),

  // Inventory & Products
  getProducts: (params) => request(`/products${toQueryString(params)}`),
  getItemBrandMatrix: (params) => request(`/products/matrix${toQueryString(params)}`),
  createProduct: (product) => request('/products', { method: 'POST', body: JSON.stringify(product) }),
  updateProduct: (id, product) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(product) }),
  adjustStock: (id, adjustment) => request(`/products/${id}/adjust-stock`, { method: 'POST', body: JSON.stringify(adjustment) }),
  getStockTransactions: (params) => request(`/products/transactions${toQueryString(params)}`),
  getBrands: () => request('/products/brands'),
  createBrand: (brand) => request('/products/brands', { method: 'POST', body: JSON.stringify(brand) }),
  getCategories: () => request('/products/categories'),
  createCategory: (cat) => request('/products/categories', { method: 'POST', body: JSON.stringify(cat) }),

  // Purchases
  getPurchases: (params) => request(`/purchases${toQueryString(params)}`),
  createPurchase: (purchase) => request('/purchases', { method: 'POST', body: JSON.stringify(purchase) }),

  // Routes, Beats & Visits
  getRoutes: () => request('/routes'),
  getBeats: () => request('/routes/beats'),
  getStaff: () => request('/routes/staff'),
  assignStaff: (routeId, staffName) => request(`/routes/${routeId}/assign`, { method: 'POST', body: JSON.stringify({ staffName }) }),
  getVisits: (params) => request(`/routes/visits${toQueryString(params)}`),
  recordVisit: (visit) => request('/routes/visits', { method: 'POST', body: JSON.stringify(visit) }),

  // Excel / CSV Import Engine
  previewImport: (formData) => request('/import/preview', { method: 'POST', body: formData }),
  processImport: (payload) => request('/import/process', { method: 'POST', body: JSON.stringify(payload) }),

  // Reports
  getReportData: (reportType, params) => request(`/reports/${reportType}${toQueryString(params)}`),

  // Users & Roles
  getUsers: () => request('/users'),
  createUser: (user) => request('/users', { method: 'POST', body: JSON.stringify(user) }),
  updateUser: (id, user) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(user) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  getRoles: () => request('/users/roles'),
  updateRolePermissions: (roleName, permissions) => request(`/users/roles/${encodeURIComponent(roleName)}`, { method: 'PUT', body: JSON.stringify({ permissions }) }),

  // Settings
  getSettings: () => request('/settings'),
  updateSettings: (settings) => request('/settings', { method: 'PUT', body: JSON.stringify(settings) })
};

// Aliases for convenience
export const partyAPI = {
  getAll: (params) => api.getParties(params),
  getById: (id) => api.getPartyById(id),
  create: (p) => api.createParty(p),
  update: (id, p) => api.updateParty(id, p),
  delete: (id) => api.deleteParty(id)
};

export const productAPI = {
  getAll: (params) => api.getProducts(params),
  getMatrix: (params) => api.getItemBrandMatrix(params),
  create: (p) => api.createProduct(p),
  update: (id, p) => api.updateProduct(id, p),
  adjustStock: (id, a) => api.adjustStock(id, a),
  getStockTransactions: (params) => api.getStockTransactions(params),
  getBrands: () => api.getBrands(),
  createBrand: (b) => api.createBrand(b),
  getCategories: () => api.getCategories(),
  createCategory: (c) => api.createCategory(c)
};

export const invoiceAPI = {
  getAll: (params) => api.getInvoices(params),
  create: (inv) => api.createInvoice(inv),
  pay: (id, p) => api.payInvoice(id, p)
};

export const paymentAPI = {
  getAll: (params) => api.getPayments(params),
  create: (p) => api.createPayment(p)
};

export const purchaseAPI = {
  getAll: (params) => api.getPurchases(params),
  create: (p) => api.createPurchase(p)
};

export const userAPI = {
  getAll: () => api.getUsers(),
  create: (u) => api.createUser(u),
  update: (id, u) => api.updateUser(id, u),
  delete: (id) => api.deleteUser(id),
  getRoles: () => api.getRoles(),
  updateRolePermissions: (r, p) => api.updateRolePermissions(r, p)
};

export const settingsAPI = {
  get: () => api.getSettings(),
  update: (s) => api.updateSettings(s)
};
