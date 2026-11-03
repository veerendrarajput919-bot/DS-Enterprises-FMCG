const Invoice = require('../models/Invoice');
const Party = require('../models/Party');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Route = require('../models/Route');

// @desc    Generate report dataset by type
// @route   GET /api/reports/:reportType
exports.getReportData = async (req, res) => {
  try {
    const { reportType } = req.params;
    const { fromDate, toDate, filter } = req.query;

    let data = [];
    let title = '';

    if (reportType === 'daily-sales') {
      title = 'Daily Sales Report';
      const invoices = await Invoice.find({}).sort({ billDate: -1 });
      data = invoices.map(inv => ({
        invoiceNo: inv.invoiceNo,
        date: new Date(inv.billDate).toLocaleDateString('en-IN'),
        partyName: inv.partyName,
        city: inv.city,
        route: inv.route,
        itemsCount: inv.items ? inv.items.length : 0,
        totalQuantity: inv.totalQuantity || 0,
        amount: inv.grandTotal || 0,
        paid: inv.paidAmount || 0,
        pending: inv.pendingAmount || 0,
        status: inv.status
      }));
    } else if (reportType === 'party-wise') {
      title = 'Party-Wise Sales & Recovery Ledger';
      const parties = await Party.find({ active: true }).sort({ totalSales: -1 });
      data = parties.map(p => ({
        partyCode: p.code,
        partyName: p.name,
        city: p.city,
        route: p.route,
        category: p.category,
        totalBills: p.totalBills || 0,
        totalSales: p.totalSales || 0,
        paidAmount: p.paidAmount || 0,
        outstanding: p.outstanding || 0,
        creditLimit: p.creditLimit || 0
      }));
    } else if (reportType === 'brand-wise') {
      title = 'Brand-Wise FMCG Sales & Profit Analysis';
      const invoices = await Invoice.find({});
      const brandMap = {};

      invoices.forEach(inv => {
        if (inv.items) {
          inv.items.forEach(it => {
            const b = it.brand || 'Other';
            if (!brandMap[b]) {
              brandMap[b] = { brand: b, totalQuantity: 0, totalSales: 0, billsCount: 0 };
            }
            brandMap[b].totalQuantity += it.qty || 0;
            brandMap[b].totalSales += it.total || 0;
            brandMap[b].billsCount += 1;
          });
        }
      });
      data = Object.values(brandMap).sort((a, b) => b.totalSales - a.totalSales);
    } else if (reportType === 'stock') {
      title = 'Inventory Valuation & Low Stock Report';
      const products = await Product.find({ active: true }).sort({ currentStock: 1 });
      data = products.map(p => ({
        sku: p.sku,
        productName: p.name,
        brand: p.brand,
        category: p.category,
        currentStock: p.currentStock || 0,
        minAlert: p.minStockAlert || 20,
        unit: p.unit,
        purchaseRate: p.purchaseRate || 0,
        sellingRate: p.sellingRate || 0,
        mrp: p.mrp || 0,
        stockValuation: (p.currentStock || 0) * (p.purchaseRate || 0),
        status: (p.currentStock || 0) <= (p.minStockAlert || 20) ? 'LOW STOCK' : 'IN STOCK'
      }));
    } else if (reportType === 'outstanding') {
      title = 'Accounts Receivables & Outstanding Aging Report';
      const parties = await Party.find({ active: true, outstanding: { $gt: 0 } }).sort({ outstanding: -1 });
      data = parties.map(p => ({
        partyCode: p.code,
        partyName: p.name,
        city: p.city,
        route: p.route,
        phone: p.phone,
        creditLimit: p.creditLimit || 0,
        totalSales: p.totalSales || 0,
        paidAmount: p.paidAmount || 0,
        outstanding: p.outstanding || 0,
        riskLevel: (p.outstanding || 0) > (p.creditLimit || 100000) ? 'HIGH' : 'NORMAL'
      }));
    } else if (reportType === 'collections') {
      title = 'Payment Collections & Market Recovery Report';
      const payments = await Payment.find({}).sort({ date: -1 });
      data = payments.map(pay => ({
        receiptNo: pay.receiptNo,
        date: new Date(pay.date).toLocaleDateString('en-IN'),
        partyName: pay.partyName,
        invoiceNo: pay.invoiceNo || 'Lump Sum',
        amount: pay.amount || 0,
        mode: pay.mode,
        referenceNo: pay.referenceNo || 'N/A',
        collectedBy: pay.collectedBy
      }));
    } else if (reportType === 'route-performance') {
      title = 'Route & Beat Sales Performance Report';
      const routes = await Route.find({ active: true });
      const parties = await Party.find({ active: true });
      const invoices = await Invoice.find({});

      data = routes.map(r => {
        const rParties = parties.filter(p => p.route && p.route.toLowerCase() === r.name.toLowerCase());
        const rInvoices = invoices.filter(inv => inv.route && inv.route.toLowerCase() === r.name.toLowerCase());
        const sales = rInvoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
        const out = rParties.reduce((acc, p) => acc + (p.outstanding || 0), 0);

        return {
          routeCode: r.code,
          routeName: r.name,
          city: r.city,
          assignedStaff: r.assignedStaffName,
          partyCount: rParties.length,
          invoicesCount: rInvoices.length,
          totalSales: Math.round(sales),
          totalOutstanding: Math.round(out),
          recoveryRatio: sales > 0 ? `${Math.round(((sales - out) / sales) * 100)}%` : '100%'
        };
      });
    }

    res.json({
      success: true,
      reportType,
      title,
      generatedAt: new Date().toISOString(),
      totalRecords: data.length,
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

