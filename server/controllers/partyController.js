const Party = require('../models/Party');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');

// @desc    Get all parties with search & filters
// @route   GET /api/parties
exports.getParties = async (req, res) => {
  try {
    const { search, city, route, category, sort = 'totalSales', order = 'desc', page = 1, limit = 50 } = req.query;

    const query = { active: true };
    if (city) query.city = new RegExp(city, 'i');
    if (route) query.route = new RegExp(route, 'i');
    if (category) query.category = new RegExp(category, 'i');

    if (search && search.trim()) {
      const s = search.trim();
      query.$or = [
        { name: new RegExp(s, 'i') },
        { code: new RegExp(s, 'i') },
        { phone: new RegExp(s, 'i') },
        { city: new RegExp(s, 'i') },
        { route: new RegExp(s, 'i') }
      ];
    }

    const sortObj = {};
    sortObj[sort] = order === 'asc' ? 1 : -1;

    const total = await Party.countDocuments(query);
    const parties = await Party.find(query)
      .sort(sortObj)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Summary
    const all = await Party.find(query).select('totalSales paidAmount outstanding totalBills');
    const totals = all.reduce((acc, p) => ({
      sales: acc.sales + (p.totalSales || 0),
      paid: acc.paid + (p.paidAmount || 0),
      outstanding: acc.outstanding + (p.outstanding || 0),
      bills: acc.bills + (p.totalBills || 0)
    }), { sales: 0, paid: 0, outstanding: 0, bills: 0 });

    res.json({
      success: true,
      data: parties,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit) || 1
      },
      summary: totals
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get party detail with full invoice and payment ledger
// @route   GET /api/parties/:id
exports.getPartyById = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) return res.status(404).json({ success: false, message: 'Party not found' });

    // Fetch full invoice history
    const invoices = await Invoice.find({ party: party._id }).sort({ billDate: -1 });

    // Fetch full payment history
    const payments = await Payment.find({ party: party._id }).sort({ date: -1 });

    res.json({
      success: true,
      data: {
        party,
        invoices,
        payments
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Create new party
// @route   POST /api/parties
exports.createParty = async (req, res) => {
  try {
    const { name, code, city, cityMain, route, beat, category, subCategory, phone, email, gstin, address, creditLimit, openingBalance } = req.body;

    const existing = await Party.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Party Code ${code} is already registered` });
    }

    const party = await Party.create({
      name,
      code: code.toUpperCase().trim(),
      city: city || 'Kanpur',
      cityMain: cityMain || city || 'Kanpur',
      route: route || 'Central Beat',
      beat: beat || 'Monday Beat',
      category: category || 'Retail Kirana',
      subCategory: subCategory || 'General Store',
      phone,
      email,
      gstin,
      address,
      creditLimit: Number(creditLimit) || 100000,
      openingBalance: Number(openingBalance) || 0,
      outstanding: Number(openingBalance) || 0
    });

    res.status(201).json({ success: true, message: 'Party created successfully', data: party });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update party
// @route   PUT /api/parties/:id
exports.updateParty = async (req, res) => {
  try {
    const party = await Party.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!party) return res.status(404).json({ success: false, message: 'Party not found' });
    res.json({ success: true, message: 'Party updated successfully', data: party });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete party (soft delete)
// @route   DELETE /api/parties/:id
exports.deleteParty = async (req, res) => {
  try {
    const party = await Party.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
    if (!party) return res.status(404).json({ success: false, message: 'Party not found' });
    res.json({ success: true, message: 'Party deactivated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

