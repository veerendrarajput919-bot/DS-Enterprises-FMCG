const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  role: { type: String, default: 'Sales Officer', trim: true },
  assignedRoutes: [{ type: String, trim: true }],
  salesTarget: { type: Number, default: 350000 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Staff', staffSchema);

