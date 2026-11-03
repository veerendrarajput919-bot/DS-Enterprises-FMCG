const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  module: { type: String, required: true },
  details: { type: String },
  user: { type: String, default: 'Administrator' },
  ip: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);

