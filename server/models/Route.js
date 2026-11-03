const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, required: true, uppercase: true, trim: true },
  city: { type: String, default: 'Kanpur', trim: true },
  description: { type: String, trim: true },
  assignedStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
  assignedStaffName: { type: String, default: 'Rahul Sharma' },
  partyCount: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Route', routeSchema);

