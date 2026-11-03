const mongoose = require('mongoose');

const beatSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
  routeName: { type: String, required: true, trim: true },
  dayOfWeek: { 
    type: String, 
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    default: 'Monday'
  },
  assignedStaffName: { type: String, default: 'Rahul Sharma' },
  visitTarget: { type: Number, default: 25 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Beat', beatSchema);

