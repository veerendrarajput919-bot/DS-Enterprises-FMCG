const mongoose = require('mongoose');

const stockTransactionSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true, 
    enum: ['IN', 'OUT', 'ADJUSTMENT', 'PURCHASE', 'SALE_RETURN', 'DAMAGE'],
    default: 'IN'
  },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  sku: { type: String, required: true },
  qty: { type: Number, required: true },
  prevStock: { type: Number, required: true },
  newStock: { type: Number, required: true },
  rate: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  referenceNo: { type: String, trim: true },
  remarks: { type: String, trim: true },
  date: { type: Date, default: Date.now },
  performedBy: { type: String, default: 'Inventory Manager' }
}, { timestamps: true });

module.exports = mongoose.model('StockTransaction', stockTransactionSchema);

