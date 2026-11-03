const mongoose = require('mongoose');

const dailyVisitSchema = new mongoose.Schema({
  date: { type: Date, required: true, default: Date.now },
  staffName: { type: String, required: true, default: 'Rahul Sharma' },
  party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
  partyName: { type: String, required: true },
  route: { type: String, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['Visited', 'Not Visited', 'Pending'],
    default: 'Pending'
  },
  outcome: { 
    type: String, 
    enum: ['Order Placed', 'Payment Collected', 'Store Closed', 'Owner Not Available', 'Stock Sufficient', 'Payment Deferred', 'Follow Up Required', ''],
    default: ''
  },
  orderAmount: { type: Number, default: 0 },
  collectedAmount: { type: Number, default: 0 },
  remarks: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('DailyVisit', dailyVisitSchema);

