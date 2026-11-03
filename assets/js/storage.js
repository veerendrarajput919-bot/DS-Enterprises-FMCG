/**
 * ==========================================================================
 * DS ENTERPRISES — UNIVERSAL STORAGE SERVICE (INDEXEDDB + MEMORY + LOCALSTORAGE)
 * File: assets/js/storage.js
 * Architecture: Hybrid Unlimited Storage Engine
 *   • IndexedDB as primary large-dataset store (eliminates 5MB quota errors)
 *   • In-Memory synchronous cache for high performance & instant reads
 *   • LocalStorage fallback for lightweight auth, metadata & officers
 * ==========================================================================
 */

(function (window) {
  'use strict';

  const STORAGE_KEYS = {
    DB: 'ds_fmcg_independent_test_v9',
    ORDERS: 'ds_enterprises_orders_v1',
    COLLECTIONS: 'ds_fmcg_collections_v1',
    OFFICERS: 'ds_sales_officers_list',
    ADMIN_PIN: 'ds_admin_pin',
    CURRENT_ROLE: 'ds_current_role',
    ACTIVE_ROLE: 'ds_active_role',
    ACTIVE_SO: 'ds_active_so_id',
    AUTH_LOGGED_IN: 'ds_auth_logged_in',
    SALES_PERSON: 'ds_current_sales_person',
    DELIVERY_ROUTES: 'ds_delivery_routes_v1',
    DELIVERY_ASSIGNMENTS: 'ds_delivery_assignments_v1',
    IMPORT_BATCHES: 'ds_import_batches_v1',
    NUMBER_SEQUENCES: 'ds_number_sequences_v1'
  };

  const IDB_NAME = 'ds_enterprises_fmcg_idb';
  const IDB_VERSION = 1;
  const IDB_STORE = 'app_data';
  const IDB_KEY_MAIN = 'ds_fmcg_db_main';

  function openIDB() {
    return new Promise((resolve) => {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      try {
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = function (e) {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = function (e) {
          resolve(e.target.result);
        };
        req.onerror = function () {
          resolve(null);
        };
      } catch (e) {
        resolve(null);
      }
    });
  }

  function idbGet(key) {
    return new Promise((resolve) => {
      openIDB().then(db => {
        if (!db) { resolve(null); return; }
        try {
          const tx = db.transaction(IDB_STORE, 'readonly');
          const store = tx.objectStore(IDB_STORE);
          const req = store.get(key);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch (e) {
          resolve(null);
        }
      }).catch(() => resolve(null));
    });
  }

  function idbSet(key, val) {
    return new Promise((resolve) => {
      openIDB().then(db => {
        if (!db) { resolve(false); return; }
        try {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          const store = tx.objectStore(IDB_STORE);
          const req = store.put(val, key);
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        } catch (e) {
          resolve(false);
        }
      }).catch(() => resolve(false));
    });
  }

  function idbRemove(key) {
    return new Promise((resolve) => {
      openIDB().then(db => {
        if (!db) { resolve(false); return; }
        try {
          const tx = db.transaction(IDB_STORE, 'readwrite');
          const store = tx.objectStore(IDB_STORE);
          const req = store.delete(key);
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        } catch (e) {
          resolve(false);
        }
      }).catch(() => resolve(false));
    });
  }

  // Built-in FMCG Sample Seed (Guarantees instant offline readiness)
  const SEED_OFFICERS = [
    {
      id: 'SO-101',
      name: 'Rahul Sharma',
      userId: 'rahul',
      password: '1234',
      phone: '9876543210',
      route: 'Civil Lines Beat',
      target: 350000,
      active: true,
      role: 'so',
      permissions: {
        canManageProducts: false,
        canAdjustStock: false,
        canViewMargins: false,
        canApproveOrders: false,
        canPunchOrders: true,
        canCollectPayments: true,
        canExportReports: true
      }
    },
    {
      id: 'IMS-201',
      name: 'Manoj Tiwari (Warehouse Lead)',
      userId: 'manoj',
      password: '1234',
      phone: '9876543299',
      route: 'Central Warehouse / IMS Hub',
      target: 0,
      active: true,
      role: 'ims_manager',
      permissions: {
        canManageProducts: true,
        canAdjustStock: true,
        canViewMargins: true,
        canApproveOrders: true,
        canPunchOrders: true,
        canCollectPayments: false,
        canExportReports: true
      }
    },
    {
      id: 'ACC-301',
      name: 'Priya Agarwal (Accounts)',
      userId: 'priya',
      password: '1234',
      phone: '9876543288',
      route: 'Accounts & Recovery Head',
      target: 500000,
      active: true,
      role: 'accounts',
      permissions: {
        canManageProducts: false,
        canAdjustStock: false,
        canViewMargins: true,
        canApproveOrders: true,
        canPunchOrders: false,
        canCollectPayments: true,
        canExportReports: true
      }
    },
    {
      id: 'SO-102',
      name: 'Amit Verma',
      userId: 'amit',
      password: '1234',
      phone: '9876543211',
      route: 'Govind Nagar Beat',
      target: 300000,
      active: true,
      role: 'so',
      permissions: {
        canManageProducts: false,
        canAdjustStock: false,
        canViewMargins: false,
        canApproveOrders: false,
        canPunchOrders: true,
        canCollectPayments: true,
        canExportReports: true
      }
    },
    {
      id: 'SO-103',
      name: 'Suresh Gupta',
      userId: 'suresh',
      password: '1234',
      phone: '9876543212',
      route: 'Kalyanpur Route',
      target: 280000,
      active: true,
      role: 'so',
      permissions: {
        canManageProducts: false,
        canAdjustStock: false,
        canViewMargins: false,
        canPunchOrders: true,
        canCollectPayments: true,
        canExportReports: true
      }
    },
    {
      id: 'DISP-401',
      name: 'Vikas Yadav (Logistics)',
      userId: 'vikas',
      password: '1234',
      phone: '9876543277',
      route: 'Fleet & Van Loading Hub',
      target: 0,
      active: true,
      role: 'dispatcher',
      permissions: {
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
    {
      id: 'BILL-501',
      name: 'Neha Rastogi (Billing)',
      userId: 'neha',
      password: '1234',
      phone: '9876543266',
      route: 'Central Billing & Cash Desk',
      target: 0,
      active: true,
      role: 'billing_operator',
      permissions: {
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
    {
      id: 'AUD-601',
      name: 'Sanjay Saxena (Auditor)',
      userId: 'auditor',
      password: '1234',
      phone: '9876543255',
      route: 'Internal Audit & Inspection',
      target: 0,
      active: true,
      role: 'viewer',
      permissions: {
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
  ];

  const SEED_PARTIES = [
    { id: 'P001', name: 'Shri Ram Kirana Store', contact: 'Ram Prakash', phone: '9839011221', route: 'Civil Lines Beat', address: '14/12 Civil Lines', category: 'A - Super Mart', subCategory: 'Supermarket / Dept Store', creditLimit: 75000, outstanding: 24500, city: 'Kanpur', city1: 'Kanpur' },
    { id: 'P002', name: 'Gupta General Store', contact: 'Manoj Gupta', phone: '9839022332', route: 'Govind Nagar Beat', address: 'Shop 4 Govind Nagar Mkt', category: 'B - Retail Kirana', subCategory: 'Provision & General Kirana', creditLimit: 50000, outstanding: 18200, city: 'Kanpur', city1: 'Kanpur' },
    { id: 'P003', name: 'Kanpur Provision Mart', contact: 'Sunil Kumar', phone: '9839033443', route: 'Swaroop Nagar Kirana', address: 'Plot 8 Swaroop Nagar', category: 'A - Super Mart', subCategory: 'Supermarket / Dept Store', creditLimit: 100000, outstanding: 45000, city: 'Kanpur', city1: 'Kanpur' },
    { id: 'P004', name: 'Radhey Radhey Traders', contact: 'Gopal Ji', phone: '9839044554', route: 'Kalyanpur Route', address: 'Near Kalyanpur Crossing', category: 'B - Retail Kirana', subCategory: 'Provision & General Kirana', creditLimit: 40000, outstanding: 12800, city: 'Kanpur', city1: 'Kanpur' },
    { id: 'P005', name: 'Bajpai Brothers Daily Needs', contact: 'Ashok Bajpai', phone: '9839055665', route: 'Panki Industrial Beat', address: 'Panki Site 2', category: 'C - Small Kiosk', subCategory: 'Paan Kiosk / Booth', creditLimit: 25000, outstanding: 6400, city: 'Kanpur', city1: 'Kanpur' },
    { id: 'P006', name: 'New Bharat Kirana Bhandar', contact: 'Mahesh Sharma', phone: '9839066776', route: 'Shuklaganj Route', address: 'Old Ganga Bridge Shuklaganj', category: 'B - Retail Kirana', subCategory: 'Provision & General Kirana', creditLimit: 60000, outstanding: 21900, city: 'Kanpur', city1: 'Kanpur' },
    { id: 'P007', name: 'Maa Vaishno Departmental Store', contact: 'Vinod Tiwari', phone: '9839077887', route: 'Civil Lines Beat', address: 'Mall Road Crossing', category: 'A - Super Mart', subCategory: 'Supermarket / Dept Store', creditLimit: 90000, outstanding: 33500, city: 'Kanpur', city1: 'Kanpur' },
    { id: 'P008', name: 'Krishna Store & Bakery', contact: 'Radha Krishna', phone: '9839088998', route: 'Govind Nagar Beat', address: 'Block 7 Govind Nagar', category: 'B - Retail Kirana', subCategory: 'Provision & General Kirana', creditLimit: 45000, outstanding: 15300, city: 'Kanpur', city1: 'Kanpur' },
    { id: 'P009', name: 'Awadh Super Mart', contact: 'Deepak Saxena', phone: '9839099009', route: 'Swaroop Nagar Kirana', address: 'Arya Nagar Chowk', category: 'A - Super Mart', subCategory: 'Supermarket / Dept Store', creditLimit: 120000, outstanding: 52000, city: 'Kanpur', city1: 'Kanpur' },
    { id: 'P010', name: 'Kalyan Mini Supermarket', contact: 'Ramesh Yadav', phone: '9839012345', route: 'Kalyanpur Route', address: 'IIT Road Kalyanpur', category: 'A - Super Mart', subCategory: 'Supermarket / Dept Store', creditLimit: 85000, outstanding: 29400, city: 'Kanpur', city1: 'Kanpur' },
    { id: 'P011', name: 'Sharma Daily Needs', contact: 'Anand Sharma', phone: '9826011221', route: 'Hoshangabad Main Road Beat', address: 'Main Market Hoshangabad', category: 'B - Retail Kirana', subCategory: 'Provision & General Kirana', creditLimit: 55000, outstanding: 14200, city: 'Narmadapuram', city1: 'Narmadapuram' },
    { id: 'P012', name: 'Narmada Valley Super Mart', contact: 'Rajesh Patel', phone: '9826022332', route: 'Rasulia Market Beat', address: 'Rasulia Bypass Narmadapuram', category: 'A - Super Mart', subCategory: 'Supermarket / Dept Store', creditLimit: 95000, outstanding: 31000, city: 'Narmadapuram', city1: 'Narmadapuram' },
    { id: 'P013', name: 'Itarsi Junction Provision Store', contact: 'Mohan Lal', phone: '9826033443', route: 'Overbridge Main Road Beat', address: 'Station Road Itarsi', category: 'B - Retail Kirana', subCategory: 'Provision & General Kirana', creditLimit: 48000, outstanding: 16500, city: 'Itarsi', city1: 'Itarsi' },
    { id: 'P014', name: 'Basti General & Daily Needs', contact: 'Santosh Malviya', phone: '9826044554', route: 'Purani Basti Beat', address: 'Purani Basti Itarsi', category: 'C - Small Kiosk', subCategory: 'Paan Kiosk / Booth', creditLimit: 20000, outstanding: 5400, city: 'Itarsi', city1: 'Itarsi' },
    { id: 'P015', name: 'Bhopal City Mega Mart', contact: 'Alok Saxena', phone: '9826055665', route: 'MP Nagar Zone-II Beat', address: 'Zone II MP Nagar Bhopal', category: 'A - Super Mart', subCategory: 'Supermarket / Dept Store', creditLimit: 130000, outstanding: 58000, city: 'Bhopal', city1: 'Bhopal' },
    { id: 'P016', name: 'New Market Kirana Emporium', contact: 'Jitendra Jain', phone: '9826066776', route: 'New Market TT Nagar Beat', address: 'Top-N-Town Lane TT Nagar Bhopal', category: 'B - Retail Kirana', subCategory: 'Provision & General Kirana', creditLimit: 65000, outstanding: 22800, city: 'Bhopal', city1: 'Bhopal' }
  ];

  const SEED_STOCK = [
    { code: 'SKU-001', name: 'Parle-G Gold Biscuits 100g (Pkt)', brand: 'Parle', category: 'Biscuits & Bakery', subCategory: 'Glucose Biscuits', 'Sub Category Name': 'Glucose Biscuits', purchasePrice: 10.50, 'Purchase Price': 10.50, rate: 12.50, 'Selling Price': 12.50, mrp: 15.00, MRP: 15.00, stock: 450, 'Stock Quantity': 450, unit: 'Pkt', minStock: 100, 'Firm Name': 'Parle Products', image: 'assets/images/products/parle_g.jpg' },
    { code: 'SKU-002', name: 'Britannia Good Day Butter 200g', brand: 'Britannia', category: 'Biscuits & Bakery', subCategory: 'Butter Cookies', 'Sub Category Name': 'Butter Cookies', purchasePrice: 26.50, 'Purchase Price': 26.50, rate: 32.00, 'Selling Price': 32.00, mrp: 40.00, MRP: 40.00, stock: 320, 'Stock Quantity': 320, unit: 'Pkt', minStock: 80, 'Firm Name': 'Britannia Ind', image: 'assets/images/products/good_day.jpg' },
    { code: 'SKU-003', name: 'Tata Tea Gold Leaf 500g', brand: 'Tata Consumer', category: 'Beverages', subCategory: 'Tea Leaf', 'Sub Category Name': 'Tea Leaf', purchasePrice: 220.00, 'Purchase Price': 220.00, rate: 260.00, 'Selling Price': 260.00, mrp: 310.00, MRP: 310.00, stock: 180, 'Stock Quantity': 180, unit: 'Pkt', minStock: 50, 'Firm Name': 'Tata Consumer', image: 'assets/images/products/tata_tea.jpg' },
    { code: 'SKU-004', name: 'Fortune Sunlite Refined Oil 1L Pouch', brand: 'Fortune Oil', category: 'Edible Oils', subCategory: 'Refined Sunflower Oil', 'Sub Category Name': 'Refined Sunflower Oil', purchasePrice: 108.00, 'Purchase Price': 108.00, rate: 125.00, 'Selling Price': 125.00, mrp: 145.00, MRP: 145.00, stock: 550, 'Stock Quantity': 550, unit: 'Pouch', minStock: 150, 'Firm Name': 'Adani Wilmar', image: 'assets/images/products/fortune_oil.jpg' },
    { code: 'SKU-005', name: 'Surf Excel Quick Wash 1kg', brand: 'Hindustan Unilever', category: 'Detergent & Homecare', subCategory: 'Detergent Powder', 'Sub Category Name': 'Detergent Powder', purchasePrice: 118.00, 'Purchase Price': 118.00, rate: 140.00, 'Selling Price': 140.00, mrp: 165.00, MRP: 165.00, stock: 210, 'Stock Quantity': 210, unit: 'Pkt', minStock: 60, 'Firm Name': 'HUL', image: 'assets/images/products/surf_excel.jpg' },
    { code: 'SKU-006', name: 'Lifebuoy Total Soap 125g (Pack of 4)', brand: 'Hindustan Unilever', category: 'Personal Care', subCategory: 'Bath Soap', 'Sub Category Name': 'Bath Soap', purchasePrice: 76.00, 'Purchase Price': 76.00, rate: 92.00, 'Selling Price': 92.00, mrp: 110.00, MRP: 110.00, stock: 280, 'Stock Quantity': 280, unit: 'Pack', minStock: 75, 'Firm Name': 'HUL', image: 'assets/images/products/lifebuoy_soap.jpg' },
    { code: 'SKU-007', name: 'Aashirvaad Shudh Chakki Atta 10kg', brand: 'ITC Sunfeast', category: 'Staples & Flour', subCategory: 'Wheat Flour / Atta', 'Sub Category Name': 'Wheat Flour / Atta', purchasePrice: 355.00, 'Purchase Price': 355.00, rate: 410.00, 'Selling Price': 410.00, mrp: 470.00, MRP: 470.00, stock: 140, 'Stock Quantity': 140, unit: 'Bag', minStock: 40, 'Firm Name': 'ITC Ltd', image: 'assets/images/products/aashirvaad_atta.jpg' },
    { code: 'SKU-008', name: 'Sunfeast Dark Fantasy Choco Fills 75g', brand: 'ITC Sunfeast', category: 'Biscuits & Bakery', subCategory: 'Choco Fills', 'Sub Category Name': 'Choco Fills', purchasePrice: 27.00, 'Purchase Price': 27.00, rate: 34.00, 'Selling Price': 34.00, mrp: 40.00, MRP: 40.00, stock: 260, 'Stock Quantity': 260, unit: 'Pkt', minStock: 80, 'Firm Name': 'ITC Ltd', image: 'assets/images/products/dark_fantasy.jpg' },
    { code: 'SKU-009', name: 'Maggi 2-Minute Masala Noodles 70g (24pk Case)', brand: 'Nestle', category: 'Instant Food', subCategory: 'Instant Noodles', 'Sub Category Name': 'Instant Noodles', purchasePrice: 265.00, 'Purchase Price': 265.00, rate: 310.00, 'Selling Price': 310.00, mrp: 360.00, MRP: 360.00, stock: 95, 'Stock Quantity': 95, unit: 'Case', minStock: 30, 'Firm Name': 'Nestle India', image: 'assets/images/products/maggi.jpg' },
    { code: 'SKU-010', name: 'Dabur Red Toothpaste 150g', brand: 'Dabur', category: 'Oral Care', subCategory: 'Toothpaste', 'Sub Category Name': 'Toothpaste', purchasePrice: 62.00, 'Purchase Price': 62.00, rate: 78.00, 'Selling Price': 78.00, mrp: 95.00, MRP: 95.00, stock: 190, 'Stock Quantity': 190, unit: 'Pcs', minStock: 50, 'Firm Name': 'Dabur India', image: 'assets/images/products/dabur_red.jpg' },
    { code: 'SKU-011', name: 'Dabur Real Mixed Fruit Juice 1L', brand: 'Dabur', category: 'Beverages', subCategory: 'Fruit Juices', 'Sub Category Name': 'Fruit Juices', purchasePrice: 78.00, 'Purchase Price': 78.00, rate: 95.00, 'Selling Price': 95.00, mrp: 120.00, MRP: 120.00, stock: 140, 'Stock Quantity': 140, unit: 'Tetra', minStock: 40, 'Firm Name': 'Dabur India', image: 'assets/images/products/real_juice.jpg' },
    { code: 'SKU-012', name: 'Godrej No. 1 Sandal Soap 100g (Pack of 5)', brand: 'Godrej Consumer', category: 'Personal Care', subCategory: 'Bath Soap', 'Sub Category Name': 'Bath Soap', purchasePrice: 68.00, 'Purchase Price': 68.00, rate: 85.00, 'Selling Price': 85.00, mrp: 105.00, MRP: 105.00, stock: 210, 'Stock Quantity': 210, unit: 'Pack', minStock: 60, 'Firm Name': 'Godrej', image: 'assets/images/products/godrej_soap.jpg' },
    { code: 'SKU-013', name: 'Goodknight Gold Flash Mosquito Refill', brand: 'Godrej Consumer', category: 'Home Pest Control', subCategory: 'Mosquito Liquid Vaporizer', 'Sub Category Name': 'Mosquito Liquid Vaporizer', purchasePrice: 54.00, 'Purchase Price': 54.00, rate: 68.00, 'Selling Price': 68.00, mrp: 85.00, MRP: 85.00, stock: 185, 'Stock Quantity': 185, unit: 'Pcs', minStock: 45, 'Firm Name': 'Godrej', image: 'assets/images/products/goodknight.jpg' },
    { code: 'SKU-014', name: 'Amul Butter 500g Pasteurised', brand: 'Amul', category: 'Dairy & Spreads', subCategory: 'Table Butter', 'Sub Category Name': 'Table Butter', purchasePrice: 212.00, 'Purchase Price': 212.00, rate: 245.00, 'Selling Price': 245.00, mrp: 275.00, MRP: 275.00, stock: 90, 'Stock Quantity': 90, unit: 'Brick', minStock: 30, 'Firm Name': 'GCMMF Amul', image: 'assets/images/products/amul_butter.jpg' }
  ];

  const SEED_DELIVERY_ROUTES = [
    { id: 'RT-NORTH', name: 'Civil Lines & Swaroop Nagar Beat', area: 'North Kanpur', default_delivery_person: 'Rahul Sharma (SO-101)', is_active: 1 },
    { id: 'RT-SOUTH', name: 'Govind Nagar & Kidwai Nagar Beat', area: 'South Kanpur', default_delivery_person: 'Amit Verma (SO-102)', is_active: 1 },
    { id: 'RT-WEST', name: 'Kalyanpur & IIT Beat', area: 'West Kanpur', default_delivery_person: 'Suresh Kumar (SO-103)', is_active: 1 },
    { id: 'RT-COMM', name: 'Birhana Road Wholesale Market', area: 'Commercial Hub', default_delivery_person: 'Vikas Pandey (SO-104)', is_active: 1 },
    { id: 'RT-IND', name: 'Panki Industrial & Retail Beat', area: 'Panki Outer', default_delivery_person: 'Manoj Singh (SO-105)', is_active: 1 }
  ];

  function getPastDate(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d.toISOString().split('T')[0];
  }

  function generateSeedSalesAndUnpaid() {
    const sales = [];
    const unpaid = [];
    for (let i = 0; i < 40; i++) {
      const party = SEED_PARTIES[i % SEED_PARTIES.length];
      const item = SEED_STOCK[i % SEED_STOCK.length];
      const so = SEED_OFFICERS[i % SEED_OFFICERS.length];
      const daysAgo = Math.floor(i / 1.5);
      const date = getPastDate(daysAgo);
      const qty = 12 + ((i * 5) % 35);
      const rate = item.rate;
      const amount = Math.round(qty * rate * 100) / 100;
      const invNo = `INV-2026-${1000 + i}`;
      const billNo = `BILL-2026-${1000 + i}`;

      sales.push({
        Date: date,
        date: date,
        'Bill No.': billNo,
        billNo: billNo,
        bill_no: billNo,
        'Invoice No.': invNo,
        invoiceNo: invNo,
        invoice_no: invNo,
        'Party Name': party.name,
        party: party.name,
        partyContact: party.phone,
        'Item Name': item.name,
        item: item.name,
        Brand: item.brand,
        brand: item.brand,
        Category: item.category,
        category: item.category,
        subCategory: item.subCategory || party.subCategory || 'General',
        'Sub Category': item.subCategory || party.subCategory || 'General',
        sub_category: item.subCategory || party.subCategory || 'General',
        'Party Sub Category': party.subCategory || 'General',
        partySubCategory: party.subCategory || 'General',
        'Item Sub Category': item.subCategory || 'General',
        itemSubCategory: item.subCategory || 'General',
        Route: party.route,
        route: party.route,
        City: 'Kanpur',
        city: 'Kanpur',
        City_1: 'Kanpur',
        city1: 'Kanpur',
        'Party Category': party.category,
        partyCategory: party.category,
        Quantity: String(qty),
        QtyNum: qty,
        qty: qty,
        PriceNum: rate,
        rate: rate,
        AmountNum: amount,
        amount: amount,
        Margin: Math.round(amount * 0.15 * 100) / 100,
        MarginPct: 15.0,
        Status: (i % 3 === 0) ? 'Unpaid' : 'Paid',
        status: (i % 3 === 0) ? 'Unpaid' : 'Paid',
        salesPerson: so.name,
        soId: so.id
      });

      if (i % 3 === 0) {
        const age = daysAgo + 6;
        unpaid.push({
          invoice: invNo,
          billNo: billNo,
          bill_no: billNo,
          invoiceNo: invNo,
          invoice_no: invNo,
          date: date,
          party: party.name,
          route: party.route,
          phone: party.phone,
          amount: amount,
          totalAmount: amount,
          balanceAmount: Math.round(amount * 0.7 * 100) / 100,
          dueDays: age,
          ageBucket: age > 60 ? '60+ Days' : age > 30 ? '31-60 Days' : age > 15 ? '16-30 Days' : '0-15 Days',
          status: 'Unpaid',
          salesPerson: so.name
        });
      }
    }
    return { sales, unpaid };
  }

  function generateSeedOrders() {
    const orders = [];
    const statuses = ['Submitted', 'Approved', 'Dispatched', 'Delivered'];
    for (let j = 0; j < 10; j++) {
      const party = SEED_PARTIES[j % SEED_PARTIES.length];
      const so = SEED_OFFICERS[j % SEED_OFFICERS.length];
      const date = getPastDate(j);
      const it1 = SEED_STOCK[j % SEED_STOCK.length];
      const it2 = SEED_STOCK[(j + 2) % SEED_STOCK.length];
      const q1 = 15;
      const q2 = 10;
      const total = Math.round((q1 * it1.rate + q2 * it2.rate) * 100) / 100;
      const orderId = `ORD-2026-${5001 + j}`;
      const billNo = `BILL-2026-${String(j + 1).padStart(4, '0')}`;
      const invoiceNo = `INV-2026-${String(j + 1).padStart(4, '0')}`;

      let status = statuses[j % statuses.length];
      let cancelType = null;
      let cancelReason = null;
      let cancelRemark = null;
      let cancelledBy = null;
      let cancelledAt = null;

      if (j === 4) {
        status = 'Cancelled by Customer';
        cancelType = 'party';
        cancelReason = 'Grahak / Store ne delivery lene se mana kar diya (Party Refused)';
        cancelRemark = 'Dukaan par pehle se stock tha, lene se inkaar kar diya.';
        cancelledBy = so.name;
        cancelledAt = `${date} 14:15:00`;
      } else if (j === 5) {
        status = 'Cancelled by Company/Admin';
        cancelType = 'own';
        cancelReason = 'Warehouse me stock khatam / Out of Stock shortage';
        cancelRemark = 'Fortune Oil 1L ka stock warehouse me uplabdh nahi tha.';
        cancelledBy = 'Admin';
        cancelledAt = `${date} 16:45:00`;
      }

      orders.push({
        id: orderId,
        orderId: orderId,
        bill_no: billNo,
        billNo: billNo,
        invoice_no: invoiceNo,
        invoiceNo: invoiceNo,
        date: date,
        dateTime: `${date} 11:00:00`,
        storeName: party.name,
        party: party.name,
        location: party.address,
        city: 'Kanpur',
        city1: 'Kanpur',
        route: party.route,
        category: party.category,
        givenName: party.contact,
        givenContact: party.phone,
        salesPerson: so.name,
        items: [
          { name: it1.name, brand: it1.brand, qty: q1, price: it1.rate, unit: it1.unit, total: q1 * it1.rate },
          { name: it2.name, brand: it2.brand, qty: q2, price: it2.rate, unit: it2.unit, total: q2 * it2.rate }
        ],
        total: total,
        qty: q1 + q2,
        status: status,
        cancelType: cancelType,
        cancelReason: cancelReason,
        cancelRemark: cancelRemark,
        cancelledBy: cancelledBy,
        cancelledAt: cancelledAt,
        payment: status === 'Delivered' ? 'Paid' : 'Unpaid'
      });
    }
    return orders;
  }

  function generateSeedCollections() {
    const colls = [];
    const modes = ['Cash', 'UPI', 'Cheque'];
    for (let k = 0; k < 6; k++) {
      const party = SEED_PARTIES[k % SEED_PARTIES.length];
      const so = SEED_OFFICERS[k % SEED_OFFICERS.length];
      colls.push({
        id: `REC-2026-${3001 + k}`,
        date: getPastDate(k * 2),
        time: '14:30',
        party: party.name,
        phone: party.phone,
        route: party.route,
        amount: 5000 + k * 2000,
        paymentMode: modes[k % modes.length],
        referenceNo: `REF-${9001 + k}`,
        collectedBy: so.name,
        remarks: 'Direct field recovery'
      });
    }
    return colls;
  }

  const DS_Storage = {
    KEYS: STORAGE_KEYS,
    _memoryDB: null,

    init: function () {
      // 1. Try fast synchronous load from localStorage
      if (!this._memoryDB) {
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.DB);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.stock) && parsed.stock.length > 0) {
              this._migrateStockImages(parsed);
              this._memoryDB = parsed;
              window.DB = parsed;
            }
          }
        } catch (e) {}
      }

      // 2. Asynchronously load from IndexedDB (Unlimited quota)
      idbGet(IDB_KEY_MAIN).then(idbData => {
        if (idbData && typeof idbData === 'object' && Array.isArray(idbData.stock) && idbData.stock.length > 0) {
          const updated = this._migrateStockImages(idbData);
          this._memoryDB = idbData;
          window.DB = idbData;
          if (updated) this.saveDB(idbData);
          window.dispatchEvent(new CustomEvent('ds:db-updated', { detail: idbData }));
        } else if (!this._memoryDB || !Array.isArray(this._memoryDB.stock) || this._memoryDB.stock.length === 0) {
          this.seedSampleData();
          window.dispatchEvent(new CustomEvent('ds:db-updated', { detail: this._memoryDB }));
        }
      });

      // 3. Fallback to seed only if still completely unseeded
      if (!this._memoryDB || !Array.isArray(this._memoryDB.stock) || this._memoryDB.stock.length === 0) {
        this.seedSampleData();
      } else {
        this._migrateStockImages(this._memoryDB);
        window.DB = this._memoryDB;
      }

      // Ensure officers list exists
      if (!localStorage.getItem(STORAGE_KEYS.OFFICERS)) {
        this.saveOfficers(SEED_OFFICERS);
      }
    },

    seedSampleData: function () {
      const generated = generateSeedSalesAndUnpaid();
      const seedDB = {
        sales: generated.sales,
        unpaid: generated.unpaid,
        stock: SEED_STOCK,
        party: SEED_PARTIES,
        meta: { source: 'DS Enterprises Demo Seed V4', updatedAt: new Date().toISOString() }
      };
      this._memoryDB = seedDB;
      window.DB = seedDB;
      this.saveDB(seedDB);
      this.saveOrders(generateSeedOrders());
      this.saveCollections(generateSeedCollections());
      this.saveOfficers(SEED_OFFICERS);
      const existingPin = localStorage.getItem(STORAGE_KEYS.ADMIN_PIN);
      if (!existingPin || existingPin === '1234') {
        localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, 'Admin@919');
      }
      return seedDB;
    },

    resetToFactory: async function () {
      try {
        localStorage.removeItem(STORAGE_KEYS.DB);
        localStorage.removeItem(STORAGE_KEYS.ORDERS);
        localStorage.removeItem(STORAGE_KEYS.COLLECTIONS);
        this._memoryDB = null;
        window.DB = null;
        const seedDB = this.seedSampleData();
        await idbSet(IDB_KEY_MAIN, seedDB);
        window.dispatchEvent(new CustomEvent('ds:db-updated', { detail: seedDB }));
        return seedDB;
      } catch (e) {
        return this.seedSampleData();
      }
    },

    _migrateStockImages: function (db) {
      if (!db || !Array.isArray(db.stock)) return false;
      const dedicatedMap = {
        'SKU-001': 'assets/images/products/parle_g.jpg',
        'SKU-002': 'assets/images/products/good_day.jpg',
        'SKU-003': 'assets/images/products/tata_tea.jpg',
        'SKU-004': 'assets/images/products/fortune_oil.jpg',
        'SKU-005': 'assets/images/products/surf_excel.jpg',
        'SKU-006': 'assets/images/products/lifebuoy_soap.jpg',
        'SKU-007': 'assets/images/products/aashirvaad_atta.jpg',
        'SKU-008': 'assets/images/products/dark_fantasy.jpg',
        'SKU-009': 'assets/images/products/maggi.jpg',
        'SKU-010': 'assets/images/products/dabur_red.jpg',
        'SKU-011': 'assets/images/products/real_juice.jpg',
        'SKU-012': 'assets/images/products/godrej_soap.jpg',
        'SKU-013': 'assets/images/products/goodknight.jpg',
        'SKU-014': 'assets/images/products/amul_butter.jpg'
      };
      let changed = false;
      db.stock.forEach(item => {
        const code = item.code || item['Item Code'];
        if (dedicatedMap[code] && item.image !== dedicatedMap[code]) {
          item.image = dedicatedMap[code];
          changed = true;
        }
      });
      if (this._migrateSubCategories(db)) changed = true;
      return changed;
    },

    _migrateSubCategories: function (db) {
      if (!db) return false;
      let changed = false;
      const subCatMap = {
        'Parle-G': 'Glucose Biscuits',
        'Good Day': 'Butter Cookies',
        'Tata Tea': 'Tea Leaf',
        'Fortune': 'Refined Sunflower Oil',
        'Surf Excel': 'Detergent Powder',
        'Lifebuoy': 'Bath Soap',
        'Aashirvaad': 'Wheat Flour / Atta',
        'Dark Fantasy': 'Choco Fills',
        'Maggi': 'Instant Noodles',
        'Dabur Red': 'Toothpaste',
        'Real': 'Fruit Juices',
        'Godrej': 'Bath Soap',
        'Goodknight': 'Mosquito Liquid Vaporizer',
        'Amul': 'Table Butter'
      };

      if (Array.isArray(db.stock)) {
        db.stock.forEach(item => {
          if (!item.subCategory || !item['Sub Category Name']) {
            let found = 'General';
            for (const [k, v] of Object.entries(subCatMap)) {
              if ((item.name || '').includes(k) || (item.brand || '').includes(k)) {
                found = v;
                break;
              }
            }
            item.subCategory = item.subCategory || found;
            item['Sub Category Name'] = item['Sub Category Name'] || found;
            changed = true;
          }
        });
      }

      if (Array.isArray(db.party)) {
        db.party.forEach(p => {
          if (!p.subCategory) {
            const cat = String(p.category || '');
            if (cat.includes('A')) p.subCategory = 'Supermarket / Dept Store';
            else if (cat.includes('B')) p.subCategory = 'Provision & General Kirana';
            else if (cat.includes('C')) p.subCategory = 'Paan Kiosk / Booth';
            else p.subCategory = 'Retail Kirana';
            changed = true;
          }
        });
      }

      if (Array.isArray(db.sales)) {
        db.sales.forEach(s => {
          if (!s.subCategory && !s['Sub Category']) {
            const pSub = s['Party Sub Category'] || s.partySubCategory;
            const iSub = s['Item Sub Category'] || s.itemSubCategory;
            s.subCategory = iSub || pSub || (s['Party Category'] ? 'Provision & General Kirana' : 'General');
            s['Sub Category'] = s.subCategory;
            changed = true;
          }
        });
      }
      return changed;
    },

    getDB: function () {
      if (this._memoryDB && typeof this._memoryDB === 'object' && Array.isArray(this._memoryDB.stock) && this._memoryDB.stock.length > 0) {
        this._migrateStockImages(this._memoryDB);
        return this._memoryDB;
      }
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.DB);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && Array.isArray(parsed.stock) && parsed.stock.length > 0) {
            this._migrateStockImages(parsed);
            this._memoryDB = parsed;
            window.DB = parsed;
            return parsed;
          }
        }
      } catch (e) {}
      return this.seedSampleData();
    },

    saveDB: function (db) {
      const clean = {
        sales: Array.isArray(db.sales) ? db.sales : [],
        unpaid: Array.isArray(db.unpaid) ? db.unpaid : [],
        stock: Array.isArray(db.stock) ? db.stock : [],
        party: Array.isArray(db.party) ? db.party : [],
        meta: db.meta || { updatedAt: new Date().toISOString() }
      };

      // 1. Immediately update memory cache
      this._memoryDB = clean;
      window.DB = clean;

      // 2. Persist to IndexedDB (No 5MB limit!)
      idbSet(IDB_KEY_MAIN, clean);

      // 3. Safely attempt localStorage write; catch and absorb QuotaExceededError
      try {
        localStorage.setItem(STORAGE_KEYS.DB, JSON.stringify(clean));
      } catch (quotaErr) {
        console.warn('[DS_Storage] LocalStorage 5MB quota exceeded. Dataset safely stored in IndexedDB without limit.');
        try {
          localStorage.removeItem(STORAGE_KEYS.DB);
          localStorage.setItem(STORAGE_KEYS.DB + '_stored_in_idb', 'true');
        } catch (_) {}
      }

      window.dispatchEvent(new CustomEvent('ds:db-updated', { detail: clean }));
      return clean;
    },

    saveDBAsync: async function (db) {
      const clean = this.saveDB(db);
      await idbSet(IDB_KEY_MAIN, clean);
      return clean;
    },

    getOrders: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
        const list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) return [];
        const seen = new Set();
        const clean = [];
        let modified = false;
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          if (item && item.id) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              // Ensure unified invoice and bill number (single, shared standard)
              const unifiedNo = item.invoice_no || item.invoiceNo || item.bill_no || item.billNo || (function () {
                const numPart = String(item.id).replace(/\D/g, '').slice(-4).padStart(4, '0') || String(i + 1).padStart(4, '0');
                const yr = item.date ? item.date.slice(0, 4) : '2026';
                return `INV-${yr}-${numPart}`;
              })();
              item.invoice_no = unifiedNo;
              item.invoiceNo = unifiedNo;
              item['Invoice No.'] = unifiedNo;
              item.bill_no = unifiedNo;
              item.billNo = unifiedNo;
              item['Bill No.'] = unifiedNo;
              modified = true;

              clean.push(item);
            }
          } else if (item) {
            clean.push(item);
          }
        }
        if (modified || clean.length !== list.length) {
          try {
            localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(clean));
          } catch (e) {}
        }
        return clean;
      } catch (e) {
        return [];
      }
    },

    saveOrders: function (orders) {
      const list = Array.isArray(orders) ? orders : [];
      const seen = new Set();
      const clean = [];
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (item && item.id) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            // Ensure unified invoice and bill number (single, shared standard)
            const unifiedNo = item.invoice_no || item.invoiceNo || item.bill_no || item.billNo || (function () {
              const numPart = String(item.id).replace(/\D/g, '').slice(-4).padStart(4, '0') || String(i + 1).padStart(4, '0');
              const yr = item.date ? item.date.slice(0, 4) : '2026';
              return `INV-${yr}-${numPart}`;
            })();
            item.invoice_no = unifiedNo;
            item.invoiceNo = unifiedNo;
            item['Invoice No.'] = unifiedNo;
            item.bill_no = unifiedNo;
            item.billNo = unifiedNo;
            item['Bill No.'] = unifiedNo;

            clean.push(item);
          }
        } else if (item) {
          clean.push(item);
        }
      }
      try {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(clean));
      } catch (e) {
        console.warn('[DS_Storage] Could not save orders to localStorage:', e);
      }
      return clean;
    },

    getCollections: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.COLLECTIONS);
        const list = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(list)) return [];
        const seen = new Set();
        const clean = [];
        for (const item of list) {
          if (item && item.id) {
            if (!seen.has(item.id)) {
              seen.add(item.id);
              clean.push(item);
            }
          } else if (item) {
            clean.push(item);
          }
        }
        if (clean.length !== list.length) {
          try {
            localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(clean));
          } catch (e) {}
        }
        return clean;
      } catch (e) {
        return [];
      }
    },

    saveCollections: function (colls) {
      const list = Array.isArray(colls) ? colls : [];
      const seen = new Set();
      const clean = [];
      for (const item of list) {
        if (item && item.id) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            clean.push(item);
          }
        } else if (item) {
          clean.push(item);
        }
      }
      try {
        localStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(clean));
      } catch (e) {
        console.warn('[DS_Storage] Could not save collections to localStorage:', e);
      }
      return clean;
    },

    // ============================================================
    // PRODUCT & IMS INVENTORY CRUD CONTROLLER
    // ============================================================
    resolveImagePath: function (imgPath) {
      if (!imgPath || typeof imgPath !== 'string') return '';
      if (imgPath.startsWith('data:') || imgPath.startsWith('http://') || imgPath.startsWith('https://')) {
        return imgPath;
      }
      const isPages = typeof window !== 'undefined' && window.location.pathname.includes('/pages/');
      if (isPages) {
        if (imgPath.startsWith('../')) return imgPath;
        if (imgPath.startsWith('assets/')) return '../' + imgPath;
      } else {
        if (imgPath.startsWith('../assets/')) return imgPath.replace(/^\.\.\//, '');
      }
      return imgPath;
    },

    addProduct: function (productData) {
      const db = this.getDB();
      const stock = Array.isArray(db.stock) ? db.stock : [];
      const newCode = productData.code || ('SKU-' + String(stock.length + 1).padStart(3, '0'));
      
      const newProd = {
        code: newCode,
        'Item Code': newCode,
        Name: String(productData.name || '').trim(),
        name: String(productData.name || '').trim(),
        Brand: String(productData.brand || 'General').trim(),
        brand: String(productData.brand || 'General').trim(),
        'Item Category Name': String(productData.category || 'General').trim(),
        category: String(productData.category || 'General').trim(),
        'Firm Name': String(productData.firm || productData['Firm Name'] || productData.brand || 'General').trim(),
        firm: String(productData.firm || productData['Firm Name'] || productData.brand || 'General').trim(),
        unit: String(productData.unit || 'Pcs').trim(),
        'Purchase Price': Number(productData.purchasePrice || productData['Purchase Price'] || 0),
        purchasePrice: Number(productData.purchasePrice || productData['Purchase Price'] || 0),
        'Selling Price': Number(productData.rate || productData['Selling Price'] || 0),
        rate: Number(productData.rate || productData['Selling Price'] || 0),
        'MRP': Number(productData.mrp || productData.MRP || productData.rate || 0),
        mrp: Number(productData.mrp || productData.MRP || productData.rate || 0),
        'Stock Quantity': Number(productData.stock || productData['Stock Quantity'] || 0),
        stock: Number(productData.stock || productData['Stock Quantity'] || 0),
        minStock: Number(productData.minStock || 20),
        image: productData.image || '',
        'Stock Value': Number(productData.stock || 0) * Number(productData.rate || 0),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      stock.unshift(newProd);
      db.stock = stock;
      this.saveDB(db);
      return newProd;
    },

    updateProduct: function (code, updates) {
      const db = this.getDB();
      const stock = Array.isArray(db.stock) ? db.stock : [];
      const idx = stock.findIndex(p => (p.code === code || p['Item Code'] === code || p.name === code));
      if (idx === -1) return null;

      const p = stock[idx];
      const updated = Object.assign({}, p, updates);

      if (updates.name) { updated.Name = updates.name; updated.name = updates.name; }
      if (updates.brand) { updated.Brand = updates.brand; updated.brand = updates.brand; }
      if (updates.category) { updated['Item Category Name'] = updates.category; updated.category = updates.category; }
      if (updates.firm || updates['Firm Name']) {
        const f = updates.firm || updates['Firm Name'];
        updated['Firm Name'] = f; updated.firm = f;
      }
      if (updates.rate !== undefined || updates['Selling Price'] !== undefined) {
        const r = Number(updates.rate ?? updates['Selling Price'] ?? 0);
        updated.rate = r; updated['Selling Price'] = r;
      }
      if (updates.purchasePrice !== undefined || updates['Purchase Price'] !== undefined) {
        const pp = Number(updates.purchasePrice ?? updates['Purchase Price'] ?? 0);
        updated.purchasePrice = pp; updated['Purchase Price'] = pp;
      }
      if (updates.mrp !== undefined || updates.MRP !== undefined) {
        const mrp = Number(updates.mrp ?? updates.MRP ?? 0);
        updated.mrp = mrp; updated.MRP = mrp;
      }
      if (updates.stock !== undefined || updates['Stock Quantity'] !== undefined) {
        const sq = Number(updates.stock ?? updates['Stock Quantity'] ?? 0);
        updated.stock = sq; updated['Stock Quantity'] = sq;
      }
      if (updates.image !== undefined) updated.image = updates.image;
      if (updates.minStock !== undefined) updated.minStock = Number(updates.minStock);
      if (updates.unit !== undefined) updated.unit = updates.unit;

      updated['Stock Value'] = Number(updated.stock || 0) * Number(updated.rate || 0);
      updated.updatedAt = new Date().toISOString();

      stock[idx] = updated;
      db.stock = stock;
      this.saveDB(db);
      return updated;
    },

    deleteProduct: function (code) {
      const db = this.getDB();
      const stock = Array.isArray(db.stock) ? db.stock : [];
      const before = stock.length;
      db.stock = stock.filter(p => p.code !== code && p['Item Code'] !== code);
      if (db.stock.length < before) {
        this.saveDB(db);
        return true;
      }
      return false;
    },

    deleteProductsBulk: function (codes) {
      if (!Array.isArray(codes) || codes.length === 0) return 0;
      const codeSet = new Set(codes.map(c => String(c).trim()));
      const db = this.getDB();
      const stock = Array.isArray(db.stock) ? db.stock : [];
      const before = stock.length;
      db.stock = stock.filter(p => !codeSet.has(String(p.code).trim()) && !codeSet.has(String(p['Item Code']).trim()));
      const removed = before - db.stock.length;
      if (removed > 0) {
        this.saveDB(db);
      }
      return removed;
    },

    purgeZeroStockProducts: function () {
      const db = this.getDB();
      const stock = Array.isArray(db.stock) ? db.stock : [];
      const before = stock.length;
      const active = stock.filter(p => {
        const qty = Number(p.stock ?? p['Stock Quantity'] ?? 0);
        return qty > 0;
      });
      const removed = before - active.length;
      if (removed > 0) {
        db.stock = active;
        this.saveDB(db);
      }
      return removed;
    },

    purgeCancelledOrders: function () {
      const orders = this.getOrders();
      const before = orders.length;
      const active = orders.filter(o => !(o.status || '').includes('Cancelled') && !o.cancelType);
      const removed = before - active.length;
      if (removed > 0) {
        this.saveOrders(active);
      }
      return removed;
    },

    purgeAllDemoData: function () {
      const db = this.getDB();

      // 1. Clear transactional records while keeping stock & parties
      db.sales = [];
      db.unpaid = [];

      // Reset party outstanding balances to 0
      if (Array.isArray(db.party)) {
        db.party.forEach(p => {
          p.outstanding = 0;
        });
      }

      // Update meta
      db.meta = {
        source: 'DS Enterprises Clean Database',
        purgedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Save database
      this.saveDB(db);

      // 2. Clear all punched orders
      this.saveOrders([]);

      // 3. Clear all payment collections
      this.saveCollections([]);

      // 4. Clear route assignments and import audit batches
      try {
        localStorage.setItem(STORAGE_KEYS.DELIVERY_ASSIGNMENTS, JSON.stringify([]));
        localStorage.setItem(STORAGE_KEYS.IMPORT_BATCHES, JSON.stringify([]));
      } catch (_) {}

      // 5. Reset atomic number sequences to clean initial values
      const currentYear = new Date().getFullYear();
      this.saveNumberSequences({
        [currentYear]: {
          bill: 0,
          invoice: 0,
          order: 5000
        }
      });

      // Notify entire app of the database update
      window.dispatchEvent(new CustomEvent('ds:db-updated', { detail: db }));
      window.dispatchEvent(new CustomEvent('ds:orders-updated', { detail: [] }));

      return {
        success: true,
        stockPreserved: (db.stock || []).length,
        partiesPreserved: (db.party || []).length,
        message: 'All demo and test data purged successfully. Started with clean database.'
      };
    },

    adjustStock: function (code, qtyChange, reason) {
      const db = this.getDB();
      const stock = Array.isArray(db.stock) ? db.stock : [];
      const item = stock.find(p => p.code === code || p['Item Code'] === code);
      if (!item) return null;

      const current = Number(item.stock || item['Stock Quantity'] || 0);
      const next = Math.max(0, current + Number(qtyChange));
      return this.updateProduct(code, {
        stock: next,
        'Stock Quantity': next,
        lastAdjustReason: reason || 'Manual adjustment',
        lastAdjustAt: new Date().toISOString()
      });
    },

    // ============================================================
    // STAFF, ROLES & RESPONSIBILITIES REPOSITORY
    // ============================================================
    getOfficers: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.OFFICERS);
        const list = raw ? JSON.parse(raw) : SEED_OFFICERS;
        const source = Array.isArray(list) && list.length ? list : SEED_OFFICERS;
        return source.map(function (o) {
          const routes = Array.isArray(o.routes) ? o.routes : (o.route ? [o.route] : []);
          const defaultUserId = o.userId || o.username || (o.name ? o.name.toLowerCase().replace(/[^a-z0-9]/g, '') : o.id.toLowerCase());
          const role = o.role || 'so';

          // Standard 13-Point FMCG Granular Permissions Defaults
          let defaultPerms = {
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
          };

          if (window.DS_Auth && window.DS_Auth.ROLE_CONFIG && window.DS_Auth.ROLE_CONFIG[role] && window.DS_Auth.ROLE_CONFIG[role].defaults) {
            defaultPerms = Object.assign({}, defaultPerms, window.DS_Auth.ROLE_CONFIG[role].defaults);
          } else if (role === 'admin') {
            defaultPerms = {
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
            };
          } else if (role === 'ims_manager' || role === 'ims') {
            defaultPerms = {
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
            };
          } else if (role === 'dispatcher') {
            defaultPerms = {
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
            };
          } else if (role === 'accounts' || role === 'cashier') {
            defaultPerms = {
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
            };
          } else if (role === 'billing_operator' || role === 'billing') {
            defaultPerms = {
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
            };
          } else if (role === 'viewer') {
            defaultPerms = {
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
            };
          }

          let resolvedPerms = Object.assign({}, defaultPerms, o.permissions || {});
          if (window.DS_Auth && typeof window.DS_Auth.isAllAuthorizedMode === 'function' && window.DS_Auth.isAllAuthorizedMode()) {
            Object.keys(resolvedPerms).forEach(k => { resolvedPerms[k] = true; });
          }

          return Object.assign({}, o, {
            userId: defaultUserId,
            username: defaultUserId,
            password: o.password || '1234',
            phone: o.phone || o.mobile || '',
            mobile: o.mobile || o.phone || '',
            route: o.route || routes[0] || 'Unassigned Beat',
            routes: routes.length ? routes : [o.route || 'Unassigned Beat'],
            target: Number(o.target || o.monthlyTarget || o.dailyTarget || 0),
            role: role,
            permissions: resolvedPerms,
            active: o.active !== false
          });
        });
      } catch (e) {
        return SEED_OFFICERS;
      }
    },

    saveOfficers: function (list) {
      const clean = Array.isArray(list) ? list : [];
      try {
        localStorage.setItem(STORAGE_KEYS.OFFICERS, JSON.stringify(clean));
      } catch (e) {
        console.warn('[DS_Storage] Could not save officers to localStorage:', e);
      }
      return clean;
    },

    addOfficer: function (officer) {
      const officers = this.getOfficers();
      const role = officer.role || 'so';
      const prefixes = {
        admin: 'ADM-',
        ims_manager: 'IMS-',
        dispatcher: 'DISP-',
        so: 'SO-',
        accounts: 'ACC-',
        billing_operator: 'BILL-',
        viewer: 'AUD-'
      };
      const prefix = prefixes[role] || 'SO-';
      const newId = officer.id || (prefix + (100 + officers.length + 1));

      // Resolve default permissions based on role
      const defaultRolePerms = {
        admin: { canManageProducts: true, canAdjustStock: true, canViewMargins: true, canApproveOrders: true, canPunchOrders: true, canCollectPayments: true, canManageDispatch: true, canViewOutstanding: true, canViewAnalytics: true, canExportReports: true, canManageStaff: true, canImportData: true, canResetData: true },
        ims_manager: { canManageProducts: true, canAdjustStock: true, canViewMargins: true, canApproveOrders: true, canPunchOrders: true, canCollectPayments: false, canManageDispatch: true, canViewOutstanding: false, canViewAnalytics: true, canExportReports: true, canManageStaff: false, canImportData: false, canResetData: false },
        dispatcher: { canManageProducts: false, canAdjustStock: false, canViewMargins: false, canApproveOrders: true, canPunchOrders: false, canCollectPayments: false, canManageDispatch: true, canViewOutstanding: false, canViewAnalytics: false, canExportReports: true, canManageStaff: false, canImportData: false, canResetData: false },
        so: { canManageProducts: false, canAdjustStock: false, canViewMargins: false, canApproveOrders: false, canPunchOrders: true, canCollectPayments: true, canManageDispatch: false, canViewOutstanding: true, canViewAnalytics: false, canExportReports: true, canManageStaff: false, canImportData: false, canResetData: false },
        accounts: { canManageProducts: false, canAdjustStock: false, canViewMargins: true, canApproveOrders: true, canPunchOrders: false, canCollectPayments: true, canManageDispatch: false, canViewOutstanding: true, canViewAnalytics: true, canExportReports: true, canManageStaff: false, canImportData: false, canResetData: false },
        billing_operator: { canManageProducts: false, canAdjustStock: false, canViewMargins: false, canApproveOrders: true, canPunchOrders: true, canCollectPayments: true, canManageDispatch: true, canViewOutstanding: true, canViewAnalytics: false, canExportReports: true, canManageStaff: false, canImportData: false, canResetData: false },
        viewer: { canManageProducts: false, canAdjustStock: false, canViewMargins: true, canApproveOrders: false, canPunchOrders: false, canCollectPayments: false, canManageDispatch: false, canViewOutstanding: true, canViewAnalytics: true, canExportReports: true, canManageStaff: false, canImportData: false, canResetData: false }
      };

      const cleanOfficer = {
        id: newId,
        name: String(officer.name || '').trim(),
        userId: String(officer.userId || officer.username || newId.toLowerCase()).trim().toLowerCase(),
        password: String(officer.password || '1234').trim(),
        phone: String(officer.phone || '').trim(),
        route: String(officer.route || 'Civil Lines Beat').trim(),
        routes: [String(officer.route || 'Civil Lines Beat').trim()],
        target: Number(officer.target || 0),
        role: role,
        permissions: officer.permissions || defaultRolePerms[role] || defaultRolePerms.so,
        active: true,
        createdAt: new Date().toISOString()
      };
      officers.push(cleanOfficer);
      this.saveOfficers(officers);
      return cleanOfficer;
    },

    updateOfficer: function (id, updates) {
      const officers = this.getOfficers();
      const idx = officers.findIndex(o => o.id === id);
      if (idx !== -1) {
        officers[idx] = Object.assign({}, officers[idx], updates);
        if (updates.permissions) {
          officers[idx].permissions = Object.assign({}, officers[idx].permissions, updates.permissions);
        }
        this.saveOfficers(officers);
        return officers[idx];
      }
      return null;
    },

    deleteOfficer: function (id) {
      const officers = this.getOfficers();
      const filtered = officers.filter(o => o.id !== id);
      this.saveOfficers(filtered);
      return filtered;
    },

    exportBackup: function () {
      const backup = {
        version: '4.0.0',
        exportedAt: new Date().toISOString(),
        db: this.getDB(),
        orders: this.getOrders(),
        collections: this.getCollections(),
        officers: this.getOfficers()
      };
      return JSON.stringify(backup, null, 2);
    },

    importBackup: async function (jsonStr) {
      try {
        const data = JSON.parse(jsonStr);
        if (data.db) await this.saveDBAsync(data.db);
        if (Array.isArray(data.orders)) this.saveOrders(data.orders);
        if (Array.isArray(data.collections)) this.saveCollections(data.collections);
        if (Array.isArray(data.officers)) this.saveOfficers(data.officers);
        return { success: true };
      } catch (e) {
        return { success: false, error: e.message };
      }
    },

    clearAll: async function () {
      const currentDB = this.getDB();
      const emptyDB = {
        sales: [],
        unpaid: [],
        stock: currentDB.stock || [],
        party: currentDB.party || [],
        meta: { clearedAt: new Date().toISOString() }
      };
      this._memoryDB = emptyDB;
      window.DB = emptyDB;
      this.saveDB(emptyDB);
      try { await idbSet(IDB_KEY_MAIN, emptyDB); } catch (e) {}
      this.saveOrders([]);
      this.saveCollections([]);
      window.dispatchEvent(new CustomEvent('ds:db-updated', { detail: emptyDB }));
    },

    // ============================================================
    // BILL & INVOICE NUMBER GENERATOR (Atomic, Unique, Yearly)
    // ============================================================
    getNumberSequences: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.NUMBER_SEQUENCES);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      const curYear = new Date().getFullYear().toString();
      const unifiedInv = { prefix: 'INV-', current_year: curYear, current_number: 100, padding: 4 };
      return {
        invoice: unifiedInv,
        bill: unifiedInv,
        order: { prefix: 'ORD-', current_year: curYear, current_number: 5010, padding: 4 }
      };
    },

    saveNumberSequences: function (seqs) {
      try {
        if (seqs && seqs.invoice) {
          seqs.bill = Object.assign({}, seqs.invoice);
        }
        localStorage.setItem(STORAGE_KEYS.NUMBER_SEQUENCES, JSON.stringify(seqs));
      } catch (e) {}
    },

    generateNextNumber: function (type, customDate) {
      // Unify bill and invoice into a single standardized sequence
      const seqType = (type === 'bill') ? 'invoice' : type;
      const year = customDate ? new Date(customDate).getFullYear().toString() : new Date().getFullYear().toString();
      const seqs = this.getNumberSequences();
      const s = seqs[seqType] || { prefix: (seqType.toUpperCase() + '-'), current_year: year, current_number: 0, padding: 4 };
      if (s.current_year !== year) {
        s.current_year = year;
        s.current_number = 0;
      }

      let candidate = '';
      let exists = false;
      let attempts = 0;
      const orders = this.getOrders();
      const db = this.getDB();
      const sales = Array.isArray(db.sales) ? db.sales : [];

      do {
        s.current_number++;
        attempts++;
        const pad = Math.max(3, s.padding || 4);
        candidate = `${s.prefix}${year}-${String(s.current_number).padStart(pad, '0')}`;
        
        exists = false;
        if (seqType === 'order') {
          exists = orders.some(o => o.id === candidate);
        } else {
          // Unified invoice / bill collision check
          exists = orders.some(o => (o.invoice_no === candidate || o.invoiceNo === candidate || o.bill_no === candidate || o.billNo === candidate)) ||
                   sales.some(sl => (sl.invoice_no === candidate || sl.invoiceNo === candidate || sl['Invoice No.'] === candidate || sl.bill_no === candidate || sl.billNo === candidate || sl['Bill No.'] === candidate));
        }
      } while (exists && attempts < 1000);

      seqs[seqType] = s;
      if (seqType === 'invoice') {
        seqs['bill'] = Object.assign({}, s);
      }
      this.saveNumberSequences(seqs);
      return candidate;
    },

    previewNextNumber: function (type, customDate) {
      const seqType = (type === 'bill') ? 'invoice' : type;
      const year = customDate ? new Date(customDate).getFullYear().toString() : new Date().getFullYear().toString();
      const seqs = this.getNumberSequences();
      const s = seqs[seqType] || { prefix: (seqType.toUpperCase() + '-'), current_year: year, current_number: 0, padding: 4 };
      const nextNum = (s.current_year !== year) ? 1 : (s.current_number + 1);
      const pad = Math.max(3, s.padding || 4);
      return `${s.prefix}${year}-${String(nextNum).padStart(pad, '0')}`;
    },

    // ============================================================
    // DELIVERY ROUTES & ASSIGNMENT MANAGEMENT
    // ============================================================
    getDeliveryRoutes: function (date) {
      const targetDate = date || new Date().toISOString().slice(0, 10);
      let routes = [];
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.DELIVERY_ROUTES);
        routes = raw ? JSON.parse(raw) : [];
      } catch (e) {}
      if (!Array.isArray(routes) || !routes.length) {
        routes = JSON.parse(JSON.stringify(SEED_DELIVERY_ROUTES));
        this.saveDeliveryRoutes(routes);
      }

      const assignments = this.getDeliveryAssignments();
      const dayAssignments = assignments.filter(a => !targetDate || a.assignment_date === targetDate);

      return routes.map(r => {
        const rStops = dayAssignments.filter(a => a.route_id === r.id);
        const delivered = rStops.filter(a => a.delivery_status === 'Delivered').length;
        const pending = rStops.filter(a => a.delivery_status === 'Assigned').length;
        const inTransit = rStops.filter(a => a.delivery_status === 'In Transit').length;
        const failed = rStops.filter(a => (a.delivery_status === 'Failed' || a.delivery_status === 'Returned')).length;
        const ordersCount = new Set(rStops.map(a => a.order_id).filter(Boolean)).size;
        const totalAmount = rStops.reduce((sum, a) => sum + (Number(a.order_amount) || 0), 0);

        return Object.assign({}, r, {
          stops_count: rStops.length,
          orders_count: ordersCount,
          delivered_count: delivered,
          pending_count: pending,
          in_transit_count: inTransit,
          failed_count: failed,
          total_amount: totalAmount
        });
      });
    },

    saveDeliveryRoutes: function (routes) {
      try {
        localStorage.setItem(STORAGE_KEYS.DELIVERY_ROUTES, JSON.stringify(routes));
      } catch (e) {}
      return routes;
    },

    getDeliveryAssignments: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.DELIVERY_ASSIGNMENTS);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list) && list.length) return list;
        }
      } catch (e) {}

      // Seed initial assignments from sample orders & parties
      const today = new Date().toISOString().slice(0, 10);
      const orders = this.getOrders();
      const routes = SEED_DELIVERY_ROUTES;
      const initial = [];

      orders.slice(0, 6).forEach((ord, idx) => {
        const r = routes[idx % routes.length];
        initial.push({
          id: idx + 1,
          route_id: r.id,
          route_name: r.name,
          sequence: idx + 1,
          order_id: ord.id,
          customer_id: ord.party_id || `P00${idx + 1}`,
          customer_name: ord.storeName || ord.party,
          customer_phone: ord.givenContact || ord.contact_phone || '9876543210',
          address: ord.location || 'Local Market',
          area: r.area,
          delivery_person: r.default_delivery_person,
          assignment_date: today,
          delivery_status: ord.status === 'Delivered' ? 'Delivered' : (idx === 1 ? 'In Transit' : 'Assigned'),
          order_amount: ord.total || 0,
          created_at: new Date().toISOString()
        });
      });

      this.saveDeliveryAssignments(initial);
      return initial;
    },

    saveDeliveryAssignments: function (assignments) {
      const clean = Array.isArray(assignments) ? assignments : [];
      try {
        localStorage.setItem(STORAGE_KEYS.DELIVERY_ASSIGNMENTS, JSON.stringify(clean));
      } catch (e) {}
      return clean;
    },

    reassignDeliveryPerson: function (assignmentId, newPerson) {
      const assignments = this.getDeliveryAssignments();
      const item = assignments.find(a => Number(a.id) === Number(assignmentId));
      if (item) {
        item.delivery_person = newPerson;
        item.updated_at = new Date().toISOString();
        this.saveDeliveryAssignments(assignments);
        return true;
      }
      return false;
    },

    reorderRouteStops: function (stops) {
      if (!Array.isArray(stops)) return false;
      const assignments = this.getDeliveryAssignments();
      stops.forEach(s => {
        const item = assignments.find(a => Number(a.id) === Number(s.id));
        if (item) item.sequence = Number(s.sequence || 1);
      });
      assignments.sort((a, b) => (a.sequence || 1) - (b.sequence || 1));
      this.saveDeliveryAssignments(assignments);
      return true;
    },

    updateDeliveryStopStatus: function (assignmentId, newStatus) {
      const assignments = this.getDeliveryAssignments();
      const item = assignments.find(a => Number(a.id) === Number(assignmentId));
      if (item) {
        item.delivery_status = newStatus;
        item.updated_at = new Date().toISOString();
        this.saveDeliveryAssignments(assignments);

        // Sync order status
        if (item.order_id) {
          const orders = this.getOrders();
          const ord = orders.find(o => o.id === item.order_id);
          if (ord) {
            if (newStatus === 'Delivered') {
              ord.status = 'Delivered';
              ord.payment = 'Paid';
            } else if (newStatus === 'In Transit') {
              ord.status = 'Dispatched';
            } else if (newStatus === 'Assigned') {
              ord.status = 'Ready for Delivery';
            }
            this.saveOrders(orders);
          }
        }
        return true;
      }
      return false;
    },

    // ============================================================
    // BULK IMPORT BATCHES LOG
    // ============================================================
    getImportBatches: function () {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.IMPORT_BATCHES);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return [
        {
          id: 'BATCH-20261016-0001',
          created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
          file_name: 'FMCG_100_Bills_Master.xlsx',
          uploaded_by: 'Admin',
          mode: 'insert_update',
          total_rows: 100,
          inserted_rows: 100,
          updated_rows: 0,
          unchanged_rows: 0,
          failed_rows: 0,
          status: 'Success'
        }
      ];
    },

    saveImportBatches: function (batches) {
      try {
        localStorage.setItem(STORAGE_KEYS.IMPORT_BATCHES, JSON.stringify(batches));
      } catch (e) {}
      return batches;
    },

    recordImportBatch: function (batch) {
      const batches = this.getImportBatches();
      batches.unshift(batch);
      this.saveImportBatches(batches);
      return batch;
    },

    resetToFactory: async function () {
      this._memoryDB = null;
      window.DB = null;
      try {
        localStorage.removeItem(STORAGE_KEYS.DB);
        localStorage.removeItem(STORAGE_KEYS.ORDERS);
        localStorage.removeItem(STORAGE_KEYS.COLLECTIONS);
        localStorage.removeItem(STORAGE_KEYS.OFFICERS);
        localStorage.removeItem(STORAGE_KEYS.ADMIN_PIN);
        localStorage.removeItem('ds_route_visits_v1');
      } catch (e) {}
      await idbRemove(IDB_KEY_MAIN);
      const seedDB = this.seedSampleData();
      window.dispatchEvent(new CustomEvent('ds:db-updated', { detail: seedDB }));
      return seedDB;
    }
  };

  // Initialize immediately
  DS_Storage.init();
  window.DS_Storage = DS_Storage;
  window.DB = DS_Storage.getDB();

})(window);
