/**
 * ==========================================================================
 * DS ENTERPRISES — 4-FILE EXCEL & CSV DATA INGESTION ENGINE
 * File: assets/js/excel-import.js
 * Ingests:
 *   1. Sales GST / Sales Detail (Excel Column O = Total Amount)
 *   2. Sales Summary (Invoice Status = Unpaid)
 *   3. Stock Summary (Batch, MRP, Purchase/Selling Price, Stock Value)
 *   4. Party / Route Mapping (Party, Category, City_1, City, Route)
 * ==========================================================================
 */

(function (window) {
  'use strict';

  let SELECTED_FILES = { sales: null, unpaid: null, stock: null, party: null, routemap: null };

  function norm(s) {
    return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function n(v) {
    if (v === null || v === undefined) return 0;
    let s = String(v).replace(/₹|,/g, '').replace(/[^0-9.\-]/g, '');
    return parseFloat(s) || 0;
  }

  function v7DateOnly(v) {
    if (v instanceof Date && !isNaN(v)) return new Date(v.getFullYear(), v.getMonth(), v.getDate());
    if (typeof v === 'number' && Number.isFinite(v)) {
      try {
        if (typeof XLSX !== 'undefined' && XLSX.SSF) {
          const d = XLSX.SSF.parse_date_code(v);
          return new Date(d.y, d.m - 1, d.d);
        }
      } catch (e) {}
    }
    const s = String(v ?? '').trim();
    if (!s) return null;
    let m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
    const d = new Date(s);
    return isNaN(d) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function fmtDate(v) {
    const d = v7DateOnly(v);
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function findHeader(rows, needed) {
    for (let i = 0; i < Math.min(rows.length, 35); i++) {
      let r = (rows[i] || []).map(x => String(x ?? '').trim());
      if (needed.every(need => r.some(c => c.toLowerCase() === need.toLowerCase()))) {
        return i;
      }
    }
    return -1;
  }

  function parseSalesRows(rows) {
    let hi = findHeader(rows, ['Date', 'Invoice No.', 'Party Name', 'Item Name', 'Quantity']);
    if (hi < 0) hi = findHeader(rows, ['Date', 'Bill No.', 'Party Name', 'Item Name', 'Quantity']);
    if (hi < 0) hi = findHeader(rows, ['Date', 'Bill No', 'Party Name', 'Item Name', 'Quantity']);
    if (hi < 0) hi = findHeader(rows, ['Date', 'Bill Number', 'Party Name', 'Item Name', 'Quantity']);
    if (hi < 0) hi = findHeader(rows, ['Invoice No', 'Party', 'Item', 'Qty']);
    if (hi < 0) hi = findHeader(rows, ['Bill No', 'Party', 'Item', 'Qty']);
    if (hi < 0) hi = findHeader(rows, ['Bill No.', 'Party', 'Item', 'Qty']);
    if (hi < 0) throw new Error('Sales GST header not found (expected: Date, Invoice/Bill No., Party Name, Item Name, Quantity).');

    const headerRowIndex = hi;
    const h = rows[headerRowIndex].map(x => String(x ?? '').trim());
    const idx = {};
    h.forEach((x, i) => { idx[x] = i; idx[x.toLowerCase()] = i; });

    const invKey = Object.keys(idx).find(k => [
      'invoice no.', 'invoice no', 'invoiceno', 'invoice number', 'invoice_no',
      'bill no.', 'bill no', 'billno', 'bill number', 'bill_no'
    ].includes(k.toLowerCase())) || 'Invoice No.';
    const dateKey = Object.keys(idx).find(k => ['date', 'invoicedate'].includes(k.toLowerCase())) || 'Date';
    const partyKey = Object.keys(idx).find(k => ['party name', 'party', 'store name'].includes(k.toLowerCase())) || 'Party Name';
    const itemKey = Object.keys(idx).find(k => ['item name', 'item', 'product'].includes(k.toLowerCase())) || 'Item Name';
    const qtyKey = Object.keys(idx).find(k => ['quantity', 'qty'].includes(k.toLowerCase())) || 'Quantity';
    const priceKey = Object.keys(idx).find(k => ['price/unit', 'rate', 'price'].includes(k.toLowerCase()));

    // Check if Column O (index 14) exists, or calculate amount
    const hasColO = rows.some(r => r && r.length > 14 && n(r[14]) > 0);

    return rows.slice(headerRowIndex + 1).filter(r => r && r[idx[invKey]]).map(r => {
      const invNo = String(r[idx[invKey]] ?? '').trim();
      const party = String(r[idx[partyKey]] ?? '').trim();
      const item = String(r[idx[itemKey]] ?? '').trim();
      const d = fmtDate(r[idx[dateKey]]);
      const qtyNum = n(r[idx[qtyKey]]);
      const priceNum = priceKey ? n(r[idx[priceKey]]) : 0;
      const amountNum = hasColO ? n(r[14]) : (n(r[idx['amount']]) || (qtyNum * priceNum));

      return {
        Date: d,
        date: d,
        'Invoice No.': invNo,
        invoiceNo: invNo,
        'Bill No.': invNo,
        billNo: invNo,
        invoice_no: invNo,
        bill_no: invNo,
        'Party Name': party,
        party: party,
        'Item Name': item,
        item: item,
        Quantity: String(r[idx[qtyKey]] ?? ''),
        QtyNum: qtyNum,
        qty: qtyNum,
        PriceNum: priceNum,
        rate: priceNum,
        AmountNum: amountNum,
        amount: amountNum,
        Brand: '',
        brand: '',
        Category: '',
        category: '',
        PurchasePrice: 0,
        Margin: 0,
        MarginPct: 0,
        Status: 'Paid',
        status: 'Paid',
        City: '',
        city: '',
        City_1: '',
        city1: '',
        Route: '',
        route: '',
        'Party Category': '',
        partyCategory: ''
      };
    });
  }

  function parseUnpaidRows(rows) {
    const normh = v => String(v ?? '').trim().toLowerCase().replace(/[\s_.-]+/g, '');
    let hi = -1, idx = {};
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
      const h = (rows[i] || []).map(normh);
      const inv = h.findIndex(x => ['invoiceno', 'invoicenumber', 'invoice', 'billno', 'billnumber', 'bill', 'billno.', 'bill_no'].includes(x));
      const status = h.findIndex(x => ['invoicestatus', 'status', 'paymentstatus', 'state'].includes(x));
      const date = h.findIndex(x => ['invoicedate', 'date'].includes(x));
      const party = h.findIndex(x => ['contactname', 'partyname', 'customername', 'party'].includes(x));
      const rem = h.findIndex(x => ['remainingamount', 'remaining', 'balance', 'outstanding', 'balanceamount', 'totalamount'].includes(x));
      if (inv >= 0 && status >= 0) {
        hi = i;
        idx = { inv, status, date, party, rem };
        break;
      }
    }
    if (hi < 0) {
      throw new Error('Sales Summary header not found (expected: Invoice No + Invoice Status).');
    }
    const out = [];
    for (const r of rows.slice(hi + 1)) {
      if (!r) continue;
      const invoice = String(r[idx.inv] ?? '').trim();
      const status = String(r[idx.status] ?? '').trim().toLowerCase();
      // Allow unpaid, pending, due, overdue
      if (!invoice || (!['unpaid', 'pending', 'due', 'overdue'].includes(status))) continue;
      const amt = idx.rem >= 0 ? n(r[idx.rem]) : 0;
      const d = idx.date >= 0 ? fmtDate(r[idx.date]) : '';
      const p = idx.party >= 0 ? String(r[idx.party] ?? '').trim() : '';

      out.push({
        invoice: invoice,
        billNo: invoice,
        invoiceNo: invoice,
        bill_no: invoice,
        invoice_no: invoice,
        date: d,
        party: p,
        amount: amt,
        balanceAmount: amt,
        totalAmount: amt,
        status: 'Unpaid'
      });
    }
    if (!out.length) {
      throw new Error('No records with Invoice Status = Unpaid found in Sales Summary.');
    }
    return out;
  }

  function parseStockRows(rows) {
    let hi = findHeader(rows, ['Name', 'Purchase Price', 'Selling Price', 'Stock Quantity', 'Stock Value', 'Brand']);
    if (hi < 0) {
      hi = findHeader(rows, ['Name', 'Stock Quantity', 'Brand']);
      if (hi < 0) throw new Error('Stock header not found (expected: Name, Purchase Price, Selling Price, Stock Quantity, Stock Value, Brand).');
    }
    let h = rows[hi].map(x => String(x ?? '').trim());
    let idx = {};
    h.forEach((x, i) => { idx[x] = i; idx[x.toLowerCase()] = i; });

    const nameKey = Object.keys(idx).find(k => k.toLowerCase() === 'name') || 'Name';
    const brandKey = Object.keys(idx).find(k => k.toLowerCase() === 'brand') || 'Brand';
    const firmKey = Object.keys(idx).find(k => ['firm name', 'firm', 'company'].includes(k.toLowerCase()));
    const pPriceKey = Object.keys(idx).find(k => ['purchase price', 'pur price', 'cost'].includes(k.toLowerCase()));
    const sPriceKey = Object.keys(idx).find(k => ['selling price', 'sale price', 'rate'].includes(k.toLowerCase()));
    const qtyKey = Object.keys(idx).find(k => ['stock quantity', 'stock qty', 'quantity', 'qty'].includes(k.toLowerCase()));
    const valKey = Object.keys(idx).find(k => ['stock value', 'value', 'amount'].includes(k.toLowerCase()));
    const catKey = Object.keys(idx).find(k => ['item category name', 'category', 'item category'].includes(k.toLowerCase()));
    const mrpKey = Object.keys(idx).find(k => k.toLowerCase() === 'mrp');

    return rows.slice(hi + 1).filter(r => r && r[idx[nameKey]]).map(r => {
      const name = String(r[idx[nameKey]] ?? '').trim();
      const brand = String(r[idx[brandKey]] ?? '').trim();
      const firm = firmKey ? String(r[idx[firmKey]] ?? '').trim() : '';
      const pPrice = pPriceKey ? n(r[idx[pPriceKey]]) : 0;
      const sPrice = sPriceKey ? n(r[idx[sPriceKey]]) : 0;
      const sQty = qtyKey ? n(r[idx[qtyKey]]) : 0;
      const sVal = valKey ? n(r[idx[valKey]]) : (sQty * sPrice);
      const cat = catKey ? String(r[idx[catKey]] ?? '').trim() : 'General';
      const mrp = mrpKey ? n(r[idx[mrpKey]]) : sPrice;

      return {
        'Firm Name': firm,
        Firm: firm,
        firm: firm,
        'Name': name,
        name: name,
        'Brand': brand,
        brand: brand,
        'Purchase Price': pPrice,
        rate: sPrice,
        'Selling Price': sPrice,
        'Stock Quantity': sQty,
        stock: sQty,
        'Stock Value': sVal,
        value: sVal,
        'Item Category Name': cat,
        category: cat,
        'MRP': mrp,
        mrp: mrp
      };
    });
  }

  function parsePartyRows(rows) {
    if (!Array.isArray(rows) || !rows.length) throw new Error('Party mapping file is empty');
    const normHead = v => String(v ?? '').trim().toLowerCase().replace(/[\s_.-]+/g, '');
    const aliases = {
      name: ['name', 'partyname', 'party', 'storename', 'customername', 'outletname'],
      mob: ['mobno', 'mobile', 'mobileno', 'mobilenumber', 'contact', 'contactno', 'phone', 'phonenumber'],
      category: ['partycategory', 'category', 'customercategory', 'storecategory'],
      route: ['route', 'routename', 'beat'],
      city1: ['city1', 'city_1', 'citylevel1', 'maincity'],
      city: ['city', 'cityname', 'location']
    };
    let hi = -1, idx = {};
    for (let i = 0; i < Math.min(rows.length, 40); i++) {
      const h = Array.isArray(rows[i]) ? rows[i].map(normHead) : [];
      const found = {};
      for (const [key, list] of Object.entries(aliases)) {
        const pos = h.findIndex(v => list.some(a => normHead(a) === v));
        if (pos >= 0) found[key] = pos;
      }
      if (found.name !== undefined && (found.route !== undefined || found.city !== undefined || found.city1 !== undefined)) {
        hi = i;
        idx = found;
        break;
      }
    }
    if (hi < 0) throw new Error('Party mapping header not found. Expected Party/Store Name plus Route or City columns.');
    const val = (r, key) => idx[key] === undefined ? '' : String(r[idx[key]] ?? '').trim();

    return rows.slice(hi + 1).map(r => ({
      'Name': val(r, 'name'),
      name: val(r, 'name'),
      'Mob No.': val(r, 'mob'),
      phone: val(r, 'mob'),
      'Party Category': val(r, 'category') || 'B - Retail Kirana',
      category: val(r, 'category') || 'B - Retail Kirana',
      'Route': val(r, 'route') || 'General Route',
      route: val(r, 'route') || 'General Route',
      'City_1': val(r, 'city1') || val(r, 'city') || 'Kanpur',
      city1: val(r, 'city1') || val(r, 'city') || 'Kanpur',
      'City': val(r, 'city') || 'Kanpur',
      city: val(r, 'city') || 'Kanpur'
    })).filter(r => r.name);
  }

  function parseRouteMapRows(rows) {
    if (!Array.isArray(rows) || !rows.length) return [];
    const normHead = v => String(v ?? '').trim().toLowerCase().replace(/[\s_.-]+/g, '');
    const aliases = {
      id: ['salesofficerid', 'soid', 'userid', 'staffid', 'id', 'code'],
      name: ['salesofficername', 'salesperson', 'staffname', 'officername', 'name'],
      route: ['assignedroutebeat', 'assignedroute', 'routebeat', 'routename', 'route', 'beat', 'beatname'],
      day: ['dayschedule', 'day', 'schedule', 'frequency'],
      area: ['area', 'market', 'location']
    };

    let hi = -1, idx = {};
    for (let i = 0; i < Math.min(rows.length, 40); i++) {
      const h = Array.isArray(rows[i]) ? rows[i].map(normHead) : [];
      const found = {};
      for (const [key, list] of Object.entries(aliases)) {
        const pos = h.findIndex(v => list.some(a => normHead(a) === v));
        if (pos >= 0) found[key] = pos;
      }
      if ((found.id !== undefined || found.name !== undefined) && found.route !== undefined) {
        hi = i;
        idx = found;
        break;
      }
    }

    if (hi < 0) return [];
    const val = (r, key) => idx[key] === undefined ? '' : String(r[idx[key]] ?? '').trim();

    return rows.slice(hi + 1).map(r => ({
      staffId: val(r, 'id'),
      staffName: val(r, 'name'),
      route: val(r, 'route'),
      day: val(r, 'day'),
      area: val(r, 'area')
    })).filter(r => r.route && (r.staffId || r.staffName));
  }

  function findUploadSheet(wb, kind) {
    let best = wb.SheetNames[0], score = -1;
    wb.SheetNames.forEach(name => {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });
      const text = rows.slice(0, 40).map(r => (r || []).join('|')).join('|').toLowerCase();
      let z = 0;
      if (kind === 'sales') {
        if (/invoice no/.test(text)) z += 4;
        if (/party name/.test(text)) z += 3;
        if (/item name/.test(text)) z += 3;
        if (/quantity/.test(text)) z += 3;
        if (rows.some(r => r && r.length >= 15)) z += 5;
      } else if (kind === 'unpaid') {
        if (/invoice no/.test(text)) z += 4;
        if (/invoice status/.test(text)) z += 5;
        if (/remaining amount/.test(text)) z += 3;
      } else if (kind === 'stock') {
        if (/\bname\b/.test(text)) z += 3;
        if (/stock quantity/.test(text)) z += 3;
        if (/\bbrand\b/.test(text)) z += 3;
      } else if (kind === 'party') {
        if (/\bname\b/.test(text)) z += 3;
        if (/route|beat/.test(text)) z += 3;
        if (/city/.test(text)) z += 2;
      } else if (kind === 'routemap') {
        if (/officer|sales|staff/.test(text)) z += 4;
        if (/route|beat/.test(text)) z += 4;
      }
      if (z > score) {
        score = z;
        best = name;
      }
    });
    return best;
  }

  async function parseUploadFile(kind, file) {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    if (!wb.SheetNames.length) throw new Error('Workbook contains no sheets.');
    const sheetName = findUploadSheet(wb, kind);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '', raw: true });

    let parsed = [];
    if (kind === 'sales') parsed = parseSalesRows(rows);
    else if (kind === 'unpaid') parsed = parseUnpaidRows(rows);
    else if (kind === 'stock') parsed = parseStockRows(rows);
    else if (kind === 'party') parsed = parsePartyRows(rows);
    else if (kind === 'routemap') parsed = parseRouteMapRows(rows);

    if (!parsed.length) throw new Error(`No usable records parsed for ${kind}.`);
    return { parsed, sheet: sheetName };
  }

  function remap(db) {
    const stockMap = new Map((db.stock || []).map(x => [norm(x.Name || x.name), x]));
    const partyMap = new Map((db.party || []).map(x => [norm(x.Name || x.name), x]));
    const unpaidSet = new Set((db.unpaid || []).map(x => String(x.invoice || x.billNo || x.invoiceNo || '').trim()).filter(Boolean));

    (db.sales || []).forEach(x => {
      const itemName = x['Item Name'] || x.item || '';
      const partyName = x['Party Name'] || x.party || '';
      const inv = String(x['Invoice No.'] || x.invoiceNo || '').trim();

      const sr = stockMap.get(norm(itemName));
      x.Brand = sr ? (sr.Brand || sr.brand || 'UNMAPPED') : 'UNMAPPED';
      x.brand = x.Brand;
      x.Category = sr ? (sr['Item Category Name'] || sr.category || 'UNMAPPED') : 'UNMAPPED';
      x.category = x.Category;
      x.PurchasePrice = sr ? n(sr['Purchase Price']) : 0;

      const price = n(x.PriceNum || x.rate);
      const qty = n(x.QtyNum || x.qty);
      x.Margin = Number(((price - x.PurchasePrice) * qty).toFixed(2));
      x.MarginPct = (price * qty) ? Number((x.Margin / (price * qty) * 100).toFixed(2)) : 0;

      const pr = partyMap.get(norm(partyName));
      x.City = pr ? (pr.City || pr.city || 'Kanpur') : 'Kanpur';
      x.city = x.City;
      x.City_1 = pr ? (pr.City_1 || pr.city1 || 'Kanpur') : 'Kanpur';
      x.city1 = x.City_1;
      x.Route = pr ? (pr.Route || pr.route || 'General Route') : 'General Route';
      x.route = x.Route;
      x['Party Category'] = pr ? (pr['Party Category'] || pr.category || 'B - Retail Kirana') : 'B - Retail Kirana';
      x.partyCategory = x['Party Category'];

      const isUnpaid = unpaidSet.has(inv);
      x.Status = isUnpaid ? 'Unpaid' : 'Paid';
      x.status = x.Status;
    });
  }

  let CURRENT_BULK_PREVIEW = null;

  function sanitizeCsvCell(v) {
    let str = String(v ?? '').trim();
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    if (/[",\n\r]/.test(str)) {
      str = '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function downloadCsvFile(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const DS_ExcelImport = {
    init: function () {
      this.bindInputs();
      this.bindBulkInputs();
      const params = new URLSearchParams(window.location.search);
      if (params.get('tab') === 'history') {
        this.switchTab('history');
      } else if (params.get('tab') === 'legacy') {
        this.switchTab('legacy');
      }
    },

    switchTab: function (tab) {
      const tabs = ['bulk', 'history', 'legacy'];
      tabs.forEach(t => {
        const btn = document.getElementById('tabBtn' + t.charAt(0).toUpperCase() + t.slice(1));
        const content = document.getElementById('tabContent' + t.charAt(0).toUpperCase() + t.slice(1));
        if (btn) {
          if (t === tab) {
            btn.style.background = 'var(--ds-primary, #1e3a8a)';
            btn.style.color = '#ffffff';
            btn.style.fontWeight = '800';
          } else {
            btn.style.background = 'transparent';
            btn.style.color = '#64748b';
            btn.style.fontWeight = '700';
          }
        }
        if (content) {
          content.style.display = (t === tab) ? 'block' : 'none';
        }
      });

      if (tab === 'history') {
        this.loadImportHistory();
      }
    },

    download100BillsTemplate: function () {
      const link = document.createElement('a');
      link.href = '../data/DS_Sample_100_Bills_Template.csv';
      link.download = 'DS_Enterprises_100_Bills_Template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (window.DS_App && DS_App.toast) {
        DS_App.toast('⬇ Sample 100-Bill Template download started.', 'info');
      }
    },

    bindBulkInputs: function () {
      const fileInp = document.getElementById('bulkBillFileInput');
      if (fileInp) {
        fileInp.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (file) this.handleBulkFile(file);
        });
      }

      // Drag and drop support
      const dropZone = fileInp ? fileInp.closest('div[style*="dashed"]') : null;
      if (dropZone) {
        ['dragenter', 'dragover'].forEach(name => {
          dropZone.addEventListener(name, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.style.background = '#dbeafe';
          });
        });
        ['dragleave', 'drop'].forEach(name => {
          dropZone.addEventListener(name, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.style.background = '#eff6ff';
          });
        });
        dropZone.addEventListener('drop', (e) => {
          const dt = e.dataTransfer;
          const files = dt.files;
          if (files && files.length) {
            this.handleBulkFile(files[0]);
          }
        });
      }
    },

    handleBulkFile: async function (file) {
      if (!file) return;
      const validExts = ['.xlsx', '.xls', '.csv'];
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!validExts.includes(ext)) {
        if (window.DS_App && DS_App.toast) DS_App.toast('Invalid file format. Please upload .xlsx, .xls, or .csv', 'error');
        return;
      }

      const previewSec = document.getElementById('bulkPreviewSection');
      if (previewSec) {
        previewSec.style.display = 'block';
        previewSec.innerHTML = `
          <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:12px; padding:32px; text-align:center;">
            <div style="font-size:32px; animation:spin 1s linear infinite;">⏳</div>
            <h4 style="margin:12px 0 4px; color:#1e293b;">Reading and validating "${file.name}"...</h4>
            <p style="color:#64748b; font-size:13px; margin:0;">Parsing headers, checking existing database records, and computing change diffs.</p>
          </div>
        `;
      }

      try {
        const arrayBuf = await file.arrayBuffer();
        let rows = [];
        if (typeof XLSX !== 'undefined') {
          const wb = XLSX.read(arrayBuf, { type: 'array', cellDates: true });
          const firstSheet = wb.Sheets[wb.SheetNames[0]];
          rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: false });
        } else {
          throw new Error('XLSX library not loaded. Please refresh the page.');
        }

        if (!rows.length) {
          throw new Error('Uploaded file contains no data rows.');
        }

        const mode = document.querySelector('input[name="importModeRadio"]:checked')?.value || 'insert_update';
        const clearBlank = document.getElementById('chkClearBlankFields')?.checked || false;
        const recalcTax = document.getElementById('chkRecalcTaxes')?.checked !== false;

        const previewRes = await window.DS_API.previewBillsImport(rows, mode, clearBlank, recalcTax);

        if (!previewRes || !previewRes.success) {
          throw new Error(previewRes?.error || 'Validation failed on backend.');
        }

        CURRENT_BULK_PREVIEW = {
          file: file,
          filename: file.name,
          mode: mode,
          clearBlank: clearBlank,
          recalcTax: recalcTax,
          result: previewRes,
          rows: rows
        };

        this.renderBulkPreview(previewRes, file.name, mode);

      } catch (err) {
        console.error('[DS_ExcelImport] Bulk preview error:', err);
        if (previewSec) {
          previewSec.innerHTML = `
            <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:12px; padding:20px; color:#991b1b;">
              <h4 style="margin:0 0 6px; font-weight:800;">✕ Ingestion Preview Error</h4>
              <p style="margin:0; font-size:13px;">${err.message}</p>
            </div>
          `;
        }
        if (window.DS_App && DS_App.toast) DS_App.toast('Error reading file: ' + err.message, 'error');
      }
    },

    renderBulkPreview: function (data, filename, mode) {
      const previewSec = document.getElementById('bulkPreviewSection');
      if (!previewSec) return;

      const summary = data.summary || {};
      const total = summary.total || 0;
      const toInsert = summary.to_insert || 0;
      const toUpdate = summary.to_update || 0;
      const unchanged = summary.unchanged || 0;
      const failed = summary.failed || 0;
      const validCount = toInsert + toUpdate + unchanged;

      const modeLabels = {
        'insert_update': 'Insert New & Update Existing',
        'insert': 'Insert New Only',
        'update': 'Update Existing Only'
      };

      let html = `
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:12px; box-shadow:0 2px 4px -1px rgba(0,0,0,0.03); margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px; border-bottom:1px solid #f1f5f9; padding-bottom:8px;">
            <div>
              <h4 style="margin:0 0 2px; font-size:14px; font-weight:800; color:#1e293b;">Ingestion Preview: ${filename}</h4>
              <div style="font-size:11.5px; color:#64748b;">
                Selected Mode: <strong>${modeLabels[mode] || mode}</strong> • Target Rows: <strong>${total}</strong>
              </div>
            </div>
            <div style="display:flex; gap:6px;">
              ${failed > 0 ? `
                <button type="button" class="btn btn-secondary btn-sm" onclick="DS_ExcelImport.downloadErrorReport()" style="color:#b91c1c; border-color:#fca5a5; font-weight:700; padding:4px 8px; font-size:11.5px;">
                  Download Error Report (${failed} rows)
                </button>
              ` : ''}
              ${validCount > 0 ? `
                <button type="button" class="btn btn-success btn-sm" id="btnConfirmBulkExecute" onclick="DS_ExcelImport.confirmAndExecute()" style="font-weight:700; padding:5px 12px; font-size:11.5px;">
                  Confirm & Execute Import (${validCount} Records)
                </button>
              ` : ''}
            </div>
          </div>

          <!-- 4 KPI Summary Pill Cards -->
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:12px; margin-bottom:20px;">
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px; text-align:center;">
              <div style="font-size:11px; color:#64748b; font-weight:700; text-transform:uppercase;">Total In Sheet</div>
              <div style="font-size:22px; font-weight:800; color:#1e293b;">${total}</div>
            </div>
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:12px; text-align:center;">
              <div style="font-size:11px; color:#166534; font-weight:700; text-transform:uppercase;">New To Create</div>
              <div style="font-size:22px; font-weight:800; color:#15803d;">+${toInsert}</div>
            </div>
            <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:12px; text-align:center;">
              <div style="font-size:11px; color:#b45309; font-weight:700; text-transform:uppercase;">To Update</div>
              <div style="font-size:22px; font-weight:800; color:#d97706;">↻ ${toUpdate}</div>
            </div>
            <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:10px; padding:12px; text-align:center;">
              <div style="font-size:11px; color:#475569; font-weight:700; text-transform:uppercase;">Unchanged</div>
              <div style="font-size:22px; font-weight:800; color:#64748b;">${unchanged}</div>
            </div>
            <div style="background:${failed > 0 ? '#fef2f2' : '#f8fafc'}; border:1px solid ${failed > 0 ? '#fecaca' : '#e2e8f0'}; border-radius:10px; padding:12px; text-align:center;">
              <div style="font-size:11px; color:${failed > 0 ? '#b91c1c' : '#64748b'}; font-weight:700; text-transform:uppercase;">Failed / Invalid</div>
              <div style="font-size:22px; font-weight:800; color:${failed > 0 ? '#dc2626' : '#94a3b8'};">${failed}</div>
            </div>
          </div>
      `;

      if (failed > 0 && Array.isArray(data.invalid_rows) && data.invalid_rows.length) {
        html += `
          <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:14px; margin-bottom:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <strong style="color:#991b1b; font-size:13px;">⚠️ Invalid Rows Detected (${data.invalid_rows.length} rows will be skipped):</strong>
              <button type="button" class="btn btn-secondary btn-sm" onclick="DS_ExcelImport.downloadErrorReport()" style="font-size:11px; padding:4px 8px; color:#b91c1c;">
                Download Error Log (.CSV)
              </button>
            </div>
            <div style="max-height:160px; overflow-y:auto; border:1px solid #fca5a5; border-radius:6px; background:#ffffff;">
              <table class="ds-table" style="font-size:12px; margin:0;">
                <thead>
                  <tr style="background:#fee2e2; color:#991b1b;">
                    <th style="width:70px;">Excel Row</th>
                    <th>Identifier</th>
                    <th>Customer</th>
                    <th>Error Reason</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.invalid_rows.map(r => `
                    <tr>
                      <td style="font-weight:700; color:#991b1b;">Row #${r.row_num || '-'}</td>
                      <td><code>${r.identifier || '(Blank)'}</code></td>
                      <td>${r.party_name || '-'}</td>
                      <td style="color:#dc2626; font-weight:600;">${r.reason || 'Invalid data'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      if (Array.isArray(data.preview_rows) && data.preview_rows.length) {
        html += `
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
              <strong style="color:#1e293b; font-size:13px;">Valid Records Preview (Showing up to 25 rows):</strong>
              <span style="font-size:11px; color:#64748b;">${data.preview_rows.length} records ready</span>
            </div>
            <div class="ds-table-wrap" style="max-height:360px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:8px;">
              <table class="ds-table" style="font-size:12px;">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Invoice / Bill No.</th>
                    <th>Customer / Retailer</th>
                    <th>Date</th>
                    <th class="num">Amount</th>
                    <th>Payment</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.preview_rows.slice(0, 25).map(r => {
                    let actionBadge = '';
                    if (r.action === 'insert') {
                      actionBadge = `<span class="badge" style="background:#dcfce7; color:#15803d; font-weight:700;">+ NEW</span>`;
                    } else if (r.action === 'update') {
                      actionBadge = `<span class="badge" style="background:#fef3c7; color:#b45309; font-weight:700;">↻ UPDATE</span>`;
                    } else {
                      actionBadge = `<span class="badge" style="background:#f1f5f9; color:#475569; font-weight:600;">UNCHANGED</span>`;
                    }
                    return `
                      <tr>
                        <td>${actionBadge}</td>
                        <td><strong style="font-family:monospace; color:#1d4ed8;">${r.invoice_no || r.bill_no || '(Auto)'}</strong></td>
                        <td>${r.party_name || '-'}</td>
                        <td>${r.invoice_date || '-'}</td>
                        <td class="num" style="font-weight:700;">₹${Number(r.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td><span class="badge ${r.status === 'Paid' ? 'badge-success' : 'badge-warning'}">${r.status || 'Unpaid'}</span></td>
                        <td style="font-size:11px; color:#64748b;">${r.action === 'update' && r.diffs ? Object.keys(r.diffs).length + ' field(s) changed' : (r.item_name ? r.item_name + ' (Qty: ' + (r.qty || 1) + ')' : '-')}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      html += `</div>`;
      previewSec.innerHTML = html;
    },

    downloadErrorReport: function () {
      if (!CURRENT_BULK_PREVIEW || !CURRENT_BULK_PREVIEW.result || !CURRENT_BULK_PREVIEW.result.invalid_rows) {
        if (window.DS_App && DS_App.toast) DS_App.toast('No error records to export.', 'info');
        return;
      }

      const rows = CURRENT_BULK_PREVIEW.result.invalid_rows;
      const headers = ['Excel Row Number', 'Unique Identifier', 'Customer Name', 'Reason for Failure'];
      let csv = headers.map(sanitizeCsvCell).join(',') + '\r\n';

      rows.forEach(r => {
        const line = [
          r.row_num || '',
          r.identifier || '',
          r.party_name || '',
          r.reason || ''
        ];
        csv += line.map(sanitizeCsvCell).join(',') + '\r\n';
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      downloadCsvFile(csv, `DS_Import_Error_Report_${dateStr}.csv`);
      if (window.DS_App && DS_App.toast) DS_App.toast('✓ Error report exported successfully.', 'success');
    },

    confirmAndExecute: async function () {
      if (!CURRENT_BULK_PREVIEW) return;

      const summary = CURRENT_BULK_PREVIEW.result.summary || {};
      const toInsert = summary.to_insert || 0;
      const toUpdate = summary.to_update || 0;
      const unchanged = summary.unchanged || 0;
      const totalValid = toInsert + toUpdate + unchanged;

      const confirmMsg = `Proceed with bulk ingestion of ${totalValid} records?\n\n` +
        `• New records to insert: ${toInsert}\n` +
        `• Existing records to update: ${toUpdate}\n` +
        `• Unchanged records: ${unchanged}\n\n` +
        `All updates are performed within a protected database transaction. Existing bill numbers are permanently preserved.`;

      if (!confirm(confirmMsg)) return;

      const btn = document.getElementById('btnConfirmBulkExecute');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Executing Batch Transaction...';
      }

      try {
        const payload = {
          batch_id: CURRENT_BULK_PREVIEW.result.batch_id,
          filename: CURRENT_BULK_PREVIEW.filename,
          mode: CURRENT_BULK_PREVIEW.mode,
          clear_blank_fields: CURRENT_BULK_PREVIEW.clearBlank,
          recalc_taxes: CURRENT_BULK_PREVIEW.recalcTax,
          user: window.DS_Auth && window.DS_Auth.getUser() ? window.DS_Auth.getUser().name : 'Admin',
          user_id: window.DS_Auth && window.DS_Auth.getUser() ? window.DS_Auth.getUser().id : 'ADMIN-1',
          rows: CURRENT_BULK_PREVIEW.rows
        };

        const res = await window.DS_API.executeBillsImport(payload);

        if (!res || !res.success) {
          throw new Error(res?.error || 'Batch execution failed.');
        }

        // Bridge Two-Way Storage: immediately update window.DS_Storage with the imported dataset
        await this.syncBulkRowsToStorage(CURRENT_BULK_PREVIEW.rows);

        const counts = res.counts || res.summary || {};
        const successMsg = `✓ Ingestion completed! Inserted: ${counts.inserted || 0}, Updated: ${counts.updated || 0}, Unchanged: ${counts.unchanged || 0}, Failed: ${counts.failed || 0}.`;

        if (window.DS_App && DS_App.toast) {
          DS_App.toast(successMsg, 'success');
        }

        const previewSec = document.getElementById('bulkPreviewSection');
        if (previewSec) {
          previewSec.innerHTML = `
            <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:16px; text-align:center; color:#166534;">
              <h4 style="margin:0 0 4px; font-size:16px; font-weight:800;">Bulk Import Successfully Executed!</h4>
              <p style="margin:0 0 12px; font-size:13px;">${successMsg}</p>
              <div style="display:flex; gap:8px; justify-content:center;">
                <button type="button" class="btn btn-primary btn-sm" onclick="DS_ExcelImport.switchTab('history')">
                  View Import History & Audit Trail
                </button>
                <a href="sales-analysis.html" class="btn btn-secondary btn-sm">
                  View Updated Sales Records
                </a>
              </div>
            </div>
          `;
        }

        const fileInp = document.getElementById('bulkBillFileInput');
        if (fileInp) fileInp.value = '';
        CURRENT_BULK_PREVIEW = null;

      } catch (err) {
        console.error('[DS_ExcelImport] Execution error:', err);
        if (window.DS_App && DS_App.toast) DS_App.toast('Execution failed: ' + err.message, 'error');
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Retry Import Execution';
        }
      }
    },

    syncBulkRowsToStorage: async function (rows) {
      if (!Array.isArray(rows) || !rows.length || !window.DS_Storage) return;

      const db = window.DS_Storage.getDB() || { sales: [], party: [], stock: [], unpaid: [] };
      if (!Array.isArray(db.sales)) db.sales = [];
      if (!Array.isArray(db.party)) db.party = [];
      if (!Array.isArray(db.stock)) db.stock = [];
      if (!Array.isArray(db.unpaid)) db.unpaid = [];

      const salesMap = new Map();
      db.sales.forEach(s => {
        const k1 = s.bill_no || s['Bill No.'] || s.billNo || '';
        const k2 = s.invoice_no || s['Invoice No.'] || s.invoiceNo || '';
        if (k1) salesMap.set('bill:' + k1.trim().toLowerCase(), s);
        if (k2) salesMap.set('inv:' + k2.trim().toLowerCase(), s);
      });

      const partyMap = new Map(db.party.map(p => [(p.name || p.Name || '').trim().toLowerCase(), p]));
      const stockMap = new Map(db.stock.map(st => [(st.name || st.Name || '').trim().toLowerCase(), st]));
      const unpaidMap = new Map(db.unpaid.map(u => [(u.invoice || u.billNo || u.invoiceNo || '').trim().toLowerCase(), u]));

      rows.forEach((r, idx) => {
        const billNo = String(r['Bill Number'] || r['bill_no'] || r['Bill No.'] || r['billno'] || r['bill'] || '').trim();
        const invNo = String(r['Invoice Number'] || r['invoice_no'] || r['Invoice No.'] || r['invoiceno'] || r['invoice'] || '').trim();
        const date = fmtDate(r['Date'] || r['invoice_date'] || r['invoicedate'] || r['date'] || new Date());
        const party = String(r['Customer Name'] || r['Party Name'] || r['party'] || r['customer'] || r['Store Name'] || '').trim();
        if (!party) return;
        const phone = String(r['Customer Phone'] || r['Party Contact'] || r['phone'] || r['Mob No.'] || r['contact'] || '').trim();
        const route = String(r['Route'] || r['beat'] || 'General Route').trim();
        const city = String(r['City'] || 'Kanpur').trim();
        const code = String(r['Product Code'] || r['Item Code'] || r['sku'] || '').trim();
        const item = String(r['Product Name'] || r['Item Name'] || r['item'] || r['product'] || 'General Item').trim();
        const brand = String(r['Brand'] || r['brand'] || 'General').trim();
        const category = String(r['Category'] || r['category'] || 'FMCG').trim();
        const qty = n(r['Quantity'] || r['qty'] || 1);
        const rate = n(r['Rate'] || r['Price'] || r['price'] || 0);
        const mrp = n(r['MRP'] || r['mrp'] || rate);
        const tax = n(r['Tax Amount'] || r['tax'] || 0);
        const amount = n(r['Total Amount'] || r['amount'] || r['total'] || (qty * rate));
        const payStatus = String(r['Payment Status'] || r['payment_status'] || r['status'] || 'Paid').trim();
        const sp = String(r['Sales Person'] || r['sales_person'] || 'Admin').trim();

        const unifiedNo = billNo || invNo || ('INV-' + date.slice(0, 4) + '-' + String(idx + 1).padStart(4, '0'));
        const stdRecord = {
          id: r.id || ('BILL-' + Date.now() + '-' + idx),
          bill_no: unifiedNo,
          billNo: unifiedNo,
          'Bill No.': unifiedNo,
          invoice_no: unifiedNo,
          invoiceNo: unifiedNo,
          'Invoice No.': unifiedNo,
          date: date,
          Date: date,
          invoice_date: date,
          party_name: party,
          party: party,
          'Party Name': party,
          party_contact: phone,
          phone: phone,
          item_name: item,
          item: item,
          'Item Name': item,
          brand: brand,
          Brand: brand,
          category: category,
          Category: category,
          'Party Category': category,
          partyCategory: category,
          route: route,
          Route: route,
          city: city,
          City: city,
          city1: city,
          City_1: city,
          qty: qty,
          QtyNum: qty,
          Quantity: String(qty),
          rate: rate,
          PriceNum: rate,
          mrp: mrp,
          tax_amount: tax,
          amount: amount,
          AmountNum: amount,
          total_amount: amount,
          subtotal: amount - tax,
          status: payStatus,
          Status: payStatus,
          payment_status: payStatus,
          sales_person: sp,
          PurchasePrice: Number((rate * 0.8).toFixed(2)),
          Margin: Number(((rate - (rate * 0.8)) * qty).toFixed(2)),
          MarginPct: 20
        };

        const matchKey = billNo ? ('bill:' + billNo.toLowerCase()) : (invNo ? ('inv:' + invNo.toLowerCase()) : null);
        const existing = matchKey ? salesMap.get(matchKey) : null;
        if (existing) {
          Object.assign(existing, stdRecord);
        } else {
          db.sales.unshift(stdRecord);
          if (billNo) salesMap.set('bill:' + billNo.toLowerCase(), stdRecord);
          if (invNo) salesMap.set('inv:' + invNo.toLowerCase(), stdRecord);
        }

        // Party master sync
        const normP = party.toLowerCase();
        if (!partyMap.has(normP)) {
          const newParty = {
            id: r.party_id || ('P' + Math.floor(1000 + Math.random() * 9000)),
            name: party,
            Name: party,
            phone: phone,
            'Mob No.': phone,
            route: route,
            Route: route,
            city: city,
            City: city,
            city1: city,
            City_1: city,
            category: category,
            'Party Category': category,
            creditLimit: 50000,
            outstanding: payStatus.toLowerCase() === 'unpaid' ? amount : 0
          };
          db.party.push(newParty);
          partyMap.set(normP, newParty);
        } else {
          const ep = partyMap.get(normP);
          if (phone && !ep.phone) { ep.phone = phone; ep['Mob No.'] = phone; }
          if (route && (!ep.route || ep.route === 'General Route')) { ep.route = route; ep.Route = route; }
        }

        // Stock master sync
        const normI = item.toLowerCase();
        if (!stockMap.has(normI)) {
          const newStock = {
            code: code || ('SKU-' + Math.floor(100 + Math.random() * 900)),
            name: item,
            Name: item,
            brand: brand,
            Brand: brand,
            category: category,
            'Item Category Name': category,
            rate: rate,
            'Selling Price': rate,
            purchasePrice: Number((rate * 0.8).toFixed(2)),
            'Purchase Price': Number((rate * 0.8).toFixed(2)),
            mrp: mrp,
            MRP: mrp,
            stock: 100,
            'Stock Quantity': 100,
            unit: r.unit || 'Pcs',
            minStock: 20
          };
          db.stock.push(newStock);
          stockMap.set(normI, newStock);
        }

        // Unpaid ledger sync
        const billKey = (invNo || billNo).toLowerCase();
        if (payStatus.toLowerCase() === 'unpaid') {
          const unpaidRec = {
            invoice: invNo || billNo,
            billNo: billNo || invNo,
            invoiceNo: invNo || billNo,
            date: date,
            party: party,
            amount: amount,
            balanceAmount: amount,
            totalAmount: amount,
            status: 'Unpaid'
          };
          unpaidMap.set(billKey, unpaidRec);
        } else if (unpaidMap.has(billKey)) {
          unpaidMap.delete(billKey);
        }
      });

      db.unpaid = Array.from(unpaidMap.values());
      remap(db);

      if (typeof window.DS_Storage.saveDBAsync === 'function') {
        await window.DS_Storage.saveDBAsync(db);
      } else {
        window.DS_Storage.saveDB(db);
      }

      window.dispatchEvent(new CustomEvent('ds:db-updated', { detail: db }));
    },

    loadImportHistory: async function () {
      const tbody = document.getElementById('importHistoryTableBody');
      if (!tbody) return;

      tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:24px; color:#64748b;">⏳ Loading import history...</td></tr>`;

      try {
        const res = await window.DS_API.getImportHistory();
        const batches = res?.batches || [];

        if (!batches.length) {
          tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:24px; color:#94a3b8;">No bulk import records found. Upload an Excel file to get started.</td></tr>`;
          return;
        }

        tbody.innerHTML = batches.map(b => {
          const statusColors = {
            'completed': { bg: '#dcfce7', text: '#15803d' },
            'partial': { bg: '#fef3c7', text: '#b45309' },
            'failed': { bg: '#fef2f2', text: '#dc2626' }
          };
          const st = statusColors[b.status] || { bg: '#f1f5f9', text: '#475569' };

          return `
            <tr>
              <td><code>${b.id || b.batch_id || '-'}</code></td>
              <td style="white-space:nowrap; font-size:12px;">${b.created_at || '-'}</td>
              <td><strong>${b.file_name || b.filename || 'Direct Upload'}</strong></td>
              <td>${b.uploaded_by || b.admin_user || 'Admin'}</td>
              <td><span style="font-size:11px; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${b.mode || b.import_mode || 'insert_update'}</span></td>
              <td class="num" style="font-weight:700;">${b.total_rows ?? b.total_records ?? 0}</td>
              <td class="num" style="color:#15803d; font-weight:700;">+${b.inserted_rows ?? b.inserted_count ?? 0}</td>
              <td class="num" style="color:#d97706; font-weight:700;">↻ ${b.updated_rows ?? b.updated_count ?? 0}</td>
              <td class="num" style="color:#64748b;">${b.unchanged_rows ?? b.unchanged_count ?? 0}</td>
              <td class="num" style="color:${((b.failed_rows ?? b.failed_count ?? 0) > 0) ? '#dc2626' : '#94a3b8'}; font-weight:700;">${b.failed_rows ?? b.failed_count ?? 0}</td>
              <td><span class="badge" style="background:${st.bg}; color:${st.text}; font-weight:700;">${b.status?.toUpperCase() || 'COMPLETED'}</span></td>
            </tr>
          `;
        }).join('');

      } catch (err) {
        console.error('[DS_ExcelImport] Load history error:', err);
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; padding:24px; color:#dc2626;">Error loading history: ${err.message}</td></tr>`;
      }
    },

    bindInputs: function () {
      ['Sales', 'Unpaid', 'Stock', 'Party', 'RouteMap'].forEach(k => {
        const id = 'f' + k;
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const kind = k.toLowerCase();
            SELECTED_FILES[kind] = file;
            const stEl = document.getElementById('u' + k);
            if (stEl) {
              stEl.textContent = `✓ Selected: ${file.name}`;
              stEl.style.color = '#15803d';
              stEl.style.fontWeight = 'bold';
            }
            if (window.DS_App && DS_App.toast) {
              DS_App.toast(`File selected for ${k}`, 'success');
            }
          });
        }
      });

      const procBtn = document.getElementById('processIndependentBtn');
      if (procBtn) {
        procBtn.addEventListener('click', () => this.processAllUploads());
      }

      const clearBtn = document.getElementById('clearIndependentBtn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => this.clearTestData());
      }
    },

    processAllUploads: async function () {
      if (window.DS_Auth && !window.DS_Auth.hasPermission('canImportData')) {
        if (window.DS_App && DS_App.toast) DS_App.toast('Permission Denied: Administrator or Data Import rights required to ingest files.', 'error');
        return;
      }

      const kinds = ['sales', 'unpaid', 'stock', 'party'];
      const missing = kinds.filter(k => !SELECTED_FILES[k]);
      const msgEl = document.getElementById('independentMsg');

      if (missing.length) {
        const names = missing.map(k => k === 'sales' ? '1. Sales GST' : k === 'unpaid' ? '2. Sales Summary' : k === 'stock' ? '3. Stock Summary' : '4. Party Mapping').join(', ');
        if (msgEl) msgEl.innerHTML = `<span style="color:#b91c1c; font-weight:bold;">Please select all 4 files: ${names}</span>`;
        if (window.DS_App && DS_App.toast) DS_App.toast(`Please select all 4 files first`, 'error');
        return;
      }

      const btn = document.getElementById('processIndependentBtn');
      if (btn) {
        btn.disabled = true;
        btn.textContent = '⏳ Processing Files…';
      }

      try {
        const fresh = {};
        for (const k of kinds) {
          const stEl = document.getElementById('u' + k.charAt(0).toUpperCase() + k.slice(1));
          if (stEl) stEl.textContent = '⏳ Parsing…';
          const r = await parseUploadFile(k, SELECTED_FILES[k]);
          fresh[k] = r.parsed;
          if (stEl) {
            stEl.textContent = `✓ Processed ${r.parsed.length.toLocaleString('en-IN')} rows (${r.sheet})`;
            stEl.style.color = '#15803d';
          }
        }

        // Process optional Route Map if uploaded
        let routeMsg = '';
        if (SELECTED_FILES.routemap) {
          const stEl = document.getElementById('uRouteMap');
          if (stEl) stEl.textContent = '⏳ Parsing Route Map…';
          try {
            const r = await parseUploadFile('routemap', SELECTED_FILES.routemap);
            fresh.routemap = r.parsed;
            if (stEl) {
              stEl.textContent = `✓ Processed ${r.parsed.length.toLocaleString('en-IN')} route assignments (${r.sheet})`;
              stEl.style.color = '#15803d';
            }
          } catch (e) {
            console.warn('[DS_ExcelImport] Optional RouteMap parse skipped:', e);
          }
        }

        const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
        db.sales = fresh.sales;
        db.unpaid = fresh.unpaid;
        db.stock = fresh.stock;
        db.party = fresh.party;
        db.meta = {
          source: '4-File Independent Upload Ingestion',
          loadedAt: new Date().toISOString()
        };

        // Cross-reference data
        remap(db);

        // Save into DS_Storage (IndexedDB + Memory)
        if (window.DS_Storage) {
          if (typeof window.DS_Storage.saveDBAsync === 'function') {
            await window.DS_Storage.saveDBAsync(db);
          } else {
            window.DS_Storage.saveDB(db);
          }

          // If route map present, assign routes to Sales Officers
          if (fresh.routemap && fresh.routemap.length) {
            const officers = window.DS_Storage.getOfficers();
            const norm = s => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
            let assignedCount = 0;
            fresh.routemap.forEach(rm => {
              const off = officers.find(o => (rm.staffId && norm(o.id) === norm(rm.staffId)) || (rm.staffName && norm(o.name) === norm(rm.staffName)));
              if (off && rm.route) {
                off.route = rm.route;
                if (!off.assignedRoutes) off.assignedRoutes = [];
                if (!off.assignedRoutes.includes(rm.route)) off.assignedRoutes.push(rm.route);
                assignedCount++;
              }
            });
            if (assignedCount > 0) {
              window.DS_Storage.saveOfficers(officers);
              routeMsg = ` • Assigned routes to ${assignedCount} staff members from Route Map.`;
            }
          }
        }

        const totalRows = fresh.sales.length + fresh.unpaid.length + fresh.stock.length + fresh.party.length;
        if (msgEl) {
          msgEl.innerHTML = `<span style="color:#15803d; font-weight:bold;">✓ All files ingested successfully! Loaded ${fresh.sales.length.toLocaleString('en-IN')} sales lines, ${fresh.unpaid.length.toLocaleString('en-IN')} unpaid bills, ${fresh.stock.length.toLocaleString('en-IN')} stock items, ${fresh.party.length.toLocaleString('en-IN')} retail stores${routeMsg}</span>`;
        }

        const statusEl = document.getElementById('independentDataStatus');
        if (statusEl) {
          statusEl.innerHTML = `<strong>Live Local Dataset Active:</strong> ${fresh.sales.length.toLocaleString('en-IN')} sales records • ${fresh.unpaid.length.toLocaleString('en-IN')} unpaid bills • ${fresh.stock.length.toLocaleString('en-IN')} stock items • ${fresh.party.length.toLocaleString('en-IN')} mapped stores.`;
        }

        if (window.DS_App && DS_App.toast) {
          DS_App.toast(`✓ All files processed successfully! (${totalRows.toLocaleString('en-IN')} rows)${routeMsg}`, 'success');
        }

        // Push 4-file upload to backend MySQL/SQLite database in background
        if (window.DS_API && typeof window.DS_API.request === 'function') {
          window.DS_API.request('sync.php', {
            method: 'POST',
            body: JSON.stringify({ sales: fresh.sales, parties: fresh.party, stock: fresh.stock })
          }).catch(e => console.warn('[DS_ExcelImport] Background sync push non-fatal error:', e));
        }

        // Auto-refresh views if available
        if (window.DS_Sales && typeof DS_Sales.init === 'function') DS_Sales.init();
        if (window.DS_Stock && typeof DS_Stock.init === 'function') DS_Stock.init();

      } catch (err) {
        if (msgEl) {
          msgEl.innerHTML = `<span style="color:#b91c1c; font-weight:bold;">✕ Processing failed: ${err.message}</span>`;
        }
        if (window.DS_App && DS_App.toast) {
          DS_App.toast(err.message, 'error');
        }
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = '✓ Process Uploaded Files';
        }
      }
    },

    clearTestData: async function () {
      if (window.DS_Auth && !window.DS_Auth.hasPermission('canResetData')) {
        if (window.DS_App && DS_App.toast) DS_App.toast('Permission Denied: Administrator rights required to reset system data.', 'error');
        return;
      }
      if (!confirm('Are you sure you want to clear all uploaded data? The system will revert to the clean sample seed.')) return;
      if (window.DS_Storage) {
        if (typeof window.DS_Storage.clearAll === 'function') {
          await window.DS_Storage.clearAll();
        }
        window.DS_Storage.seedSampleData();
      }
      SELECTED_FILES = { sales: null, unpaid: null, stock: null, party: null, routemap: null };
      ['Sales', 'Unpaid', 'Stock', 'Party', 'RouteMap'].forEach(k => {
        const inp = document.getElementById('f' + k);
        if (inp) inp.value = '';
        const st = document.getElementById('u' + k);
        if (st) {
          st.textContent = k === 'RouteMap' ? 'Optional (or assign in Staff tab)' : 'Not uploaded';
          st.style.color = '';
          st.style.fontWeight = '';
        }
      });
      const msgEl = document.getElementById('independentMsg');
      if (msgEl) msgEl.innerHTML = '<span style="color:#15803d; font-weight:bold;">✓ Reset to sample demo seed data.</span>';
      if (window.DS_App && DS_App.toast) DS_App.toast('Reset to demo sample seed data', 'info');
      setTimeout(() => location.reload(), 600);
    }
  };

  window.DS_ExcelImport = DS_ExcelImport;

  document.addEventListener('DOMContentLoaded', () => {
    DS_ExcelImport.init();
  });
})(window);
