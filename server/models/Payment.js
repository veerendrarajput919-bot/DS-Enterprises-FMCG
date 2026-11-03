const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  receiptNo: { type: String, required: true, unique: true, uppercase: true, trim: true },
  party: { type: mongoose.Schema.Types.ObjectId, ref: 'Party', required: true },
  partyName: { type: String, required: true },
  partyCode: { type: String, required: true },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
  invoiceNo: { type: String },
  amount: { type: Number, required: true, min: 0.01 },
  date: { type: Date, required: true, default: Date.now },
  mode: { 
    type: String, 
    required: true, 
    enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque'],
    default: 'Cash'
  },
  referenceNo: { type: String, trim: true },
  notes: { type: String, trim: true },
  collectedBy: { type: String, default: 'Rahul Sharma' }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);

