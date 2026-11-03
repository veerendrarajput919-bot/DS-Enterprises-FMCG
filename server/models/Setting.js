const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
  companyName: { type: String, default: 'DS Enterprises' },
  tagline: { type: String, default: 'FMCG Distribution & Sales System' },
  address: { type: String, default: 'Transport Nagar, Kanpur, Uttar Pradesh - 208023' },
  phone: { type: String, default: '+91 98390 12345' },
  email: { type: String, default: 'support@dsenterprises.in' },
  gstin: { type: String, default: '09AABCD1234E1Z5' },
  currency: { type: String, default: 'INR' },
  defaultGstRate: { type: Number, default: 18 },
  financialYear: { type: String, default: '2026-2027' },
  idleTimeoutMinutes: { type: Number, default: 15 },
  adminPin: { type: String, default: 'Admin@919' }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);

