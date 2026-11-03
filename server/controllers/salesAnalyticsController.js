const Invoice = require('../models/Invoice');
const Party = require('../models/Party');
const Product = require('../models/Product');

// @desc    Advanced sales analysis and dynamic filtering
// @route   POST /api/sales/filter
exports.filterSales = async (req, res) => {
  try {
    const {
      quickPeriod,
      fromDate,
      toDate,
      city,
      cityMain,
      route,
      beat,
      category,
      subCategory,
      brand,
      invoiceNo,
      status,
      search,
      page = 1,
      limit = 50
    } = req.body;

    // Build Mongo query
    const query = {};

    // 1. Date Range Handling
    const now = new Date();
    let start, end;

    if (quickPeriod && quickPeriod !== 'All Time' && quickPeriod !== 'Custom Range') {
      end = new Date();
      end.setHours(23, 59, 59, 999);

      if (quickPeriod === 'Today') {
        start = new Date();
        start.setHours(0, 0, 0, 0);
      } else if (quickPeriod === 'Yesterday') {
        start = new Date();
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date();
        end.setDate(end.getDate() - 1);
        end.setHours(23, 59, 59, 999);
      } else if (quickPeriod === 'Last 7 Days') {
        start = new Date();
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
      } else if (quickPeriod === 'This Month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (quickPeriod === 'Last Month') {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      } else if (quickPeriod === '3 Months') {
        start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      } else if (quickPeriod === '6 Months') {
        start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      } else if (quickPeriod === '365 Days') {
        start = new Date();
        start.setDate(start.getDate() - 365);
      }
    } else if (fromDate || toDate) {
      if (fromDate) start = new Date(fromDate);
      if (toDate) {
        end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
      }
    }

    if (start || end) {
      query.billDate = {};
      if (start) query.billDate.$gte = start;
      if (end) query.billDate.$lte = end;
    }

    // 2. Direct Filters
    if (city) query.city = new RegExp(city, 'i');
    if (route) query.route = new RegExp(route, 'i');
    if (invoiceNo) query.invoiceNo = new RegExp(invoiceNo, 'i');
    if (status && status !== 'All') query.status = status;

    // 3. Brand & Item Filters (within items array)
    if (brand && brand !== 'All') {
      query['items.brand'] = brand;
    }

    // 4. Search Filter
    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { invoiceNo: new RegExp(s, 'i') },
        { partyName: new RegExp(s, 'i') },
        { partyCode: new RegExp(s, 'i') },
        { 'items.productName': new RegExp(s, 'i') },
        { 'items.sku': new RegExp(s, 'i') }
      ];
    }

    // Execute filtered query
    const totalRecords = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .sort({ billDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Summary calculations on all matching records
    const allMatching = await Invoice.find(query).select('grandTotal paidAmount pendingAmount totalQuantity items status');
    
    let totalSales = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let totalQty = 0;
    let totalLines = 0;
    const brandMap = {};
    const cityMap = {};

    allMatching.forEach(inv => {
      totalSales += inv.grandTotal || 0;
      totalPaid += inv.paidAmount || 0;
      totalOutstanding += inv.pendingAmount || 0;
      totalQty += inv.totalQuantity || 0;
      if (inv.items) {
        totalLines += inv.items.length;
        inv.items.forEach(it => {
          const b = it.brand || 'Other';
          brandMap[b] = (brandMap[b] || 0) + (it.total || 0);
        });
      }
    });

    res.json({
      success: true,
      data: invoices,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: totalRecords,
        pages: Math.ceil(totalRecords / limit) || 1
      },
      summary: {
        totalSales: Math.round(totalSales),
        totalPaid: Math.round(totalPaid),
        totalOutstanding: Math.round(totalOutstanding),
        totalQuantity: totalQty,
        totalInvoices: totalRecords,
        totalLines,
        brandBreakdown: Object.keys(brandMap).map(b => ({ brand: b, sales: Math.round(brandMap[b]) }))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

