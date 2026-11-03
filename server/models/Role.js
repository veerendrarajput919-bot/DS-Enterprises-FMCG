const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  badgeColor: { type: String, default: '#0d9488' },
  description: { type: String },
  permissions: {
    canViewAnalytics: { type: Boolean, default: true },
    canExportReports: { type: Boolean, default: true },
    canManageProducts: { type: Boolean, default: false },
    canAdjustStock: { type: Boolean, default: false },
    canPunchOrders: { type: Boolean, default: true },
    canApproveOrders: { type: Boolean, default: false },
    canCollectPayments: { type: Boolean, default: true },
    canViewOutstanding: { type: Boolean, default: true },
    canManageDispatch: { type: Boolean, default: false },
    canManageStaff: { type: Boolean, default: false },
    canImportData: { type: Boolean, default: false },
    canResetData: { type: Boolean, default: false },
    canViewMargins: { type: Boolean, default: false }
  }
}, { timestamps: true });

module.exports = mongoose.model('Role', roleSchema);

