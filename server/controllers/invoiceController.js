const Invoice = require('../models/Invoice');
const Party = require('../models/Party');
const Product = require('../models/Product');
const StockTransaction = require('../models/StockTransaction');

// @desc    Get all invoices with search & filters
// @route   GET /api/invoices
exports.getInvoices = async (req, res) => {
  try {
    const { status, partyId, route, city, search, overdueOnly, page = 1, limit = 50 } = req.query;

    const query = {};
    if (status && status !== 'All') query.status = status;
    if (partyId) query.party = partyId;
    if (route) query.route = new RegExp(route, 'i');
    if (city) query.city = new RegExp(city, 'i');

    if (overdueOnly === 'true') {
      query.status = { $ne: 'Paid' };
      query.dueDate = { $lt: new Date() };
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { invoiceNo: new RegExp(s, 'i') },
        { partyName: new RegExp(s, 'i') },
        { partyCode: new RegExp(s, 'i') }
      ];
    }

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .sort({ billDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Summary calculations
    const all = await Invoice.find(query).select('grandTotal paidAmount pendingAmount totalQuantity');
    const summary = all.reduce((acc, inv) => ({
      totalAmount: acc.totalAmount + (inv.grandTotal || 0),
      totalPaid: acc.totalPaid + (inv.paidAmount || 0),
      totalPending: acc.totalPending + (inv.pendingAmount || 0),
      totalQty: acc.totalQty + (inv.totalQuantity || 0)
    }), { totalAmount: 0, totalPaid: 0, totalPending: 0, totalQty: 0 });

    res.json({
      success: true,
      data: invoices,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit) || 1
      },
      summary
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Create new invoice / punched order
// @route   POST /api/invoices
exports.createInvoice = async (req, res) => {
  try {
    const { partyId, billDate, dueDate, items, notes, salesPerson } = req.body;

    const party = await Party.findById(partyId);
    if (!party) return res.status(404).json({ success: false, message: 'Party not found' });

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Invoice must contain at least 1 item' });
    }

    // Auto-generate invoice number
    const count = await Invoice.countDocuments();
    const invoiceNo = `INV-2026-${String(count + 1).padStart(4, '0')}`;

    let subtotal = 0;
    let taxAmount = 0;
    let totalQuantity = 0;
    const computedItems = [];

    for (const it of items) {
      const product = await Product.findById(it.productId || it.product);
      const qty = Number(it.qty) || 1;
      const rate = Number(it.rate) || (product ? product.sellingRate : 100);
      const gstRate = Number(it.gstRate !== undefined ? it.gstRate : (product ? product.gstRate : 18));
      const amount = Math.round(qty * rate);
      const gstAmount = Math.round((amount * gstRate) / 100);
      const itemTotal = amount + gstAmount;

      subtotal += amount;
      taxAmount += gstAmount;
      totalQuantity += qty;

      computedItems.push({
        product: product ? product._id : null,
        productName: product ? product.name : (it.productName || 'FMCG Item'),
        sku: product ? product.sku : (it.sku || 'SKU-001'),
        brand: product ? product.brand : (it.brand || 'General'),
        category: product ? product.category : (it.category || 'Grocery'),
        qty,
        unit: product ? product.unit : (it.unit || 'PCS'),
        rate,
        amount,
        gstRate,
        gstAmount,
        total: itemTotal
      });

      // Deduct stock & log OUT stock transaction if product exists
      if (product) {
        const prevStock = product.currentStock;
        product.currentStock = Math.max(0, product.currentStock - qty);
        product.totalSoldQty = (product.totalSoldQty || 0) + qty;
        product.totalSalesValue = (product.totalSalesValue || 0) + itemTotal;
        await product.save();

        await StockTransaction.create({
          type: 'OUT',
          product: product._id,
          productName: product.name,
          sku: product.sku,
          qty,
          prevStock,
          newStock: product.currentStock,
          rate,
          total: itemTotal,
          referenceNo: invoiceNo,
          remarks: `Order punched for ${party.name}`,
          performedBy: salesPerson || 'Rahul Sharma'
        });
      }
    }

    const grandTotal = subtotal + taxAmount;
    const computedDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 15 * 86400000);

    const invoice = await Invoice.create({
      invoiceNo,
      billDate: billDate ? new Date(billDate) : new Date(),
      dueDate: computedDueDate,
      party: party._id,
      partyName: party.name,
      partyCode: party.code,
      city: party.city,
      route: party.route,
      items: computedItems,
      totalQuantity,
      subtotal,
      taxAmount,
      grandTotal,
      paidAmount: 0,
      pendingAmount: grandTotal,
      status: 'Pending',
      salesPerson: salesPerson || 'Rahul Sharma',
      notes
    });

    // Update party outstanding, totalSales, and totalBills
    party.totalSales = (party.totalSales || 0) + grandTotal;
    party.totalBills = (party.totalBills || 0) + 1;
    party.outstanding = (party.outstanding || 0) + grandTotal;
    party.lastPurchaseDate = new Date();
    await party.save();

    res.status(201).json({
      success: true,
      message: `Invoice ${invoiceNo} generated successfully!`,
      data: invoice
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Add partial / full payment to invoice directly
// @route   POST /api/invoices/:id/pay
exports.payInvoice = async (req, res) => {
  try {
    const { amount, mode = 'Cash', referenceNo, notes } = req.body;
    const payAmt = Number(amount);

    if (!payAmt || payAmt <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid payment amount' });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    if (payAmt > invoice.pendingAmount) {
      return res.status(400).json({ success: false, message: `Payment ₹${payAmt} exceeds invoice pending amount ₹${invoice.pendingAmount}` });
    }

    const Payment = require('../models/Payment');
    const payCount = await Payment.countDocuments();
    const receiptNo = `REC-2026-${String(payCount + 1).padStart(4, '0')}`;

    const payment = await Payment.create({
      receiptNo,
      party: invoice.party,
      partyName: invoice.partyName,
      partyCode: invoice.partyCode,
      invoice: invoice._id,
      invoiceNo: invoice.invoiceNo,
      amount: payAmt,
      date: new Date(),
      mode,
      referenceNo,
      notes: notes || `Direct bill settlement for ${invoice.invoiceNo}`,
      collectedBy: req.user ? req.user.name : 'Cashier'
    });

    // Update invoice
    invoice.paidAmount = (invoice.paidAmount || 0) + payAmt;
    invoice.pendingAmount = Math.max(0, invoice.grandTotal - invoice.paidAmount);
    invoice.status = invoice.pendingAmount === 0 ? 'Paid' : 'Partial';

    invoice.paymentHistory.push({
      paymentId: payment._id,
      receiptNo: payment.receiptNo,
      amount: payAmt,
      date: new Date(),
      mode,
      referenceNo
    });
    await invoice.save();

    // Update party outstanding
    const party = await Party.findById(invoice.party);
    if (party) {
      party.paidAmount = (party.paidAmount || 0) + payAmt;
      party.outstanding = Math.max(0, (party.outstanding || 0) - payAmt);
      await party.save();
    }

    res.json({
      success: true,
      message: `Payment of ₹${payAmt} recorded! Receipt: ${receiptNo}`,
      invoice,
      receipt: payment
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

