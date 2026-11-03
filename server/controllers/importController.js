const xlsx = require('xlsx');
const fs = require('fs');
const Invoice = require('../models/Invoice');
const Party = require('../models/Party');
const Product = require('../models/Product');
const Staff = require('../models/Staff');
const Route = require('../models/Route');
const ImportLog = require('../models/ImportLog');

// Helper to parse uploaded Excel / CSV buffer
const parseSpreadsheet = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });
  return jsonData;
};

// @desc    Preview & Validate uploaded Excel / CSV file
// @route   POST /api/import/preview
exports.previewFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel (.xlsx, .xls) or CSV (.csv) file' });
    }

    const { module = 'Sales GST Data' } = req.body;
    const records = parseSpreadsheet(req.file.path);

    if (!records || records.length === 0) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'The uploaded file contains no data rows' });
    }

    const detectedColumns = Object.keys(records[0] || {});

    // Standard column suggestions based on module
    const targetFields = {
      'Sales GST Data': ['invoiceNo', 'billDate', 'partyName', 'partyCode', 'city', 'route', 'productName', 'sku', 'qty', 'rate', 'gstRate', 'total'],
      'Sales Summary': ['invoiceNo', 'billDate', 'partyName', 'partyCode', 'grandTotal', 'paidAmount', 'pendingAmount', 'status'],
      'Stock Summary': ['name', 'sku', 'brand', 'category', 'currentStock', 'purchaseRate', 'sellingRate', 'mrp', 'gstRate', 'unit'],
      'Party / Route Mapping': ['code', 'name', 'city', 'route', 'beat', 'phone', 'category', 'creditLimit', 'outstanding'],
      'Staff Route Mapping': ['code', 'name', 'phone', 'role', 'assignedRoute', 'salesTarget']
    };

    // Auto-detect column mapping
    const columnMapping = {};
    const targets = targetFields[module] || targetFields['Sales GST Data'];

    targets.forEach(tf => {
      // Find matching detected column case-insensitively
      const match = detectedColumns.find(dc => {
        const cleanDc = dc.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanTf = tf.toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanDc.includes(cleanTf) || cleanTf.includes(cleanDc);
      });
      if (match) columnMapping[tf] = match;
    });

    // Check for duplicates within file
    const seenIds = new Set();
    let duplicateCount = 0;
    records.forEach(r => {
      const idKey = r['Invoice No'] || r['invoiceNo'] || r['Invoice Number'] || r['SKU'] || r['Code'] || r['Party Code'];
      if (idKey) {
        if (seenIds.has(String(idKey).toLowerCase().trim())) {
          duplicateCount++;
        } else {
          seenIds.add(String(idKey).toLowerCase().trim());
        }
      }
    });

    res.json({
      success: true,
      fileName: req.file.originalname,
      tempFilePath: req.file.path,
      fileType: req.file.originalname.split('.').pop(),
      totalRecords: records.length,
      detectedColumns,
      suggestedMapping: columnMapping,
      targetFields: targets,
      duplicatesInFile: duplicateCount,
      previewRows: records.slice(0, 10) // Preview first 10 rows
    });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Process & Execute Import into Database
