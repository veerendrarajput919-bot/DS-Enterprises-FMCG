const Payment = require('../models/Payment');
const Party = require('../models/Party');
const Invoice = require('../models/Invoice');

// @desc    Get all payments / collections
// @route   GET /api/payments
exports.getPayments = async (req, res) => {
  try {
    const { partyId, mode, fromDate, toDate, search, page = 1, limit = 50 } = req.query;

    const query = {};
    if (partyId) query.party = partyId;
    if (mode && mode !== 'All') query.mode = mode;

    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = new Date(fromDate);
      if (toDate) {
        const e = new Date(toDate);
        e.setHours(23, 59, 59, 999);
        query.date.$lte = e;
      }
    }

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { receiptNo: new RegExp(s, 'i') },
        { partyName: new RegExp(s, 'i') },
        { invoiceNo: new RegExp(s, 'i') },
        { referenceNo: new RegExp(s, 'i') }
      ];
    }

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const all = await Payment.find(query).select('amount');
    const totalCollected = all.reduce((sum, p) => sum + (p.amount || 0), 0);

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit) || 1
      },
      summary: {
        totalCollected: Math.round(totalCollected),
        totalReceipts: total
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Record new collection & auto-update ledger & invoice
// @route   POST /api/payments
exports.createPayment = async (req, res) => {
  try {
    const { partyId, invoiceId, amount, date, mode, referenceNo, notes, collectedBy } = req.body;
    const payAmt = Number(amount);

    if (!partyId) return res.status(400).json({ success: false, message: 'Please select a customer / party' });
    if (!payAmt || payAmt <= 0) return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0' });

    const party = await Party.findById(partyId);
    if (!party) return res.status(404).json({ success: false, message: 'Party not found' });

    // Generate receipt number
    const count = await Payment.countDocuments();
    const receiptNo = `REC-2026-${String(count + 1).padStart(4, '0')}`;

    let invoice = null;
    let invNo = '';

    if (invoiceId) {
      invoice = await Invoice.findById(invoiceId);
      if (invoice) {
        invNo = invoice.invoiceNo;
        // Update invoice balance
        invoice.paidAmount = (invoice.paidAmount || 0) + payAmt;
        invoice.pendingAmount = Math.max(0, (invoice.grandTotal || 0) - invoice.paidAmount);
        invoice.status = invoice.pendingAmount === 0 ? 'Paid' : 'Partial';
        invoice.paymentHistory.push({
          paymentId: null,
          receiptNo,
          amount: payAmt,
          date: date ? new Date(date) : new Date(),
          mode: mode || 'Cash',
          referenceNo
        });
        await invoice.save();
      }
    }

    const payment = await Payment.create({
      receiptNo,
      party: party._id,
      partyName: party.name,
      partyCode: party.code,
      invoice: invoice ? invoice._id : null,
      invoiceNo: invNo,
      amount: payAmt,
      date: date ? new Date(date) : new Date(),
      mode: mode || 'Cash',
      referenceNo: referenceNo || '',
      notes: notes || '',
      collectedBy: collectedBy || (req.user ? req.user.name : 'Sales Officer')
    });

    // Update party outstanding
    party.paidAmount = (party.paidAmount || 0) + payAmt;
    party.outstanding = Math.max(0, (party.outstanding || 0) - payAmt);
    await party.save();

    res.status(201).json({
      success: true,
      message: `Receipt ${receiptNo} recorded successfully!`,
      data: payment,
      partyOutstanding: party.outstanding
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

