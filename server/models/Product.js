const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  brand: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  unit: { type: String, default: 'PCS', trim: true },
  purchaseRate: { type: Number, required: true, default: 0 },
  sellingRate: { type: Number, required: true, default: 0 },
  mrp: { type: Number, default: 0 },
  gstRate: { type: Number, default: 18 },
  currentStock: { type: Number, default: 0 },
  minStockAlert: { type: Number, default: 20 },
  expiryDate: { type: Date },
  totalSoldQty: { type: Number, default: 0 },
  totalSalesValue: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

productSchema.index({ name: 'text', sku: 'text', brand: 'text', category: 'text' });

module.exports = mongoose.model('Product', productSchema);

