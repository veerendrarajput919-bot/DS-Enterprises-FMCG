const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    required: true, 
    enum: ['Super Admin', 'Administrator', 'Sales Manager', 'Sales Executive', 'Accountant', 'Inventory Manager'],
    default: 'Sales Executive'
  },
  phone: { type: String, trim: true },
  department: { type: String, default: 'Sales' },
  active: { type: Boolean, default: true },
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
  },
  lastLogin: { type: Date }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

