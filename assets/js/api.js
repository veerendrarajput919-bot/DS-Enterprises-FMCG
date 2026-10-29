/**
 * ==========================================================================
 * DS ENTERPRISES — FRONTEND REST API CLIENT & BACKEND CONNECTOR
 * File: assets/js/api.js
 * Architecture: Hybrid Online/Offline Layer (MySQL Backend ⇄ LocalStorage Fallback)
 * ==========================================================================
 */

(function (window) {
  'use strict';

  // Base URL calculation (supports root index.html or pages/ subdirectory)
  const isPagesSubdir = window.location.pathname.includes('/pages/');
  const API_BASE = isPagesSubdir ? '../backend/api' : 'backend/api';

  let isBackendOnline = null; // null = untested, true = online, false = offline fallback

  const DS_API = {
    BASE_URL: API_BASE,

    /**
     * Check if PHP backend is accessible
     */
    checkBackendHealth: async function () {
      if (window.location.protocol === 'file:') {
        isBackendOnline = false;
        return false;
      }
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${this.BASE_URL}/auth.php?action=status`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            isBackendOnline = !!(data && data.success);
            return isBackendOnline;
          }
        }
        isBackendOnline = false;
        return false;
      } catch (e) {
        isBackendOnline = false;
        return false;
      }
    },

    /**
     * Generic API Request with automatic LocalStorage Fallback
     */
    request: async function (endpoint, options = {}) {
      if (isBackendOnline === null) {
        await this.checkBackendHealth();
      }

      if (isBackendOnline) {
        try {
          const url = `${this.BASE_URL}/${endpoint}`;
          const res = await fetch(url, {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            ...options
          });
          const json = await res.json();
          if (res.ok && json.success) {
            return { online: true, data: json };
          }
        } catch (err) {
          console.warn(`[DS_API] Backend request failed, falling back to local database:`, err);
        }
      }

      return { online: false, data: null };
    },

    // 1. Sales API
    getSales: async function (filters = {}) {
      const q = new URLSearchParams(filters).toString();
      const res = await this.request(`sales.php?${q}`);
      if (res.online && res.data.data) {
        return res.data;
      }
      // Fallback to LocalStorage
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { sales: [] };
      return { success: true, data: db.sales || [], online: false };
    },

    // 2. Retail Stores (Parties) API
    getParties: async function (route = '') {
      const res = await this.request(`parties.php?route=${encodeURIComponent(route)}`);
      if (res.online && res.data.data) {
        return res.data.data;
      }
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { party: [] };
      return db.party || [];
    },

    // 3. Stock Inventory API
    getStock: async function () {
      const res = await this.request(`stock.php`);
      if (res.online && res.data.data) {
        return res.data;
      }
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { stock: [] };
      return { success: true, data: db.stock || [], online: false };
    },

    // 4. Outstanding Receivables API
    getOutstanding: async function () {
      const res = await this.request(`outstanding.php`);
      if (res.online && res.data.data) {
        return res.data;
      }
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { unpaid: [] };
      return { success: true, data: db.unpaid || [], online: false };
    },

    // 5. Orders API
    getOrders: async function (status = '') {
      const res = await this.request(`orders.php?status=${encodeURIComponent(status)}`);
      if (res.online && res.data.data) {
        return res.data.data;
      }
      return window.DS_Storage ? window.DS_Storage.getOrders() : [];
    },

    punchOrder: async function (orderPayload) {
      const res = await this.request('orders.php', {
        method: 'POST',
        body: JSON.stringify(orderPayload)
      });
      if (res.online) {
        return res.data;
      }
      // Fallback LocalStorage Punch (deduplicate)
      const orders = window.DS_Storage.getOrders();
      if (!orders.some(o => o.id === orderPayload.id)) {
        orders.push(orderPayload);
        window.DS_Storage.saveOrders(orders);
      }
      return { success: true, order_id: orderPayload.id, online: false };
    },

    updateOrderStatus: async function (orderId, status) {
      const res = await this.request('orders.php', {
        method: 'PUT',
        body: JSON.stringify({ id: orderId, status: status })
      });
      if (res.online) {
        return res.data;
      }
      // Fallback LocalStorage
      const orders = window.DS_Storage.getOrders();
      const o = orders.find(x => x.id === orderId);
      if (o) {
        o.status = status;
        if (status === 'Delivered') o.payment = 'Paid';
        window.DS_Storage.saveOrders(orders);
      }
      return { success: true, online: false };
    },

    // 6. Payment Collections API
    recordPayment: async function (paymentPayload) {
      const res = await this.request('payments.php', {
        method: 'POST',
        body: JSON.stringify(paymentPayload)
      });
      if (res.online) {
        return res.data;
      }
      // Fallback LocalStorage (deduplicate)
      const colls = window.DS_Storage.getCollections();
      if (!colls.some(c => c.id === paymentPayload.id)) {
        colls.push(paymentPayload);
        window.DS_Storage.saveCollections(colls);
      }
      return { success: true, receipt_id: paymentPayload.id, online: false };
    },

    // 7. Two-Way Sync between LocalStorage and MySQL
    syncWithBackend: async function () {
      const isUp = await this.checkBackendHealth();
      if (!isUp) {
        if (window.DS_App) DS_App.toast('PHP MySQL backend is not reachable. Operating in offline LocalStorage mode.', 'warning');
        return false;
      }

      try {
        const localOrders = window.DS_Storage.getOrders();
        const localColls = window.DS_Storage.getCollections();

        // Push offline data to MySQL
        const pushRes = await fetch(`${this.BASE_URL}/sync.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orders: localOrders, collections: localColls })
        });
        const pushData = await pushRes.json();

        // Pull latest state from MySQL
        const pullRes = await fetch(`${this.BASE_URL}/sync.php`);
        const pullData = await pullRes.json();

        if (pullData.success && pullData.data) {
          window.DS_Storage.saveDB({
            sales: pullData.data.sales || [],
            party: pullData.data.parties || [],
            stock: pullData.data.stock || [],
            unpaid: pullData.data.unpaid || []
          });
          window.DS_Storage.saveOrders(pullData.data.orders || []);
          window.DS_Storage.saveCollections(pullData.data.collections || []);
          if (pullData.data.salesOfficers) {
            window.DS_Storage.saveOfficers(pullData.data.salesOfficers);
          }
          if (window.DS_App) DS_App.toast('✓ Successfully synchronized with MySQL Database!', 'success');
          return true;
        }
      } catch (e) {
        console.error('[DS_API] Sync error:', e);
        if (window.DS_App) DS_App.toast('Sync encountered an error: ' + e.message, 'error');
        return false;
      }
    },

    // 8. Executive Dashboard KPIs (All 14 Metrics)
    getDashboardKPIs: async function () {
      const res = await this.request('dashboard.php');
      if (res.online && res.data && res.data.metrics) {
        return res.data.metrics;
      }
      return null;
    },

    // 9. Automatic Bill & Invoice Numbering API
    getNumberingSettings: async function () {
      const res = await this.request('numbering.php?action=settings');
      if (res.online && res.data && res.data.settings) {
        return res.data.settings;
      }
      return window.DS_Storage ? window.DS_Storage.getNumberSequences() : null;
    },

    updateNumberingSettings: async function (type, payload) {
      const res = await this.request('numbering.php', {
        method: 'POST',
        body: JSON.stringify({ type: type, ...payload })
      });
      if (res.online) return res.data;
      if (window.DS_Storage) {
        const seqs = window.DS_Storage.getNumberSequences();
        seqs[type] = Object.assign({}, seqs[type] || {}, payload);
        window.DS_Storage.saveNumberSequences(seqs);
        return { success: true, preview_next: window.DS_Storage.previewNextNumber(type) };
      }
      return { success: false };
    },

    previewNextNumber: async function (type) {
      const res = await this.request(`numbering.php?action=preview&type=${encodeURIComponent(type)}`);
      if (res.online && res.data && res.data.preview) return res.data.preview;
      return window.DS_Storage ? window.DS_Storage.previewNextNumber(type) : `${type.toUpperCase()}-2026-0001`;
    },

    // 10. Bulk Excel Bills Ingestion & Upsert Update API
    previewBillsImport: async function (rows, mode = 'insert_update', clearBlank = false, recalcTax = false) {
      const res = await this.request('import_bills.php?action=preview', {
        method: 'POST',
        body: JSON.stringify({
          rows: rows,
          mode: mode,
          clear_blank_fields: clearBlank,
          recalc_taxes: recalcTax
        })
      });
      if (res.online && res.data && res.data.success) {
        return res.data;
      }

      // Offline / LocalStorage High-Speed Upsert Engine
      if (!Array.isArray(rows) || !rows.length) {
        return { success: false, error: 'No data rows provided.' };
      }

      const db = window.DS_Storage ? window.DS_Storage.getDB() : { sales: [] };
      const existingSales = Array.isArray(db.sales) ? db.sales : [];

      const byBill = new Map();
      const byInv = new Map();
      const byComposite = new Map();

      existingSales.forEach((s, idx) => {
        const b = (s.bill_no || s['Bill No.'] || s.billNo || '').trim().toLowerCase();
        const inv = (s.invoice_no || s['Invoice No.'] || s.invoiceNo || '').trim().toLowerCase();
        const p = (s.party_name || s['Party Name'] || s.party || '').trim().toLowerCase();
        const it = (s.item_name || s['Item Name'] || s.item || '').trim().toLowerCase();
        const dt = (s.invoice_date || s.Date || s.date || '').trim();

        if (b) byBill.set(b, s);
        if (inv) byInv.set(inv, s);
        if (p && it) byComposite.set(`${p}__${it}__${dt}`, s);
      });

      const toInsert = [];
      const toUpdate = [];
      const unchanged = [];
      const invalid = [];
      const previewRows = [];

      rows.forEach((r, idx) => {
        const rowNum = idx + 2;
        const bno = String(r['Bill Number'] || r['bill_no'] || r['Bill No.'] || r['billno'] || r['bill'] || '').trim();
        const ino = String(r['Invoice Number'] || r['invoice_no'] || r['Invoice No.'] || r['invoiceno'] || r['invoice'] || '').trim();
        const party = String(r['Customer Name'] || r['Party Name'] || r['party'] || r['customer'] || r['Store Name'] || '').trim();
        const item = String(r['Product Name'] || r['Item Name'] || r['item'] || r['product'] || '').trim();
        const date = String(r['Date'] || r['Invoice Date'] || r['date'] || new Date().toISOString().slice(0, 10)).slice(0, 10);
        const qty = parseFloat(r['Quantity'] || r['qty'] || 1) || 1;
        const rate = parseFloat(r['Rate'] || r['Price'] || r['rate'] || r['price'] || 0) || 0;
        let tax = parseFloat(r['Tax Amount'] || r['tax'] || r['gst'] || 0) || 0;
        let amount = parseFloat(r['Total Amount'] || r['amount'] || r['total'] || 0);

        if (recalcTax || amount <= 0) {
          const subtotal = qty * rate;
          if (tax <= 0) tax = Number((subtotal * 0.05).toFixed(2));
          amount = Number((subtotal + tax).toFixed(2));
        }

        if (!party) {
          invalid.push({ row: rowNum, reason: 'Customer / Party Name is blank', data: r });
          return;
        }
        if (!item) {
          invalid.push({ row: rowNum, reason: 'Product / Item Name is blank', data: r });
          return;
        }

        const normData = {
          bill_no: bno,
          invoice_no: ino,
          party_name: party,
          party_contact: String(r['Customer Phone'] || r['Party Contact'] || r['phone'] || r['contact'] || '').trim(),
          item_name: item,
          brand: String(r['Brand'] || r['brand'] || 'General').trim(),
          category: String(r['Category'] || r['category'] || 'FMCG').trim(),
          route: String(r['Route'] || r['route'] || r['beat'] || 'General Route').trim(),
          city: String(r['City'] || r['city'] || 'Kanpur').trim(),
          qty: qty,
          unit: String(r['Unit'] || r['unit'] || 'Pcs').trim(),
          rate: rate,
          mrp: parseFloat(r['MRP'] || r['mrp'] || rate) || rate,
          tax_amount: tax,
          amount: amount,
          payment_status: String(r['Payment Status'] || r['payment_status'] || r['status'] || 'Paid').trim(),
          sales_person: String(r['Sales Person'] || r['sales_person'] || 'Admin').trim(),
          notes: String(r['Notes'] || r['notes'] || r['Remarks'] || r['remarks'] || '').trim(),
          date: date
        };

        // Match existing record
        let matched = null;
        if (bno && byBill.has(bno.toLowerCase())) matched = byBill.get(bno.toLowerCase());
        else if (ino && byInv.has(ino.toLowerCase())) matched = byInv.get(ino.toLowerCase());
        else if (byComposite.has(`${party.toLowerCase()}__${item.toLowerCase()}__${date}`)) {
          matched = byComposite.get(`${party.toLowerCase()}__${item.toLowerCase()}__${date}`);
        }

        if (matched) {
          if (mode === 'insert') {
            unchanged.push({ row: rowNum, existing: matched, data: normData });
            previewRows.push({ action: 'unchanged', bill_no: matched.bill_no || bno, invoice_no: matched.invoice_no || ino, party_name: party, invoice_date: date, total_amount: amount, status: normData.payment_status, item_name: item, qty: qty });
            return;
          }

          // Detect diffs
          const diffs = {};
          if (Math.abs((matched.qty || matched.QtyNum || 0) - qty) > 0.001) diffs.qty = { old: matched.qty || matched.QtyNum, new: qty };
          if (Math.abs((matched.rate || matched.PriceNum || 0) - rate) > 0.001) diffs.rate = { old: matched.rate || matched.PriceNum, new: rate };
          if (Math.abs((matched.amount || matched.AmountNum || 0) - amount) > 0.001) diffs.amount = { old: matched.amount || matched.AmountNum, new: amount };
          if (normData.payment_status && normData.payment_status !== (matched.status || matched.payment_status || 'Paid')) {
            diffs.payment_status = { old: matched.status || matched.payment_status, new: normData.payment_status };
          }
          if (normData.route && normData.route !== (matched.route || matched.Route)) diffs.route = { old: matched.route || matched.Route, new: normData.route };

          if (Object.keys(diffs).length > 0) {
            toUpdate.push({ row: rowNum, existing: matched, data: normData, changes: diffs });
            previewRows.push({ action: 'update', bill_no: matched.bill_no || bno, invoice_no: matched.invoice_no || ino, party_name: party, invoice_date: date, total_amount: amount, status: normData.payment_status, item_name: item, qty: qty, diffs: diffs });
          } else {
            unchanged.push({ row: rowNum, existing: matched, data: normData });
            previewRows.push({ action: 'unchanged', bill_no: matched.bill_no || bno, invoice_no: matched.invoice_no || ino, party_name: party, invoice_date: date, total_amount: amount, status: normData.payment_status, item_name: item, qty: qty });
          }

        } else {
          if (mode === 'update') {
            invalid.push({ row: rowNum, reason: 'Record not found in existing ledger (Update Existing Only mode)', data: normData });
            return;
          }
          toInsert.push({ row: rowNum, data: normData });
          previewRows.push({ action: 'insert', bill_no: bno || '(Auto Generate)', invoice_no: ino || '(Auto Generate)', party_name: party, invoice_date: date, total_amount: amount, status: normData.payment_status, item_name: item, qty: qty });
        }
      });

      return {
        success: true,
        online: false,
        batch_id: 'BATCH-' + Date.now(),
        summary: {
          total: rows.length,
          total_rows: rows.length,
          to_insert: toInsert.length,
          new_count: toInsert.length,
          to_update: toUpdate.length,
          update_count: toUpdate.length,
          unchanged: unchanged.length,
          unchanged_count: unchanged.length,
          failed: invalid.length,
          invalid_count: invalid.length,
          mode: mode
        },
        new_records: toInsert,
        update_records: toUpdate,
        unchanged_records: unchanged,
        invalid_rows: invalid.map(inv => ({ row_num: inv.row, identifier: inv.data?.bill_no || inv.data?.invoice_no || '-', party_name: inv.data?.party_name || '-', reason: inv.reason })),
        preview_rows: previewRows
      };
    },

    executeBillsImport: async function (payload) {
      const res = await this.request('import_bills.php?action=execute', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.online && res.data && res.data.success) {
        return res.data;
      }

      // Offline Execution Engine
      const rows = payload.rows || [];
      if (!Array.isArray(rows) || !rows.length || !window.DS_Storage) {
        return { success: false, error: 'Empty payload or storage unavailable.' };
      }

      const db = window.DS_Storage.getDB() || { sales: [], party: [], stock: [], unpaid: [] };
      if (!Array.isArray(db.sales)) db.sales = [];
      if (!Array.isArray(db.party)) db.party = [];
      if (!Array.isArray(db.stock)) db.stock = [];
      if (!Array.isArray(db.unpaid)) db.unpaid = [];

      const clearBlank = !!payload.clear_blank_fields;
      const mode = payload.mode || 'insert_update';
      const batchId = payload.batch_id || ('BATCH-' + new Date().toISOString().replace(/\D/g, '').slice(0, 14));
      const fileName = payload.filename || 'import_100_bills.xlsx';

      const byBill = new Map();
      const byInv = new Map();
      const byComposite = new Map();

      db.sales.forEach(s => {
        const b = (s.bill_no || s['Bill No.'] || s.billNo || '').trim().toLowerCase();
        const inv = (s.invoice_no || s['Invoice No.'] || s.invoiceNo || '').trim().toLowerCase();
        const p = (s.party_name || s['Party Name'] || s.party || '').trim().toLowerCase();
        const it = (s.item_name || s['Item Name'] || s.item || '').trim().toLowerCase();
        const dt = (s.invoice_date || s.Date || s.date || '').trim();

        if (b) byBill.set(b, s);
        if (inv) byInv.set(inv, s);
        if (p && it) byComposite.set(`${p}__${it}__${dt}`, s);
      });

      let insertedCount = 0;
      let updatedCount = 0;
      let unchangedCount = 0;
      let failedCount = 0;

      rows.forEach((r, idx) => {
        const bno = String(r['Bill Number'] || r['bill_no'] || r['Bill No.'] || r['Bill No'] || r['billno'] || r['bill'] || '').trim();
        const ino = String(r['Invoice Number'] || r['invoice_no'] || r['Invoice No.'] || r['Invoice No'] || r['invoiceno'] || r['invoice'] || '').trim();
        const party = String(r['Customer Name'] || r['Party Name'] || r['party'] || r['customer'] || r['Store Name'] || '').trim();
        const item = String(r['Product Name'] || r['Item Name'] || r['item'] || r['product'] || '').trim();
        const date = String(r['Date'] || r['Invoice Date'] || r['date'] || new Date().toISOString().slice(0, 10)).slice(0, 10);
        const qty = parseFloat(r['Quantity'] || r['qty'] || 1) || 1;
        const rate = parseFloat(r['Rate'] || r['Price'] || r['rate'] || r['price'] || 0) || 0;
        const mrp = parseFloat(r['MRP'] || r['mrp'] || rate) || rate;
        const tax = parseFloat(r['Tax Amount'] || r['tax'] || r['gst'] || 0) || 0;
        const amount = parseFloat(r['Total Amount'] || r['amount'] || r['total'] || (qty * rate)) || (qty * rate);
        const payStatus = String(r['Payment Status'] || r['payment_status'] || r['status'] || 'Paid').trim();
        const route = String(r['Route'] || r['route'] || r['beat'] || 'General Route').trim();
        const city = String(r['City'] || r['city'] || 'Kanpur').trim();
        const phone = String(r['Customer Phone'] || r['Party Contact'] || r['phone'] || r['contact'] || '').trim();
        const brand = String(r['Brand'] || r['brand'] || 'General').trim();
        const category = String(r['Category'] || r['category'] || 'FMCG').trim();
        const unit = String(r['Unit'] || r['unit'] || 'Pcs').trim();
        const sp = String(r['Sales Person'] || r['sales_person'] || 'Admin').trim();
        const notes = String(r['Notes'] || r['notes'] || r['Remarks'] || r['remarks'] || '').trim();

        if (!party || !item) {
          failedCount++;
          return;
        }

        let matched = null;
        if (bno && byBill.has(bno.toLowerCase())) matched = byBill.get(bno.toLowerCase());
        else if (ino && byInv.has(ino.toLowerCase())) matched = byInv.get(ino.toLowerCase());
        else if (byComposite.has(`${party.toLowerCase()}__${item.toLowerCase()}__${date}`)) {
          matched = byComposite.get(`${party.toLowerCase()}__${item.toLowerCase()}__${date}`);
        }

        if (matched) {
          if (mode === 'insert') {
            unchangedCount++;
            return;
          }

          // UPDATE EXISTING RECORD WITH FULL INFORMATION ACCORDING TO EXCEL
          matched.party = party; matched.party_name = party; matched['Party Name'] = party;
          if (phone || clearBlank) { matched.partyContact = phone; matched.party_contact = phone; }
          matched.item = item; matched.item_name = item; matched['Item Name'] = item;
          if (brand || clearBlank) { matched.brand = brand; matched.Brand = brand; }
          if (category || clearBlank) { matched.category = category; matched.Category = category; }
          if (route || clearBlank) { matched.route = route; matched.Route = route; }
          if (city || clearBlank) { matched.city = city; matched.City = city; matched.city1 = city; matched.City_1 = city; }
          matched.qty = qty; matched.QtyNum = qty; matched.Quantity = String(qty);
          matched.rate = rate; matched.PriceNum = rate;
          matched.mrp = mrp; matched.MRP = mrp;
          matched.amount = amount; matched.AmountNum = amount; matched.total_amount = amount;
          matched.tax_amount = tax;
          matched.subtotal = amount - tax;
          matched.status = payStatus; matched.Status = payStatus; matched.payment_status = payStatus;
          if (sp || clearBlank) matched.salesPerson = sp;
          if (notes || clearBlank) matched.notes = notes;
          matched.import_batch_id = batchId;

          updatedCount++;

        } else {
          if (mode === 'update') {
            failedCount++;
            return;
          }

          // INSERT NEW RECORD (Auto generate single unified Invoice / Bill No if missing)
          const unifiedCandidate = bno || ino || (window.DS_Storage ? window.DS_Storage.generateNextNumber('invoice', date) : ('INV-' + Date.now()));
          const finalBillNo = unifiedCandidate;
          const finalInvNo = unifiedCandidate;

          const newRecord = {
            id: 'BILL-' + Date.now() + '-' + idx,
            bill_no: finalBillNo,
            billNo: finalBillNo,
            'Bill No.': finalBillNo,
            invoice_no: finalInvNo,
            invoiceNo: finalInvNo,
            'Invoice No.': finalInvNo,
            date: date,
            Date: date,
            invoice_date: date,
            party_name: party,
            party: party,
            'Party Name': party,
            party_contact: phone,
            partyContact: phone,
            item_name: item,
            item: item,
            'Item Name': item,
            brand: brand,
            Brand: brand,
            category: category,
            Category: category,
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
            MRP: mrp,
            tax_amount: tax,
            amount: amount,
            AmountNum: amount,
            total_amount: amount,
            subtotal: amount - tax,
            status: payStatus,
            Status: payStatus,
            payment_status: payStatus,
            salesPerson: sp,
            sales_person: sp,
            notes: notes,
            import_batch_id: batchId
          };

          db.sales.unshift(newRecord);
          if (finalBillNo) byBill.set(finalBillNo.toLowerCase(), newRecord);
          if (finalInvNo) byInv.set(finalInvNo.toLowerCase(), newRecord);
          insertedCount++;
        }

        // Sync Party Master
        const normP = party.toLowerCase();
        const existingParty = db.party.find(p => (p.name || p.Name || '').toLowerCase() === normP);
        if (!existingParty) {
          db.party.push({
            id: 'P' + Math.floor(1000 + Math.random() * 9000),
            name: party,
            Name: party,
            phone: phone,
            route: route,
            Route: route,
            city: city,
            City: city,
            category: category,
            creditLimit: 50000,
            outstanding: payStatus.toLowerCase() === 'unpaid' ? amount : 0
          });
        } else {
          if (route && (!existingParty.route || existingParty.route === 'General Route')) {
            existingParty.route = route; existingParty.Route = route;
          }
          if (phone && !existingParty.phone) {
            existingParty.phone = phone;
          }
        }

        // Sync Stock Master
        const normI = item.toLowerCase();
        const existingStock = db.stock.find(s => (s.name || s.Name || '').toLowerCase() === normI);
        if (!existingStock) {
          db.stock.push({
            code: 'SKU-' + Math.floor(100 + Math.random() * 900),
            name: item,
            brand: brand,
            category: category,
            rate: rate,
            mrp: mrp,
            stock: 100,
            unit: unit
          });
        } else {
          if (rate > 0) existingStock.rate = rate;
          if (mrp > 0) existingStock.mrp = mrp;
        }

        // Sync Unpaid ledger
        const billKey = (ino || bno).toLowerCase();
        const existingUnpaid = db.unpaid.find(u => (u.invoice || u.billNo || u.invoiceNo || '').toLowerCase() === billKey);
        if (payStatus.toLowerCase() === 'unpaid') {
          if (existingUnpaid) {
            existingUnpaid.amount = amount;
            existingUnpaid.totalAmount = amount;
            existingUnpaid.balanceAmount = amount;
            existingUnpaid.party = party;
            existingUnpaid.route = route;
          } else {
            db.unpaid.push({
              invoice: ino || bno,
              billNo: bno || ino,
              invoiceNo: ino || bno,
              date: date,
              party: party,
              route: route,
              amount: amount,
              totalAmount: amount,
              balanceAmount: amount,
              status: 'Unpaid'
            });
          }
        } else if (existingUnpaid) {
          db.unpaid = db.unpaid.filter(u => (u.invoice || u.billNo || u.invoiceNo || '').toLowerCase() !== billKey);
        }
      });

      window.DS_Storage.saveDB(db);

      // Record batch audit trail
      const batchLog = {
        id: batchId,
        created_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
        file_name: fileName,
        uploaded_by: payload.user || 'Admin',
        mode: mode,
        total_rows: rows.length,
        inserted_rows: insertedCount,
        updated_rows: updatedCount,
        unchanged_rows: unchangedCount,
        failed_rows: failedCount,
        status: failedCount > 0 ? (failedCount === rows.length ? 'Failed' : 'Partial') : 'Success'
      };
      window.DS_Storage.recordImportBatch(batchLog);

      return {
        success: true,
        online: false,
        batch_id: batchId,
        status: batchLog.status,
        message: `Successfully processed Excel import: ${insertedCount} bills inserted, ${updatedCount} bills updated, ${unchangedCount} unchanged, ${failedCount} failed.`,
        counts: {
          inserted: insertedCount,
          updated: updatedCount,
          unchanged: unchangedCount,
          failed: failedCount
        },
        summary: {
          total_rows: rows.length,
          inserted: insertedCount,
          updated: updatedCount,
          unchanged: unchangedCount,
          failed: failedCount
        }
      };
    },

    getImportHistory: async function (filters = {}) {
      const q = new URLSearchParams(filters).toString();
      const res = await this.request(`import_bills.php?action=history&${q}`);
      if (res.online && res.data && res.data.batches) return res.data;
      const batches = window.DS_Storage ? window.DS_Storage.getImportBatches() : [];
      return { success: true, batches: batches, total: batches.length };
    },

    // 11. Order Cancellation & History Lifecycle
    cancelOrder: async function (orderId, cancelType, reason, remarks, user = 'Admin', userId = 'ADMIN-1') {
      const res = await this.request('orders.php?action=cancel', {
        method: 'POST',
        body: JSON.stringify({
          id: orderId,
          action: 'cancel',
          cancelled_by_type: cancelType,
          cancellation_reason: reason,
          cancellation_remarks: remarks,
          cancelled_by_user: user,
          user_id: userId
        })
      });
      if (res.online) return res.data;

      // LocalStorage Fallback
      if (window.DS_Storage) {
        const orders = window.DS_Storage.getOrders();
        const o = orders.find(x => x.id === orderId);
        if (o) {
          o.previous_status = o.status;
          o.status = (cancelType === 'Customer') ? 'Cancelled by Customer' : 'Cancelled by Company/Admin';
          o.cancelType = (cancelType === 'Customer') ? 'party' : 'own';
          o.cancelReason = reason;
          o.cancelRemark = remarks;
          o.cancelled_at = new Date().toISOString();
          o.cancelled_by_user = user;
          window.DS_Storage.saveOrders(orders);
          return { success: true, new_status: o.status, online: false };
        }
      }
      return { success: false, error: 'Order not found' };
    },

    reopenOrder: async function (orderId, adminUser = 'Admin', adminId = 'ADMIN-1', remarks = '') {
      const res = await this.request('orders.php?action=reopen', {
        method: 'POST',
        body: JSON.stringify({
          id: orderId,
          action: 'reopen',
          admin_user: adminUser,
          admin_id: adminId,
          remarks: remarks
        })
      });
      if (res.online) return res.data;

      if (window.DS_Storage) {
        const orders = window.DS_Storage.getOrders();
        const o = orders.find(x => x.id === orderId);
        if (o) {
          o.status = o.previous_status || 'Pending';
          delete o.cancelType;
          window.DS_Storage.saveOrders(orders);
          return { success: true, restored_status: o.status, online: false };
        }
      }
      return { success: false, error: 'Order not found' };
    },

    addOrderAdminNote: async function (orderId, note, adminUser = 'Admin') {
      const res = await this.request('orders.php?action=add_note', {
        method: 'POST',
        body: JSON.stringify({
          id: orderId,
          note: note,
          admin_user: adminUser
        })
      });
      if (res.online) return res.data;
      if (window.DS_Storage) {
        const orders = window.DS_Storage.getOrders();
        const o = orders.find(x => x.id === orderId);
        if (o) {
          if (!Array.isArray(o.adminNotes)) o.adminNotes = [];
          o.adminNotes.push({ note, adminUser, at: new Date().toISOString() });
          window.DS_Storage.saveOrders(orders);
          return { success: true, online: false };
        }
      }
      return { success: false };
    },

    getOrderHistory: async function (orderId) {
      const res = await this.request(`orders.php?action=history&order_id=${encodeURIComponent(orderId)}`);
      if (res.online && res.data) return res.data;
      if (window.DS_Storage) {
        const orders = window.DS_Storage.getOrders();
        const o = orders.find(x => x.id === orderId);
        return { success: true, order: o, history: [] };
      }
      return null;
    },

    // 12. Delivery Route Assignment API (Dual Online / Client-Side Engine)
    getDeliveryRoutes: async function (date = '') {
      const res = await this.request(`route_assignment.php?action=routes&date=${encodeURIComponent(date)}`);
      if (res.online && res.data && res.data.routes) {
        return res.data.routes;
      }
      return window.DS_Storage ? window.DS_Storage.getDeliveryRoutes(date) : [];
    },

    getDeliveryAssignments: async function (filters = {}) {
      const q = new URLSearchParams(filters).toString();
      const res = await this.request(`route_assignment.php?action=assignments&${q}`);
      if (res.online && res.data && res.data.assignments) {
        return res.data;
      }

      if (!window.DS_Storage) return { success: false, assignments: [], total: 0 };
      const all = window.DS_Storage.getDeliveryAssignments();
      const db = window.DS_Storage.getDB ? window.DS_Storage.getDB() : {};
      const partyMap = new Map((db.party || []).map(p => [String(p.name || '').trim().toLowerCase(), p]));

      const date = filters.date || '';
      const city1 = (filters.city1 || '').toLowerCase();
      const city = (filters.city || '').toLowerCase();
      const routeId = filters.route_id || '';
      const status = filters.delivery_status || filters.status || '';
      const person = (filters.delivery_person || '').toLowerCase();
      const search = (filters.search || '').toLowerCase();

      const filtered = all.filter(a => {
        if (date && a.assignment_date !== date) return false;
        if (routeId && a.route_id !== routeId && a.route_name !== routeId) return false;
        if (status && a.delivery_status !== status) return false;
        if (person && !(a.delivery_person || '').toLowerCase().includes(person)) return false;

        const pMeta = partyMap.get(String(a.customer_name || '').trim().toLowerCase()) || {};
        const aCity1 = String(a.city1 || pMeta.city1 || pMeta.City_1 || pMeta.city || pMeta.City || a.city || '').toLowerCase();
        const aCity = String(a.city || pMeta.city || pMeta.City || '').toLowerCase();

        if (city1 && aCity1 !== city1 && !aCity1.includes(city1)) return false;
        if (city && aCity !== city && !aCity.includes(city)) return false;

        if (search) {
          const hay = `${a.customer_name} ${a.order_id || ''} ${a.address || ''} ${a.area || ''} ${a.delivery_person || ''} ${aCity1} ${aCity}`.toLowerCase();
          if (!hay.includes(search)) return false;
        }
        return true;
      });

      return {
        success: true,
        assignments: filtered,
        total: filtered.length,
        online: false
      };
    },

    previewRouteAssignments: async function (rows, allowNew = false, date = '') {
      const res = await this.request('route_assignment.php?action=preview', {
        method: 'POST',
        body: JSON.stringify({ rows: rows, allow_new_routes: allowNew, date: date })
      });
      if (res.online && res.data && res.data.success) {
        return res.data;
      }

      // Offline Route Assignment Validation Engine
      if (!Array.isArray(rows) || !rows.length || !window.DS_Storage) {
        return { success: false, error: 'Empty rows or storage not initialized' };
      }

      const assignDate = date || new Date().toISOString().slice(0, 10);
      const db = window.DS_Storage.getDB();
      const parties = Array.isArray(db.party) ? db.party : [];
      const orders = window.DS_Storage.getOrders();
      const routes = window.DS_Storage.getDeliveryRoutes();

      const partyMap = new Map();
      parties.forEach(p => {
        if (p.id) partyMap.set(String(p.id).trim().toUpperCase(), p);
        if (p.name) partyMap.set(String(p.name).trim().toLowerCase(), p);
        if (p.Name) partyMap.set(String(p.Name).trim().toLowerCase(), p);
      });

      const orderMap = new Map();
      orders.forEach(o => {
        if (o.id) orderMap.set(String(o.id).trim().toUpperCase(), o);
        if (o.order_id) orderMap.set(String(o.order_id).trim().toUpperCase(), o);
        if (o.bill_no) orderMap.set(String(o.bill_no).trim().toUpperCase(), o);
        if (o.billNo) orderMap.set(String(o.billNo).trim().toUpperCase(), o);
        if (o.invoice_no) orderMap.set(String(o.invoice_no).trim().toUpperCase(), o);
        if (o.invoiceNo) orderMap.set(String(o.invoiceNo).trim().toUpperCase(), o);
      });

      const salesMap = new Map();
      (db.sales || []).forEach(sl => {
        const b = sl.bill_no || sl.billNo || sl['Bill No.'];
        const inv = sl.invoice_no || sl.invoiceNo || sl['Invoice No.'];
        if (b) salesMap.set(String(b).trim().toUpperCase(), sl);
        if (inv) salesMap.set(String(inv).trim().toUpperCase(), sl);
      });

      const routeMap = new Map();
      routes.forEach(r => {
        if (r.id) routeMap.set(String(r.id).trim().toUpperCase(), r);
        if (r.name) routeMap.set(String(r.name).trim().toLowerCase(), r);
      });

      const matched = [];
      const unmatched = [];
      const seenOrders = new Set();

      rows.forEach((r, idx) => {
        const rowNum = idx + 2;
        const routeIdRaw = String(r['Route ID'] || r['route_id'] || r['Route Code'] || '').trim();
        const routeNameRaw = String(r['Route Name'] || r['route_name'] || r['Route'] || r['Beat'] || '').trim();
        const custId = String(r['Customer ID'] || r['customer_id'] || r['Party ID'] || '').trim();
        const custName = String(r['Customer Name'] || r['customer_name'] || r['Party Name'] || '').trim();
        const addr = String(r['Address'] || r['address'] || r['Location'] || '').trim();
        const area = String(r['Area'] || r['area'] || '').trim();
        const orderNo = String(r['Order Number'] || r['order_number'] || r['Order ID'] || r['order_id'] || r['Bill No'] || r['Bill No.'] || r['Invoice No'] || '').trim();
        const delivPerson = String(r['Delivery Person'] || r['delivery_person'] || r['Assigned To'] || '').trim();
        const seq = parseInt(r['Sequence'] || r['sequence'] || r['Stop'] || (idx + 1), 10) || (idx + 1);

        // 1. Customer validation
        let matchedParty = null;
        if (custId && partyMap.has(custId.toUpperCase())) {
          matchedParty = partyMap.get(custId.toUpperCase());
        } else if (custName) {
          const cNorm = custName.toLowerCase();
          if (partyMap.has(cNorm)) {
            matchedParty = partyMap.get(cNorm);
          } else {
            matchedParty = parties.find(p => {
              const pn = (p.name || p.Name || '').toLowerCase();
              return pn === cNorm || pn.includes(cNorm) || cNorm.includes(pn);
            });
          }
        }

        const finalCustName = custName || (matchedParty ? (matchedParty.name || matchedParty.Name) : '');
        const finalCustId = custId || (matchedParty ? matchedParty.id : ('P' + Math.floor(1000 + Math.random() * 9000)));
        const finalAddr = addr || (matchedParty ? (matchedParty.address || matchedParty.route) : (area || 'Local Market'));

        if (!finalCustName) {
          unmatched.push({ row: rowNum, reason: 'Customer Name / ID is missing or not provided in row', data: r });
          return;
        }

        // 2. Order / Bill validation
        let matchedOrder = null;
        if (orderNo) {
          const ordKey = orderNo.toUpperCase();
          if (orderMap.has(ordKey)) {
            matchedOrder = orderMap.get(ordKey);
            const st = String(matchedOrder.status || '');
            if (st.includes('Cancel') || matchedOrder.cancelType) {
              unmatched.push({ row: rowNum, reason: `Order/Bill ${orderNo} is CANCELLED (${st}) and cannot be assigned for delivery`, data: r });
              return;
            }
            if (seenOrders.has(ordKey)) {
              unmatched.push({ row: rowNum, reason: `Duplicate assignment in uploaded Excel: Order/Bill ${orderNo} appears multiple times`, data: r });
              return;
            }
            seenOrders.add(ordKey);
          } else if (salesMap.has(ordKey)) {
            const sl = salesMap.get(ordKey);
            matchedOrder = {
              id: sl.bill_no || sl.invoice_no || orderNo,
              total: Number(sl.amount || sl.total_amount || 0),
              storeName: sl.party_name || sl.party || finalCustName,
              route: sl.route || routeNameRaw,
              status: 'Confirmed'
            };
            if (seenOrders.has(ordKey)) {
              unmatched.push({ row: rowNum, reason: `Duplicate assignment in uploaded Excel: Bill ${orderNo} appears multiple times`, data: r });
              return;
            }
            seenOrders.add(ordKey);
          } else {
            // Relaxed order linking: try matching party or create stop reference
            const partyOrd = orders.find(o => (o.storeName || o.party || '').toLowerCase() === finalCustName.toLowerCase() && !String(o.status || '').includes('Cancel'));
            if (partyOrd) {
              matchedOrder = partyOrd;
            } else {
              matchedOrder = {
                id: orderNo,
                total: parseFloat(r['Order Amount'] || r['amount'] || r['Total Amount'] || 0) || 0,
                storeName: finalCustName,
                route: routeNameRaw || (matchedParty ? matchedParty.route : 'General Route'),
                status: 'Confirmed'
              };
            }
          }
        }

        // 3. Route validation
        let matchedRoute = null;
        if (routeIdRaw && routeMap.has(routeIdRaw.toUpperCase())) {
          matchedRoute = routeMap.get(routeIdRaw.toUpperCase());
        } else if (routeNameRaw) {
          const rNorm = routeNameRaw.toLowerCase();
          if (routeMap.has(rNorm)) {
            matchedRoute = routeMap.get(rNorm);
          } else {
            matchedRoute = routes.find(rt => (rt.name || '').toLowerCase().includes(rNorm) || rNorm.includes((rt.name || '').toLowerCase()));
          }
        }

        if (!matchedRoute) {
          const rClean = (routeNameRaw || routeIdRaw || (matchedParty ? matchedParty.route : '') || 'City General Route').trim();
          const newRouteId = routeIdRaw || ('RT-' + rClean.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase());
          matchedRoute = {
            id: newRouteId,
            name: rClean,
            area: area || 'City Delivery Beat',
            default_delivery_person: delivPerson || 'Delivery Executive'
          };
          routeMap.set(matchedRoute.id.toUpperCase(), matchedRoute);
          routeMap.set(matchedRoute.name.toLowerCase(), matchedRoute);
          routes.push(matchedRoute);
        }

        const dp = delivPerson || matchedRoute.default_delivery_person || 'Delivery Executive';

        matched.push({
          row: rowNum,
          route_id: matchedRoute.id,
          route_name: matchedRoute.name,
          sequence: seq,
          customer_id: finalCustId,
          customer_name: finalCustName,
          address: finalAddr,
          area: area || matchedRoute.area || '',
          order_number: orderNo,
          order_id: orderNo,
          delivery_person: dp,
          order_amount: matchedOrder ? (matchedOrder.total || 0) : 0
        });
      });

      return {
        success: true,
        online: false,
        summary: {
          total_rows: rows.length,
          valid_count: matched.length,
          invalid_count: unmatched.length,
          routes_affected: new Set(matched.map(m => m.route_id)).size,
          delivery_personnel: [...new Set(matched.map(m => m.delivery_person))]
        },
        matched_records: matched,
        unmatched_records: unmatched
      };
    },

    executeRouteAssignments: async function (payload) {
      const res = await this.request('route_assignment.php?action=execute', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.online && res.data && res.data.success) {
        return res.data;
      }

      if (!window.DS_Storage) return { success: false, error: 'Storage unavailable' };

      const assignments = payload.assignments || [];
      const assignDate = payload.date || new Date().toISOString().slice(0, 10);
      const currentList = window.DS_Storage.getDeliveryAssignments();
      const currentRoutes = window.DS_Storage.getDeliveryRoutes();

      assignments.forEach((a, idx) => {
        // Ensure route in routes list
        if (!currentRoutes.some(r => r.id === a.route_id)) {
          currentRoutes.push({
            id: a.route_id,
            name: a.route_name || a.route_id,
            area: a.area || '',
            default_delivery_person: a.delivery_person
          });
        }

        // Add to assignments
        const newStop = {
          id: Date.now() + idx,
          route_id: a.route_id,
          route_name: a.route_name || a.route_id,
          sequence: a.sequence || (idx + 1),
          order_id: a.order_number || a.order_id || null,
          customer_id: a.customer_id || null,
          customer_name: a.customer_name,
          address: a.address || '',
          area: a.area || '',
          delivery_person: a.delivery_person,
          assignment_date: assignDate,
          delivery_status: 'Assigned',
          order_amount: a.order_amount || 0,
          created_at: new Date().toISOString()
        };

        // If order exists in current assignments for this date, replace it; else push
        const existIdx = currentList.findIndex(cur => cur.assignment_date === assignDate && a.order_number && cur.order_id === a.order_number);
        if (existIdx !== -1) {
          currentList[existIdx] = Object.assign(currentList[existIdx], newStop);
        } else {
          currentList.push(newStop);
        }

        // Update order status to Ready for Delivery
        if (a.order_number) {
          const orders = window.DS_Storage.getOrders();
          const ord = orders.find(o => o.id === a.order_number);
          if (ord && !String(ord.status || '').includes('Cancel')) {
            ord.status = 'Ready for Delivery';
            window.DS_Storage.saveOrders(orders);
          }
        }
      });

      window.DS_Storage.saveDeliveryRoutes(currentRoutes);
      window.DS_Storage.saveDeliveryAssignments(currentList);

      return {
        success: true,
        online: false,
        message: `Successfully assigned ${assignments.length} delivery stops for ${assignDate}`
      };
    },

    reassignDeliveryPerson: async function (payload) {
      const res = await this.request('route_assignment.php?action=reassign', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.online) return res.data;

      if (window.DS_Storage && payload.assignment_id && payload.delivery_person) {
        const ok = window.DS_Storage.reassignDeliveryPerson(payload.assignment_id, payload.delivery_person);
        return { success: ok, online: false };
      }
      return { success: false };
    },

    reorderRouteStops: async function (stops) {
      const res = await this.request('route_assignment.php?action=reorder', {
        method: 'POST',
        body: JSON.stringify({ stops: stops })
      });
      if (res.online) return res.data;

      if (window.DS_Storage) {
        const ok = window.DS_Storage.reorderRouteStops(stops);
        return { success: ok, online: false };
      }
      return { success: false };
    },

    getRouteManifest: async function (routeId, date = '') {
      const res = await this.request(`route_assignment.php?action=manifest&route_id=${encodeURIComponent(routeId)}&date=${encodeURIComponent(date)}`);
      if (res.online && res.data) return res.data;

      if (!window.DS_Storage) return null;
      const targetDate = date || new Date().toISOString().slice(0, 10);
      const routes = window.DS_Storage.getDeliveryRoutes();
      const route = routes.find(r => r.id === routeId) || { id: routeId, name: routeId, default_delivery_person: 'Delivery Staff' };
      const assignments = window.DS_Storage.getDeliveryAssignments().filter(a => a.route_id === routeId && (!targetDate || a.assignment_date === targetDate));
      assignments.sort((a, b) => (a.sequence || 1) - (b.sequence || 1));

      const orders = window.DS_Storage.getOrders();
      let totalCod = 0;
      let totalUnits = 0;

      const stops = assignments.map(a => {
        const ord = orders.find(o => o.id === a.order_id);
        const amt = ord ? (ord.total || 0) : (a.order_amount || 0);
        const isPaid = ord ? (ord.payment === 'Paid') : (a.delivery_status === 'Delivered');
        if (!isPaid) totalCod += amt;
        const u = ord ? (ord.qty || 0) : 0;
        totalUnits += u;

        return Object.assign({}, a, {
          total_amount: amt,
          total_qty: u,
          payment_status: isPaid ? 'Paid' : 'Unpaid',
          items: ord ? (ord.items || []) : []
        });
      });

      return {
        success: true,
        route: route,
        assignment_date: targetDate,
        delivery_person: stops[0]?.delivery_person || route.default_delivery_person,
        summary: {
          total_stops: stops.length,
          total_units: totalUnits,
          total_cod_amount: totalCod
        },
        stops: stops,
        online: false
      };
    },

    updateDeliveryStopStatus: async function (assignmentId, status) {
      const res = await this.request('route_assignment.php?action=update_status', {
        method: 'POST',
        body: JSON.stringify({ assignment_id: assignmentId, status: status })
      });
      if (res.online) return res.data;

      if (window.DS_Storage) {
        const ok = window.DS_Storage.updateDeliveryStopStatus(assignmentId, status);
        return { success: ok, online: false };
      }
      return { success: false };
    }
  };

  window.DS_API = DS_API;

  // Auto-detect backend connection in background
  DS_API.checkBackendHealth().then(online => {
    if (online) {
      console.log('✓ DS Enterprises PHP MySQL backend connected successfully.');
    } else {
      console.log('ℹ DS Enterprises operating in Zero-Build Offline LocalStorage mode.');
    }
  });

})(window);
