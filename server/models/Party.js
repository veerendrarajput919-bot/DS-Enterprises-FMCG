const mongoose = require('mongoose');

const partySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  city: { type: String, default: 'Kanpur', trim: true },
  cityMain: { type: String, default: 'Kanpur', trim: true },
  route: { type: String, default: 'Central Beat', trim: true },
  beat: { type: String, default: 'Monday Beat', trim: true },
  category: { type: String, default: 'Retail Kirana', trim: true },
  subCategory: { type: String, default: 'General Store', trim: true },
  phone: { type: String, trim: true },
  email: { type: String, trim: true },
  gstin: { type: String, trim: true },
  address: { type: String, trim: true },
  creditLimit: { type: Number, default: 100000 },
  openingBalance: { type: Number, default: 0 },
  totalBills: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  outstanding: { type: Number, default: 0 },
  lastPurchaseDate: { type: Date },
  active: { type: Boolean, default: true }
}, { timestamps: true });

partySchema.index({ name: 'text', code: 'text', city: 'text', route: 'text' });

module.exports = mongoose.model('Party', partySchema);

