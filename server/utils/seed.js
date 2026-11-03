const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/User');
const Role = require('../models/Role');
const Brand = require('../models/Brand');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Party = require('../models/Party');
const Route = require('../models/Route');
const Beat = require('../models/Beat');
const Staff = require('../models/Staff');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const StockTransaction = require('../models/StockTransaction');
const Purchase = require('../models/Purchase');
const DailyVisit = require('../models/DailyVisit');
const Setting = require('../models/Setting');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sales_distribution';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB');

    // Clear existing collections
    await Promise.all([
      User.deleteMany({}),
      Role.deleteMany({}),
      Brand.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Party.deleteMany({}),
      Route.deleteMany({}),
      Beat.deleteMany({}),
      Staff.deleteMany({}),
      Invoice.deleteMany({}),
      Payment.deleteMany({}),
      StockTransaction.deleteMany({}),
      Purchase.deleteMany({}),
      DailyVisit.deleteMany({}),
      Setting.deleteMany({})
    ]);

    console.log('[Seed] Cleared existing database records.');

    // 1. Roles
    const roles = await Role.insertMany([
      {
        name: 'Super Admin',
        label: 'Super Administrator',
        badgeColor: '#b45309',
        description: 'Master system root with complete access to all 18 modules, configuration, and data wipe.',
        permissions: {
          canViewAnalytics: true, canExportReports: true, canManageProducts: true, canAdjustStock: true,
          canPunchOrders: true, canApproveOrders: true, canCollectPayments: true, canViewOutstanding: true,
          canManageDispatch: true, canManageStaff: true, canImportData: true, canResetData: true, canViewMargins: true
        }
      },
      {
        name: 'Administrator',
        label: 'System Administrator',
        badgeColor: '#1e3a8a',
        description: 'Full business management access to inventory, sales analytics, ledgers, and staff.',
        permissions: {
          canViewAnalytics: true, canExportReports: true, canManageProducts: true, canAdjustStock: true,
          canPunchOrders: true, canApproveOrders: true, canCollectPayments: true, canViewOutstanding: true,
          canManageDispatch: true, canManageStaff: true, canImportData: true, canResetData: true, canViewMargins: true
        }
      },
      {
        name: 'Sales Manager',
        label: 'Sales Manager',
        badgeColor: '#0d9488',
        description: 'Route optimization, sales performance tracking, order approvals, and representative targets.',
        permissions: {
          canViewAnalytics: true, canExportReports: true, canManageProducts: false, canAdjustStock: false,
          canPunchOrders: true, canApproveOrders: true, canCollectPayments: true, canViewOutstanding: true,
          canManageDispatch: true, canManageStaff: true, canImportData: false, canResetData: false, canViewMargins: true
        }
      },
      {
        name: 'Sales Executive',
        label: 'Field Sales Executive (SO)',
        badgeColor: '#059669',
        description: 'Beat store visits, mobile order booking, instant cash/UPI collection, and WhatsApp slips.',
        permissions: {
          canViewAnalytics: false, canExportReports: true, canManageProducts: false, canAdjustStock: false,
          canPunchOrders: true, canApproveOrders: false, canCollectPayments: true, canViewOutstanding: true,
          canManageDispatch: false, canManageStaff: false, canImportData: false, canResetData: false, canViewMargins: false
        }
      },
      {
        name: 'Accountant',
        label: 'Accounts & Recovery Head',
        badgeColor: '#7c3aed',
        description: 'Outstanding aging analysis, payment collection entries, bank reconciliation, and invoice audit.',
        permissions: {
          canViewAnalytics: true, canExportReports: true, canManageProducts: false, canAdjustStock: false,
          canPunchOrders: false, canApproveOrders: true, canCollectPayments: true, canViewOutstanding: true,
          canManageDispatch: false, canManageStaff: false, canImportData: false, canResetData: false, canViewMargins: true
        }
      },
      {
        name: 'Inventory Manager',
        label: 'IMS Warehouse Lead',
        badgeColor: '#d97706',
        description: 'Stock inwards, purchase management, catalog updates, damage adjustments, and dispatch challans.',
        permissions: {
          canViewAnalytics: true, canExportReports: true, canManageProducts: true, canAdjustStock: true,
          canPunchOrders: false, canApproveOrders: true, canCollectPayments: false, canViewOutstanding: false,
          canManageDispatch: true, canManageStaff: false, canImportData: false, canResetData: false, canViewMargins: true
        }
      }
    ]);

    // 2. Users (Admin password: Admin@919, Staff password: 1234)
    const adminUser = new User({
      name: 'DS Administrator',
      username: 'admin',
      email: 'admin@dsenterprises.in',
      password: 'Admin@919',
      role: 'Administrator',
      phone: '9839012345',
      department: 'Executive Management',
      permissions: {
        canViewAnalytics: true, canExportReports: true, canManageProducts: true, canAdjustStock: true,
        canPunchOrders: true, canApproveOrders: true, canCollectPayments: true, canViewOutstanding: true,
        canManageDispatch: true, canManageStaff: true, canImportData: true, canResetData: true, canViewMargins: true
      }
    });
    await adminUser.save();

    const salesExec = new User({
      name: 'Rahul Sharma',
      username: 'rahul',
      email: 'rahul.so@dsenterprises.in',
      password: '1234',
      role: 'Sales Executive',
      phone: '9876543210',
      department: 'Field Sales',
      permissions: {
        canViewAnalytics: false, canExportReports: true, canManageProducts: false, canAdjustStock: false,
        canPunchOrders: true, canApproveOrders: false, canCollectPayments: true, canViewOutstanding: true,
        canManageDispatch: false, canManageStaff: false, canImportData: false, canResetData: false, canViewMargins: false
      }
    });
    await salesExec.save();

    const imsUser = new User({
      name: 'Manoj Kumar',
      username: 'manoj',
      email: 'manoj.ims@dsenterprises.in',
      password: '1234',
      role: 'Inventory Manager',
      phone: '9839112233',
      department: 'Warehouse & IMS',
      permissions: {
        canViewAnalytics: true, canExportReports: true, canManageProducts: true, canAdjustStock: true,
        canPunchOrders: false, canApproveOrders: true, canCollectPayments: false, canViewOutstanding: false,
        canManageDispatch: true, canManageStaff: false, canImportData: false, canResetData: false, canViewMargins: true
      }
    });
    await imsUser.save();

    const accUser = new User({
      name: 'Priya Mishra',
      username: 'priya',
      email: 'priya.accounts@dsenterprises.in',
      password: '1234',
      role: 'Accountant',
      phone: '9839223344',
      department: 'Accounts & Recovery',
      permissions: {
        canViewAnalytics: true, canExportReports: true, canManageProducts: false, canAdjustStock: false,
        canPunchOrders: false, canApproveOrders: true, canCollectPayments: true, canViewOutstanding: true,
        canManageDispatch: false, canManageStaff: false, canImportData: false, canResetData: false, canViewMargins: true
      }
    });
    await accUser.save();

    // 3. Brands
    const brandDocs = await Brand.insertMany([
      { name: 'Hindustan Unilever', description: 'Soaps, personal care, and household detergents' },
      { name: 'ITC Limited', description: 'Aashirvaad Atta, Sunfeast, Bingo, and FMCG foods' },
      { name: 'Britannia', description: 'Good Day, Marie Gold, Milk Bikis, and bakery' },
      { name: 'Nestle India', description: 'Maggi noodles, Nescafe, KitKat, and dairy' },
      { name: 'Dabur India', description: 'Real juices, Red paste, Chyawanprash, and healthcare' },
      { name: 'Fortune (Adani Wilmar)', description: 'Mustard oil, refined soyabean oil, basmati rice' },
      { name: 'Amul (GCMMF)', description: 'Butter, ghee, cheese, and milk products' },
      { name: 'Parle Products', description: 'Parle-G, 20-20, Monaco, and confectionery' },
      { name: 'Godrej Consumer', description: 'Goodknight, Godrej No.1 soap, hair care' }
    ]);

    // 4. Categories
    const categoryDocs = await Category.insertMany([
      { name: 'Biscuits & Bakery', description: 'Tea time biscuits, cookies, and rusks' },
      { name: 'Edible Oils & Ghee', description: 'Cooking oils, mustard, refined, and dairy ghee' },
      { name: 'Staples & Flours', description: 'Wheat flour, pulses, spices, and sugar' },
      { name: 'Personal Care & Soaps', description: 'Bath soaps, shampoos, dental care' },
      { name: 'Packaged Foods & Noodles', description: 'Instant noodles, pasta, ready meals' },
      { name: 'Beverages & Juices', description: 'Fruit juices, tea, coffee, energy drinks' },
      { name: 'Home Care & Detergents', description: 'Washing powders, dishwash, surface cleaners' }
    ]);

    // 5. Products
    const productsData = [
      { name: 'Aashirvaad Superior MP Shudh Chakki Atta 10kg', sku: 'AASH-ATT-10K', brand: 'ITC Limited', category: 'Staples & Flours', unit: 'BAG', purchaseRate: 360, sellingRate: 410, mrp: 445, gstRate: 5, currentStock: 240, minStockAlert: 50 },
      { name: 'Fortune Kachi Ghani Pure Mustard Oil 1L Pouch', sku: 'FORT-MUST-1L', brand: 'Fortune (Adani Wilmar)', category: 'Edible Oils & Ghee', unit: 'POUCH', purchaseRate: 122, sellingRate: 138, mrp: 155, gstRate: 5, currentStock: 520, minStockAlert: 80 },
      { name: 'Fortune Sunlite Refined Sunflower Oil 1L Pouch', sku: 'FORT-SUN-1L', brand: 'Fortune (Adani Wilmar)', category: 'Edible Oils & Ghee', unit: 'POUCH', purchaseRate: 110, sellingRate: 125, mrp: 140, gstRate: 5, currentStock: 380, minStockAlert: 60 },
      { name: 'Maggi 2-Minute Masala Noodles 70g (Pack of 24)', sku: 'MAGG-NDL-24P', brand: 'Nestle India', category: 'Packaged Foods & Noodles', unit: 'BOX', purchaseRate: 280, sellingRate: 320, mrp: 360, gstRate: 12, currentStock: 160, minStockAlert: 40 },
      { name: 'Britannia Good Day Butter Cookies 200g (Pack of 12)', sku: 'BRIT-GD-12P', brand: 'Britannia', category: 'Biscuits & Bakery', unit: 'BOX', purchaseRate: 340, sellingRate: 395, mrp: 440, gstRate: 18, currentStock: 210, minStockAlert: 40 },
      { name: 'Parle-G Original Gluco Biscuits 800g Family Pack', sku: 'PARL-G-800G', brand: 'Parle Products', category: 'Biscuits & Bakery', unit: 'PKT', purchaseRate: 64, sellingRate: 75, mrp: 85, gstRate: 18, currentStock: 450, minStockAlert: 100 },
      { name: 'Amul Pasteurised Salted Table Butter 500g', sku: 'AMUL-BUT-500G', brand: 'Amul (GCMMF)', category: 'Edible Oils & Ghee', unit: 'BRK', purchaseRate: 242, sellingRate: 275, mrp: 295, gstRate: 12, currentStock: 95, minStockAlert: 30 },
      { name: 'Surf Excel Easy Wash Detergent Powder 1kg', sku: 'SURF-EW-1KG', brand: 'Hindustan Unilever', category: 'Home Care & Detergents', unit: 'POUCH', purchaseRate: 125, sellingRate: 144, mrp: 160, gstRate: 18, currentStock: 340, minStockAlert: 50 },
      { name: 'Lifebuoy Total Germ Protection Bath Soap 125g (Buy 4 Get 1)', sku: 'LIFE-SOAP-5P', brand: 'Hindustan Unilever', category: 'Personal Care & Soaps', unit: 'PACK', purchaseRate: 135, sellingRate: 160, mrp: 180, gstRate: 18, currentStock: 280, minStockAlert: 40 },
      { name: 'Dabur Red Ayurvedic Toothpaste 300g Combo', sku: 'DAB-RED-300G', brand: 'Dabur India', category: 'Personal Care & Soaps', unit: 'BOX', purchaseRate: 155, sellingRate: 182, mrp: 205, gstRate: 18, currentStock: 140, minStockAlert: 30 },
      { name: 'Real Fruit Power Mixed Fruit Juice 1L Tetra', sku: 'REAL-MIX-1L', brand: 'Dabur India', category: 'Beverages & Juices', unit: 'PACK', purchaseRate: 98, sellingRate: 118, mrp: 135, gstRate: 12, currentStock: 190, minStockAlert: 35 },
      { name: 'Sunfeast Dark Fantasy Choco Fills 300g (Pack of 6)', sku: 'DARK-FANT-6P', brand: 'ITC Limited', category: 'Biscuits & Bakery', unit: 'BOX', purchaseRate: 380, sellingRate: 440, mrp: 490, gstRate: 18, currentStock: 110, minStockAlert: 25 },
      { name: 'Goodknight Gold Flash Mosquito Vaporizer Refill (Twin Pack)', sku: 'GOOD-REFL-2P', brand: 'Godrej Consumer', category: 'Home Care & Detergents', unit: 'PACK', purchaseRate: 132, sellingRate: 155, mrp: 178, gstRate: 18, currentStock: 180, minStockAlert: 30 },
      { name: 'Godrej No.1 Lime & Aloe Vera Soap 100g (Pack of 5)', sku: 'GODR-NO1-5P', brand: 'Godrej Consumer', category: 'Personal Care & Soaps', unit: 'PACK', purchaseRate: 115, sellingRate: 135, mrp: 155, gstRate: 18, currentStock: 220, minStockAlert: 40 }
    ];

    const productDocs = await Product.insertMany(productsData);

    // 6. Routes & Beats
    const routeDocs = await Route.insertMany([
      { name: 'Civil Lines Beat', code: 'RT-CL', city: 'Kanpur', description: 'VIP road, Civil lines commercial stretch and Mall road kirana outlets', assignedStaffName: 'Rahul Sharma', partyCount: 6 },
      { name: 'Kidwai Nagar Beat', code: 'RT-KN', city: 'Kanpur', description: 'Blocks H, K, M Kidwai nagar retail shopping area', assignedStaffName: 'Rahul Sharma', partyCount: 5 },
      { name: 'Govind Nagar Beat', code: 'RT-GN', city: 'Kanpur', description: 'Govind nagar main market, c-block grocery hub', assignedStaffName: 'Amit Verma', partyCount: 4 },
      { name: 'Swaroop Nagar Beat', code: 'RT-SN', city: 'Kanpur', description: 'Swaroop nagar, Arya nagar premium supermarket cluster', assignedStaffName: 'Vikas Yadav', partyCount: 4 },
      { name: 'Parade Wholesale Market', code: 'RT-PW', city: 'Kanpur', description: 'Parade wholesale mandi and bulk grain merchant stores', assignedStaffName: 'Rajesh Mishra', partyCount: 4 }
    ]);

    await Beat.insertMany([
      { name: 'Monday Morning Civil Lines', route: routeDocs[0]._id, routeName: 'Civil Lines Beat', dayOfWeek: 'Monday', assignedStaffName: 'Rahul Sharma', visitTarget: 20 },
      { name: 'Tuesday Kidwai Nagar West', route: routeDocs[1]._id, routeName: 'Kidwai Nagar Beat', dayOfWeek: 'Tuesday', assignedStaffName: 'Rahul Sharma', visitTarget: 22 },
      { name: 'Wednesday Govind Nagar Main', route: routeDocs[2]._id, routeName: 'Govind Nagar Beat', dayOfWeek: 'Wednesday', assignedStaffName: 'Amit Verma', visitTarget: 18 },
      { name: 'Thursday Swaroop Nagar Outlets', route: routeDocs[3]._id, routeName: 'Swaroop Nagar Beat', dayOfWeek: 'Thursday', assignedStaffName: 'Vikas Yadav', visitTarget: 25 },
      { name: 'Friday Parade Wholesale Beat', route: routeDocs[4]._id, routeName: 'Parade Wholesale Market', dayOfWeek: 'Friday', assignedStaffName: 'Rajesh Mishra', visitTarget: 30 }
    ]);

    // 7. Staff
    await Staff.insertMany([
      { name: 'Rahul Sharma', code: 'SO-101', phone: '9876543210', role: 'Senior Sales Officer', assignedRoutes: ['Civil Lines Beat', 'Kidwai Nagar Beat'], salesTarget: 450000 },
      { name: 'Amit Verma', code: 'SO-102', phone: '9876543211', role: 'Field Sales Officer', assignedRoutes: ['Govind Nagar Beat'], salesTarget: 320000 },
      { name: 'Vikas Yadav', code: 'SO-103', phone: '9876543212', role: 'Key Accounts Executive', assignedRoutes: ['Swaroop Nagar Beat'], salesTarget: 500000 },
      { name: 'Rajesh Mishra', code: 'SO-104', phone: '9876543213', role: 'Wholesale Executive', assignedRoutes: ['Parade Wholesale Market'], salesTarget: 750000 }
    ]);

    // 8. Parties / Outlets
    const partiesData = [
      { name: 'Shri Ram Kirana Store', code: 'P101', city: 'Kanpur', cityMain: 'Kanpur', route: 'Civil Lines Beat', beat: 'Monday Morning Civil Lines', category: 'Retail Kirana', subCategory: 'General Store', phone: '9839100101', address: '12/48 Mall Road, Civil Lines', creditLimit: 120000, totalBills: 8, totalSales: 168400, paidAmount: 125000, outstanding: 43400, lastPurchaseDate: new Date('2026-10-25') },
      { name: 'Gupta Provision & General Mart', code: 'P102', city: 'Kanpur', cityMain: 'Kanpur', route: 'Civil Lines Beat', beat: 'Monday Morning Civil Lines', category: 'Supermarket', subCategory: 'Modern Trade', phone: '9839100102', address: '44/A Civil Lines Near Green Park', creditLimit: 250000, totalBills: 14, totalSales: 345000, paidAmount: 310000, outstanding: 35000, lastPurchaseDate: new Date('2026-10-28') },
      { name: 'Mahalaxmi Super Bazar', code: 'P103', city: 'Kanpur', cityMain: 'Kanpur', route: 'Kidwai Nagar Beat', beat: 'Tuesday Kidwai Nagar West', category: 'Supermarket', subCategory: 'Departmental', phone: '9839100103', address: 'Plot 18, Block M, Kidwai Nagar', creditLimit: 300000, totalBills: 12, totalSales: 412000, paidAmount: 320000, outstanding: 92000, lastPurchaseDate: new Date('2026-10-27') },
      { name: 'Krishna Grocery & Dairy Store', code: 'P104', city: 'Kanpur', cityMain: 'Kanpur', route: 'Kidwai Nagar Beat', beat: 'Tuesday Kidwai Nagar West', category: 'Retail Kirana', subCategory: 'Dairy & Grocery', phone: '9839100104', address: 'H-Block Chowk, Kidwai Nagar', creditLimit: 80000, totalBills: 6, totalSales: 94000, paidAmount: 70000, outstanding: 24000, lastPurchaseDate: new Date('2026-10-22') },
      { name: 'Aggarwal Daily Needs Mart', code: 'P105', city: 'Kanpur', cityMain: 'Kanpur', route: 'Govind Nagar Beat', beat: 'Wednesday Govind Nagar Main', category: 'Retail Kirana', subCategory: 'General Store', phone: '9839100105', address: '5/112 C-Block, Govind Nagar', creditLimit: 150000, totalBills: 9, totalSales: 215000, paidAmount: 180000, outstanding: 35000, lastPurchaseDate: new Date('2026-10-26') },
      { name: 'Bajpai General Stores', code: 'P106', city: 'Kanpur', cityMain: 'Kanpur', route: 'Govind Nagar Beat', beat: 'Wednesday Govind Nagar Main', category: 'Retail Kirana', subCategory: 'Corner Store', phone: '9839100106', address: 'Near Ratan Lal Nagar Crossing, Govind Nagar', creditLimit: 60000, totalBills: 5, totalSales: 78000, paidAmount: 62000, outstanding: 16000, lastPurchaseDate: new Date('2026-10-20') },
      { name: 'Swaroop Family Mart', code: 'P107', city: 'Kanpur', cityMain: 'Kanpur', route: 'Swaroop Nagar Beat', beat: 'Thursday Swaroop Nagar Outlets', category: 'Supermarket', subCategory: 'Premium Gourmet', phone: '9839100107', address: '7/190 Khalasi Line, Swaroop Nagar', creditLimit: 400000, totalBills: 16, totalSales: 540000, paidAmount: 480000, outstanding: 60000, lastPurchaseDate: new Date('2026-10-29') },
      { name: 'Arya Grocery Hub', code: 'P108', city: 'Kanpur', cityMain: 'Kanpur', route: 'Swaroop Nagar Beat', beat: 'Thursday Swaroop Nagar Outlets', category: 'Retail Kirana', subCategory: 'Self Service', phone: '9839100108', address: 'Opposite Hallet Hospital Gate, Arya Nagar', creditLimit: 180000, totalBills: 7, totalSales: 164000, paidAmount: 130000, outstanding: 34000, lastPurchaseDate: new Date('2026-10-24') },
      { name: 'Kalyan Wholesale Traders', code: 'P109', city: 'Kanpur', cityMain: 'Kanpur', route: 'Parade Wholesale Market', beat: 'Friday Parade Wholesale Beat', category: 'Wholesale', subCategory: 'Bulk Distributor', phone: '9839100109', address: 'Shop 10, Anwarganj Mandi, Parade', creditLimit: 800000, totalBills: 22, totalSales: 1240000, paidAmount: 1100000, outstanding: 140000, lastPurchaseDate: new Date('2026-10-28') },
      { name: 'Vijay Laxmi Trading Co.', code: 'P110', city: 'Kanpur', cityMain: 'Kanpur', route: 'Parade Wholesale Market', beat: 'Friday Parade Wholesale Beat', category: 'Wholesale', subCategory: 'Grain & Oil Merchant', phone: '9839100110', address: '48 Old Grain Market, Parade', creditLimit: 600000, totalBills: 18, totalSales: 890000, paidAmount: 760000, outstanding: 130000, lastPurchaseDate: new Date('2026-10-26') }
    ];

    const partyDocs = await Party.insertMany(partiesData);

    // 9. Invoices
    const invoices = [];
    const invoiceStatuses = ['Paid', 'Partial', 'Pending', 'Overdue'];

    for (let i = 0; i < partyDocs.length; i++) {
      const p = partyDocs[i];
      // Generate 2 invoices per party
      const inv1Total = Math.round((Math.random() * 20000 + 15000));
      const inv1Paid = Math.round(inv1Total * (p.outstanding === 0 ? 1 : 0.6));
      const inv1Pending = inv1Total - inv1Paid;
      const inv1Status = inv1Pending === 0 ? 'Paid' : (inv1Paid > 0 ? 'Partial' : 'Pending');

      invoices.push({
        invoiceNo: `INV-2026-${String(100 + i * 2 + 1).padStart(4, '0')}`,
        billDate: new Date(Date.now() - (i * 2 + 3) * 86400000),
        dueDate: new Date(Date.now() + (10 - i) * 86400000),
        party: p._id,
        partyName: p.name,
        partyCode: p.code,
        city: p.city,
        route: p.route,
        items: [
          {
            product: productDocs[0]._id, productName: productDocs[0].name, sku: productDocs[0].sku,
            brand: productDocs[0].brand, category: productDocs[0].category, qty: 15, unit: 'BAG',
            rate: productDocs[0].sellingRate, amount: 15 * productDocs[0].sellingRate, gstRate: 5, gstAmount: 15 * productDocs[0].sellingRate * 0.05, total: 15 * productDocs[0].sellingRate * 1.05
          },
          {
            product: productDocs[1]._id, productName: productDocs[1].name, sku: productDocs[1].sku,
            brand: productDocs[1].brand, category: productDocs[1].category, qty: 30, unit: 'POUCH',
            rate: productDocs[1].sellingRate, amount: 30 * productDocs[1].sellingRate, gstRate: 5, gstAmount: 30 * productDocs[1].sellingRate * 0.05, total: 30 * productDocs[1].sellingRate * 1.05
          }
        ],
        totalQuantity: 45,
        subtotal: inv1Total * 0.9,
        taxAmount: inv1Total * 0.1,
        grandTotal: inv1Total,
        paidAmount: inv1Paid,
        pendingAmount: inv1Pending,
        status: inv1Status,
        salesPerson: 'Rahul Sharma',
        notes: 'Delivered via Van Manifest DL-01'
      });

      // Second invoice (can be overdue or paid)
      const inv2Total = Math.round((Math.random() * 25000 + 12000));
      const isOverdue = i % 3 === 0;
      const inv2Pending = isOverdue ? inv2Total : 0;
      const inv2Paid = inv2Total - inv2Pending;

      invoices.push({
        invoiceNo: `INV-2026-${String(100 + i * 2 + 2).padStart(4, '0')}`,
        billDate: new Date(Date.now() - (25 + i) * 86400000),
        dueDate: new Date(Date.now() - (5 + i) * 86400000), // Due in past
        party: p._id,
        partyName: p.name,
        partyCode: p.code,
        city: p.city,
        route: p.route,
        items: [
          {
            product: productDocs[3]._id, productName: productDocs[3].name, sku: productDocs[3].sku,
            brand: productDocs[3].brand, category: productDocs[3].category, qty: 20, unit: 'BOX',
            rate: productDocs[3].sellingRate, amount: 20 * productDocs[3].sellingRate, gstRate: 12, gstAmount: 20 * productDocs[3].sellingRate * 0.12, total: 20 * productDocs[3].sellingRate * 1.12
          },
          {
            product: productDocs[4]._id, productName: productDocs[4].name, sku: productDocs[4].sku,
            brand: productDocs[4].brand, category: productDocs[4].category, qty: 15, unit: 'BOX',
            rate: productDocs[4].sellingRate, amount: 15 * productDocs[4].sellingRate, gstRate: 18, gstAmount: 15 * productDocs[4].sellingRate * 0.18, total: 15 * productDocs[4].sellingRate * 1.18
          }
        ],
        totalQuantity: 35,
        subtotal: inv2Total * 0.85,
        taxAmount: inv2Total * 0.15,
        grandTotal: inv2Total,
        paidAmount: inv2Paid,
        pendingAmount: inv2Pending,
        status: isOverdue ? 'Overdue' : 'Paid',
        salesPerson: i % 2 === 0 ? 'Rahul Sharma' : 'Amit Verma',
        notes: isOverdue ? 'Overdue payment reminder issued via WhatsApp' : 'Cleared in full'
      });
    }

    const invoiceDocs = await Invoice.insertMany(invoices);

    // 10. Payments & Collections
    const paymentModes = ['UPI', 'Cash', 'Bank Transfer', 'Cheque'];
    const paymentRecords = [];

    for (let i = 0; i < partyDocs.length; i++) {
      const p = partyDocs[i];
      paymentRecords.push({
        receiptNo: `REC-2026-${String(200 + i + 1).padStart(4, '0')}`,
        party: p._id,
        partyName: p.name,
        partyCode: p.code,
        invoice: invoiceDocs[i * 2]._id,
        invoiceNo: invoiceDocs[i * 2].invoiceNo,
        amount: Math.round(Math.random() * 8000 + 5000),
        date: new Date(Date.now() - (i + 1) * 86400000),
        mode: paymentModes[i % paymentModes.length],
        referenceNo: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        notes: 'Market recovery on beat visit',
        collectedBy: 'Rahul Sharma'
      });
    }

    await Payment.insertMany(paymentRecords);

    // 11. Daily Visits
    const visitOutcomes = [
      { status: 'Visited', outcome: 'Order Placed', order: 18500, coll: 0, remarks: 'Took festive stock order' },
      { status: 'Visited', outcome: 'Payment Collected', order: 0, coll: 12000, remarks: 'Collected pending bill via GooglePay UPI' },
      { status: 'Visited', outcome: 'Stock Sufficient', order: 0, coll: 0, remarks: 'Store holds adequate inventory till Friday' },
      { status: 'Not Visited', outcome: 'Store Closed', order: 0, coll: 0, remarks: 'Store shutter down due to local electricity cut' },
      { status: 'Not Visited', outcome: 'Owner Not Available', order: 0, coll: 0, remarks: 'Manager requested evening revisit' }
    ];

    const visits = [];
    for (let i = 0; i < partyDocs.length; i++) {
      const p = partyDocs[i];
      const vo = visitOutcomes[i % visitOutcomes.length];
      visits.push({
        date: new Date(),
        staffName: 'Rahul Sharma',
        party: p._id,
        partyName: p.name,
        route: p.route,
        status: vo.status,
        outcome: vo.outcome,
        orderAmount: vo.order,
        collectedAmount: vo.coll,
        remarks: vo.remarks
      });
    }
    await DailyVisit.insertMany(visits);

    // 12. Stock Transactions
    await StockTransaction.insertMany([
      {
        type: 'IN', product: productDocs[0]._id, productName: productDocs[0].name, sku: productDocs[0].sku,
        qty: 100, prevStock: 140, newStock: 240, rate: 360, total: 36000, referenceNo: 'GRN-101', remarks: 'Factory direct inward'
      },
      {
        type: 'IN', product: productDocs[1]._id, productName: productDocs[1].name, sku: productDocs[1].sku,
        qty: 200, prevStock: 320, newStock: 520, rate: 122, total: 24400, referenceNo: 'GRN-102', remarks: 'Bulk truck unloading'
      },
      {
        type: 'OUT', product: productDocs[3]._id, productName: productDocs[3].name, sku: productDocs[3].sku,
        qty: 40, prevStock: 200, newStock: 160, rate: 320, total: 12800, referenceNo: 'DISP-401', remarks: 'Dispatched on Civil lines beat'
      },
      {
        type: 'ADJUSTMENT', product: productDocs[6]._id, productName: productDocs[6].name, sku: productDocs[6].sku,
        qty: -5, prevStock: 100, newStock: 95, rate: 242, total: 1210, referenceNo: 'DMG-09', remarks: 'Refrigeration temperature breach damage'
      }
    ]);

    // 13. Purchases
    await Purchase.insertMany([
      {
        purchaseNo: 'PUR-2026-001', supplierName: 'ITC Distribution Depot Kanpur', billDate: new Date('2026-10-15'),
        items: [
          { product: productDocs[0]._id, productName: productDocs[0].name, sku: productDocs[0].sku, qty: 150, unit: 'BAG', rate: 360, amount: 54000, gstRate: 5, gstAmount: 2700, total: 56700 },
          { product: productDocs[11]._id, productName: productDocs[11].name, sku: productDocs[11].sku, qty: 80, unit: 'BOX', rate: 380, amount: 30400, gstRate: 18, gstAmount: 5472, total: 35872 }
        ],
        subtotal: 84400, taxAmount: 8172, grandTotal: 92572, status: 'Received', notes: 'Invoice # ITC-KAN-8890 Paid via RTGS'
      },
      {
        purchaseNo: 'PUR-2026-002', supplierName: 'Adani Wilmar CFA Unnao', billDate: new Date('2026-10-20'),
        items: [
          { product: productDocs[1]._id, productName: productDocs[1].name, sku: productDocs[1].sku, qty: 300, unit: 'POUCH', rate: 122, amount: 36600, gstRate: 5, gstAmount: 1830, total: 38430 },
          { product: productDocs[2]._id, productName: productDocs[2].name, sku: productDocs[2].sku, qty: 250, unit: 'POUCH', rate: 110, amount: 27500, gstRate: 5, gstAmount: 1375, total: 28875 }
        ],
        subtotal: 64100, taxAmount: 3205, grandTotal: 67305, status: 'Received', notes: 'Tanker tanker lot # 4402'
      }
    ]);

    // 14. Settings
    await Setting.create({
      companyName: 'DS Enterprises',
      tagline: 'FMCG Distribution & Sales System',
      address: 'Transport Nagar, Kanpur, Uttar Pradesh - 208023',
      phone: '+91 98390 12345',
      email: 'support@dsenterprises.in',
      gstin: '09AABCD1234E1Z5',
      currency: 'INR',
      defaultGstRate: 18,
      financialYear: '2026-2027',
      idleTimeoutMinutes: 15,
      adminPin: 'Admin@919'
    });

    console.log('[Seed] Database successfully populated with realistic FMCG enterprise dataset!');
    console.log('[Seed] Default credentials:');
    console.log('   👑 Administrator:  admin / Admin@919');
    console.log('   👤 Sales Executive: rahul / 1234');
    console.log('   📦 Inventory Lead:  manoj / 1234');
    console.log('   💰 Accountant:      priya / 1234');

    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  }
};

seedData();

