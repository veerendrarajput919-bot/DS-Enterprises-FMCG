const mongoose = require('mongoose');

const purchaseItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String, required: true },
  sku: { type: String, required: true },
  qty: { type: Number, required: true, min: 1 },
  unit: { type: String, default: 'PCS' },
  rate: { type: Number, required: true },
  amount: { type: Number, required: true },
  gstRate: { type: Number, default: 18 },
  gstAmount: { type: Number, default: 0 },
  total: { type: Number, required: true }
}, { _id: false });

const purchaseSchema = new mongoose.Schema({
  purchaseNo: { type: String, required: true, unique: true, uppercase: true, trim: true },
  supplierName: { type: String, required: true, trim: true },
  billDate: { type: Date, required: true, default: Date.now },
  items: [purchaseItemSchema],
  subtotal: { type: Number, required: true, default: 0 },
  taxAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true, default: 0 },
  status: { type: String, enum: ['Received', 'Pending'], default: 'Received' },
  notes: { type: String, trim: true },
  recordedBy: { type: String, default: 'Inventory Manager' }
}, { timestamps: true });

module.exports = mongoose.model('Purchase', purchaseSchema);

