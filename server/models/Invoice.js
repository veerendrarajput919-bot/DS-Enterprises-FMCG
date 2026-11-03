const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: { type: String, required: true },
  sku: { type: String, required: true },
  brand: { type: String },
  category: { type: String },
  qty: { type: Number, required: true, min: 1 },
  unit: { type: String, default: 'PCS' },
  rate: { type: Number, required: true },
  amount: { type: Number, required: true },
  gstRate: { type: Number, default: 18 },
  gstAmount: { type: Number, default: 0 },
  total: { type: Number, required: true }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  invoiceNo: { type: String, required: true, unique: true, uppercase: true, trim: true },
  billDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date, required: true },
  party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
  partyName: { type: String, required: true },
  partyCode: { type: String, required: true },
  city: { type: String, default: 'Kanpur' },
  route: { type: String, default: 'Central Beat' },
  items: [invoiceItemSchema],
  totalQuantity: { type: Number, default: 0 },
  subtotal: { type: Number, required: true, default: 0 },
  taxAmount: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true, default: 0 },
  paidAmount: { type: Number, default: 0 },
  pendingAmount: { type: Number, required: true, default: 0 },
  status: { 
    type: String, 
    enum: ['Paid', 'Partial', 'Pending', 'Overdue'],
    default: 'Pending'
  },
  salesPerson: { type: String, default: 'Rahul Sharma' },
  notes: { type: String },
  paymentHistory: [{
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    receiptNo: { type: String },
    amount: { type: Number },
    date: { type: Date },
    mode: { type: String },
    referenceNo: { type: String }
  }]
}, { timestamps: true });

invoiceSchema.index({ invoiceNo: 'text', partyName: 'text', city: 'text', route: 'text' });

module.exports = mongoose.model('Invoice', invoiceSchema);

