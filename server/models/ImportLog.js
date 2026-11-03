const mongoose = require('mongoose');

const importLogSchema = new mongoose.Schema({
  module: { 
    type: String, 
    required: true, 
    enum: ['Sales GST Data', 'Sales Summary', 'Stock Summary', 'Party / Route Mapping', 'Staff Route Mapping'] 
  },
  fileName: { type: String, required: true },
  fileType: { type: String, enum: ['xlsx', 'xls', 'csv'], default: 'xlsx' },
  processingMode: { 
    type: String, 
    enum: ['Insert New & Update Existing', 'Insert New Only', 'Update Existing Only'],
    default: 'Insert New & Update Existing'
  },
  recalculateTotals: { type: Boolean, default: true },
  clearBlankFields: { type: Boolean, default: false },
  totalRecords: { type: Number, default: 0 },
  insertedCount: { type: Number, default: 0 },
  updatedCount: { type: Number, default: 0 },
  skippedCount: { type: Number, default: 0 },
  errors: [{ row: Number, error: String, data: Object }],
  status: { type: String, enum: ['Success', 'Partial', 'Failed'], default: 'Success' },
  importedBy: { type: String, default: 'Administrator' }
}, { timestamps: true });

module.exports = mongoose.model('ImportLog', importLogSchema);

