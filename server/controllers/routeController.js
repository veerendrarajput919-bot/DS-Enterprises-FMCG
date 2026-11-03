const Route = require('../models/Route');
const Beat = require('../models/Beat');
const Party = require('../models/Party');
const Invoice = require('../models/Invoice');
const Staff = require('../models/Staff');
const DailyVisit = require('../models/DailyVisit');

// @desc    Get all routes with analytics, party count, and sales turnover
// @route   GET /api/routes
exports.getRoutes = async (req, res) => {
  try {
    const routes = await Route.find({ active: true });
    const parties = await Party.find({ active: true });
    const invoices = await Invoice.find({});
    const beats = await Beat.find({ active: true });

    // Aggregate metrics per route
    const routeAnalytics = routes.map(r => {
      const routeParties = parties.filter(p => p.route && p.route.toLowerCase() === r.name.toLowerCase());
      const routeInvoices = invoices.filter(inv => inv.route && inv.route.toLowerCase() === r.name.toLowerCase());
      const totalSales = routeInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
      const totalOutstanding = routeParties.reduce((sum, p) => sum + (p.outstanding || 0), 0);
      const routeBeats = beats.filter(b => b.routeName && b.routeName.toLowerCase() === r.name.toLowerCase());

      return {
        id: r._id,
        name: r.name,
        code: r.code,
        city: r.city,
        description: r.description,
        assignedStaffName: r.assignedStaffName,
        partyCount: routeParties.length,
        beatsCount: routeBeats.length,
        totalSales: Math.round(totalSales),
        totalOutstanding: Math.round(totalOutstanding),
        collectionEfficiency: totalSales > 0 ? Math.round(((totalSales - totalOutstanding) / totalSales) * 100) : 100
      };
    });

    res.json({ success: true, data: routeAnalytics });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get beats
// @route   GET /api/routes/beats
exports.getBeats = async (req, res) => {
  try {
    const beats = await Beat.find({ active: true }).sort({ name: 1 });
    res.json({ success: true, data: beats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get staff
// @route   GET /api/routes/staff
exports.getStaff = async (req, res) => {
  try {
    const staff = await Staff.find({ active: true });
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Assign sales rep to route
// @route   POST /api/routes/:id/assign
exports.assignStaffToRoute = async (req, res) => {
  try {
    const { staffName } = req.body;
    const route = await Route.findByIdAndUpdate(req.params.id, { assignedStaffName: staffName }, { new: true });
    if (!route) return res.status(404).json({ success: false, message: 'Route not found' });
    res.json({ success: true, message: `Assigned ${staffName} to ${route.name}`, data: route });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get daily visits for a specific date or today
// @route   GET /api/routes/visits
exports.getVisits = async (req, res) => {
  try {
    const { date, route } = req.query;
    const query = {};

    if (date) {
      const d = new Date(date);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      query.date = { $gte: start, $lte: end };
    }

    if (route && route !== 'All') {
      query.route = new RegExp(route, 'i');
    }

    const visits = await DailyVisit.find(query).sort({ createdAt: -1 });

    const total = visits.length;
    const visitedCount = visits.filter(v => v.status === 'Visited').length;
    const notVisitedCount = visits.filter(v => v.status === 'Not Visited').length;
    const pendingCount = visits.filter(v => v.status === 'Pending').length;

    res.json({
      success: true,
      data: visits,
      summary: {
        total,
        visitedCount,
        notVisitedCount,
        pendingCount,
        coveragePercent: total > 0 ? Math.round((visitedCount / total) * 100) : 0
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Record or update a store visit (Visited / Not Visited with reason)
// @route   POST /api/routes/visits
exports.recordVisit = async (req, res) => {
  try {
    const { partyId, status, outcome, remarks, staffName } = req.body;

    const party = await Party.findById(partyId);
    if (!party) return res.status(404).json({ success: false, message: 'Party not found' });

    // Check if visit record for today already exists
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    let visit = await DailyVisit.findOne({
      party: party._id,
      date: { $gte: start, $lte: end }
    });

    if (visit) {
      visit.status = status;
      visit.outcome = outcome || '';
      visit.remarks = remarks || '';
      if (staffName) visit.staffName = staffName;
      await visit.save();
    } else {
      visit = await DailyVisit.create({
        date: new Date(),
        staffName: staffName || 'Rahul Sharma',
        party: party._id,
        partyName: party.name,
        route: party.route,
        status,
        outcome: outcome || '',
        remarks: remarks || ''
      });
    }

    res.json({
      success: true,
      message: `Visit marked as [${status}] for ${party.name}`,
      data: visit
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