// @route   POST /api/import/process
exports.processImport = async (req, res) => {
  try {
    const {
      tempFilePath,
      module = 'Sales GST Data',
      processingMode = 'Insert New & Update Existing',
      recalculateTotals = true,
      clearBlankFields = false,
      columnMapping = {}
    } = req.body;

    if (!tempFilePath || !fs.existsSync(tempFilePath)) {
      return res.status(400).json({ success: false, message: 'Upload session expired or file not found. Please upload again.' });
    }

    const records = parseSpreadsheet(tempFilePath);
    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    // Process based on module
    if (module === 'Stock Summary') {
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const skuCol = columnMapping['sku'] || 'SKU';
        const nameCol = columnMapping['name'] || 'Product Name' || 'Name';
        const skuVal = String(row[skuCol] || '').trim().toUpperCase();
        const nameVal = String(row[nameCol] || '').trim();

        if (!skuVal || !nameVal) {
          skippedCount++;
          errors.push({ row: i + 1, error: 'Missing required SKU or Product Name' });
          continue;
        }

        const brandVal = String(row[columnMapping['brand']] || row['Brand'] || 'General').trim();
        const catVal = String(row[columnMapping['category']] || row['Category'] || 'Grocery').trim();
        const stockVal = Number(row[columnMapping['currentStock']] || row['Current Stock'] || row['Stock'] || 0);
        const pRate = Number(row[columnMapping['purchaseRate']] || row['Purchase Rate'] || 0);
        const sRate = Number(row[columnMapping['sellingRate']] || row['Selling Rate'] || 0);
        const mrpVal = Number(row[columnMapping['mrp']] || row['MRP'] || sRate * 1.1);
        const gstVal = Number(row[columnMapping['gstRate']] || row['GST Rate'] || 18);

        const existing = await Product.findOne({ sku: skuVal });

        if (existing) {
          if (processingMode === 'Insert New Only') {
            skippedCount++;
            continue;
          }
          // Update Existing
          existing.name = nameVal || existing.name;
          existing.brand = brandVal || existing.brand;
          existing.category = catVal || existing.category;
          existing.currentStock = stockVal;
          if (pRate > 0) existing.purchaseRate = pRate;
          if (sRate > 0) existing.sellingRate = sRate;
          if (mrpVal > 0) existing.mrp = mrpVal;
          existing.gstRate = gstVal;
          await existing.save();
          updatedCount++;
        } else {
          if (processingMode === 'Update Existing Only') {
            skippedCount++;
            continue;
          }
          // Insert New
          await Product.create({
            name: nameVal,
            sku: skuVal,
            brand: brandVal,
            category: catVal,
            currentStock: stockVal,
            purchaseRate: pRate,
            sellingRate: sRate,
            mrp: mrpVal,
            gstRate: gstVal
          });
          insertedCount++;
        }
      }
    } else if (module === 'Party / Route Mapping') {
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const codeCol = columnMapping['code'] || 'Code' || 'Party Code';
        const nameCol = columnMapping['name'] || 'Party Name' || 'Name';
        const codeVal = String(row[codeCol] || '').trim().toUpperCase();
        const nameVal = String(row[nameCol] || '').trim();

        if (!codeVal || !nameVal) {
          skippedCount++;
          errors.push({ row: i + 1, error: 'Missing Party Code or Name' });
          continue;
        }

        const cityVal = String(row[columnMapping['city']] || row['City'] || 'Kanpur').trim();
        const routeVal = String(row[columnMapping['route']] || row['Route'] || 'Central Beat').trim();
        const beatVal = String(row[columnMapping['beat']] || row['Beat'] || 'General Beat').trim();
        const phoneVal = String(row[columnMapping['phone']] || row['Phone'] || '').trim();
        const catVal = String(row[columnMapping['category']] || row['Category'] || 'Retail Kirana').trim();
        const creditVal = Number(row[columnMapping['creditLimit']] || row['Credit Limit'] || 100000);
        const outVal = Number(row[columnMapping['outstanding']] || row['Outstanding'] || 0);

        const existing = await Party.findOne({ code: codeVal });

        if (existing) {
          if (processingMode === 'Insert New Only') {
            skippedCount++;
            continue;
          }
          existing.name = nameVal || existing.name;
          existing.city = cityVal || existing.city;
          existing.route = routeVal || existing.route;
          existing.beat = beatVal || existing.beat;
          if (phoneVal) existing.phone = phoneVal;
          existing.category = catVal || existing.category;
          if (creditVal > 0) existing.creditLimit = creditVal;
          if (outVal !== 0) existing.outstanding = outVal;
          await existing.save();
          updatedCount++;
        } else {
          if (processingMode === 'Update Existing Only') {
            skippedCount++;
            continue;
          }
          await Party.create({
            code: codeVal,
            name: nameVal,
            city: cityVal,
            route: routeVal,
            beat: beatVal,
            phone: phoneVal,
            category: catVal,
            creditLimit: creditVal,
            outstanding: outVal
          });
          insertedCount++;
        }
      }
    } else {
      // Default: Sales GST Data or Sales Summary
      for (let i = 0; i < records.length; i++) {
        const row = records[i];
        const invCol = columnMapping['invoiceNo'] || 'Invoice No' || 'Invoice Number' || 'Bill No';
        const partyCol = columnMapping['partyName'] || 'Party Name' || 'Customer Name';
        const invVal = String(row[invCol] || '').trim().toUpperCase();
        const partyVal = String(row[partyCol] || '').trim();

        if (!invVal || !partyVal) {
          skippedCount++;
          errors.push({ row: i + 1, error: 'Missing Invoice No or Party Name' });
          continue;
        }

        const totalVal = Number(row[columnMapping['grandTotal']] || row[columnMapping['total']] || row['Total'] || row['Grand Total'] || row['Invoice Amount'] || 0);
        const cityVal = String(row[columnMapping['city']] || row['City'] || 'Kanpur').trim();
        const routeVal = String(row[columnMapping['route']] || row['Route'] || 'Central Beat').trim();
        const statusVal = String(row[columnMapping['status']] || row['Status'] || 'Pending').trim();

        const existing = await Invoice.findOne({ invoiceNo: invVal });

        if (existing) {
          if (processingMode === 'Insert New Only') {
            skippedCount++;
            continue;
          }
          existing.partyName = partyVal;
          if (totalVal > 0) {
            existing.grandTotal = totalVal;
            existing.pendingAmount = Math.max(0, totalVal - (existing.paidAmount || 0));
          }
          existing.city = cityVal;
          existing.route = routeVal;
          existing.status = statusVal || existing.status;
          await existing.save();
          updatedCount++;
        } else {
          if (processingMode === 'Update Existing Only') {
            skippedCount++;
            continue;
          }
          // Find or create party
          let party = await Party.findOne({ name: partyVal });
          if (!party) {
            const pCode = `P${Math.floor(100 + Math.random() * 900)}`;
            party = await Party.create({
              name: partyVal,
              code: pCode,
              city: cityVal,
              route: routeVal,
              outstanding: totalVal
            });
          }

          await Invoice.create({
            invoiceNo: invVal,
            billDate: new Date(),
            dueDate: new Date(Date.now() + 15 * 86400000),
            party: party._id,
            partyName: party.name,
            partyCode: party.code,
            city: cityVal,
            route: routeVal,
            items: [],
            grandTotal: totalVal,
            paidAmount: 0,
            pendingAmount: totalVal,
            status: statusVal || 'Pending'
          });
          insertedCount++;
        }
      }
    }

    // Clean up temporary file
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);

    // Save audit log
    await ImportLog.create({
      module,
      fileName: 'imported_file.xlsx',
      processingMode,
      recalculateTotals,
      clearBlankFields,
      totalRecords: records.length,
      insertedCount,
      updatedCount,
      skippedCount,
      errors: errors.slice(0, 20),
      status: errors.length === 0 ? 'Success' : (insertedCount > 0 ? 'Partial' : 'Failed'),
      importedBy: req.user ? req.user.name : 'Administrator'
    });

    res.json({
      success: true,
      message: `Import Completed! Processed: ${records.length} | Inserted: ${insertedCount} | Updated: ${updatedCount} | Skipped: ${skippedCount}`,
      summary: {
        totalRecords: records.length,
        insertedCount,
        updatedCount,
        skippedCount,
        errorsCount: errors.length,
        errors: errors.slice(0, 10)
      }
    });
  } catch (err) {
    if (req.body.tempFilePath && fs.existsSync(req.body.tempFilePath)) {
      fs.unlinkSync(req.body.tempFilePath);
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

