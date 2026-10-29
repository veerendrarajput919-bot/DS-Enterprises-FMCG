/**
 * ==========================================================================
 * DS ENTERPRISES — PAYMENT COLLECTIONS CONTROLLER
 * File: assets/js/payments.js
 * Architecture: Field Cash/UPI Collection, Ledger Reduction & WhatsApp Receipts
 * ==========================================================================
 */

(function (window) {
  'use strict';

  const DS_Payments = {
    init: function () {
      this.populatePartySelect();
      this.populateFilters();
      this.bindFilterEvents();
      this.renderCollectionsTable();
      this.checkUrlParams();
    },

    populateFilters: function () {
      const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
      const parties = db.party || [];
      const sales = db.sales || [];

      const fillSel = (id, items) => {
        const el = document.getElementById(id);
        if (!el) return;
        const cur = el.value;
        el.innerHTML = '<option value="">All</option>' + items.map(v => `<option value="${DS_App.escapeHtml(v)}">${DS_App.escapeHtml(v)}</option>`).join('');
        if (cur && items.includes(cur)) el.value = cur;
      };

      const cities = Array.from(new Set(parties.map(p => p.city).filter(Boolean))).sort();
      const city1s = Array.from(new Set(parties.map(p => p.city1).filter(Boolean))).sort();
      const routes = Array.from(new Set(parties.map(p => p.route).filter(Boolean))).sort();
      const cats = Array.from(new Set(parties.map(p => p.category).filter(Boolean))).sort();
      const subCats = Array.from(new Set([
        ...parties.map(p => p.subCategory || p['Sub Category']),
        ...sales.map(s => s.subCategory || s['Sub Category'] || s.partySubCategory || s.itemSubCategory)
      ].filter(Boolean))).sort();
      const brands = Array.from(new Set(sales.map(s => s.brand).filter(Boolean))).sort();

      fillSel('pCity', cities);
      fillSel('pCity1', city1s);
      fillSel('pRoute', routes);
      fillSel('pCat', cats);
      fillSel('pSubCat', subCats);
      fillSel('pBrand', brands);
    },

    bindFilterEvents: function () {
      const preset = document.getElementById('pPreset');
      if (preset && !preset._bound) {
        preset._bound = true;
        preset.addEventListener('change', () => {
          this.applyPreset(preset.value);
          this.renderCollectionsTable();
        });
      }

      ['pFrom', 'pTo'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el._bound) {
          el._bound = true;
          el.addEventListener('change', () => {
            const p = document.getElementById('pPreset');
            if (p) p.value = 'custom';
            this.renderCollectionsTable();
          });
        }
      });

      ['pCity', 'pCity1', 'pRoute', 'pCat', 'pSubCat', 'pBrand', 'pMode'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el._bound) {
          el._bound = true;
          el.addEventListener('change', () => this.renderCollectionsTable());
        }
      });

      ['pBillNo', 'pSearch'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el._bound) {
          el._bound = true;
          el.addEventListener('input', () => this.renderCollectionsTable());
        }
      });
    },

    applyPreset: function (val) {
      const f = document.getElementById('pFrom');
      const t = document.getElementById('pTo');
      if (!f || !t) return;
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const d = now.getDate();
      const pad = n => String(n).padStart(2, '0');
      const fmt = dt => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;

      if (val === 'today') {
        f.value = fmt(now);
        t.value = fmt(now);
      } else if (val === 'yesterday') {
        const yest = new Date(y, m, d - 1);
        f.value = fmt(yest);
        t.value = fmt(yest);
      } else if (val === '7days') {
        const d7 = new Date(y, m, d - 6);
        f.value = fmt(d7);
        t.value = fmt(now);
      } else if (val === 'month') {
        f.value = fmt(new Date(y, m, 1));
        t.value = fmt(now);
      } else if (val === 'lastmonth') {
        f.value = fmt(new Date(y, m - 1, 1));
        t.value = fmt(new Date(y, m, 0));
      } else if (val === '3months') {
        f.value = fmt(new Date(y, m - 2, 1));
        t.value = fmt(now);
      } else if (val === '365days') {
        const d365 = new Date(y, m, d - 365);
        f.value = fmt(d365);
        t.value = fmt(now);
      } else if (val === 'all') {
        f.value = '';
        t.value = '';
      }
    },

    resetFilters: function () {
      const p = document.getElementById('pPreset');
      if (p) p.value = 'all';
      const f = document.getElementById('pFrom');
      if (f) f.value = '';
      const t = document.getElementById('pTo');
      if (t) t.value = '';
      ['pCity', 'pCity1', 'pRoute', 'pCat', 'pSubCat', 'pBrand', 'pMode'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      ['pBillNo', 'pSearch'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      this.renderCollectionsTable();
    },

    checkUrlParams: function () {
      const urlParams = new URLSearchParams(window.location.search);
      const partyParam = urlParams.get('party');
      const invoiceParam = urlParams.get('invoice') || urlParams.get('bill');
      const amountParam = urlParams.get('amount');

      if (partyParam) {
        const sel = document.getElementById('paymentPartySelect');
        if (sel) {
          for (let opt of sel.options) {
            if (opt.value.trim().toLowerCase() === partyParam.trim().toLowerCase()) {
              sel.value = opt.value;
              break;
            }
          }
          if (!sel.value) {
            const opt = document.createElement('option');
            opt.value = partyParam;
            opt.textContent = `${partyParam} (Direct Entry)`;
            sel.appendChild(opt);
            sel.value = partyParam;
          }
          this.onPartyChange(sel.value);
        }
      }

      if (amountParam) {
        const amtInput = document.getElementById('paymentAmountInput');
        if (amtInput) amtInput.value = amountParam;
      }

      if (invoiceParam) {
        const refInput = document.getElementById('paymentRefInput');
        if (refInput && (!refInput.value || refInput.value === 'CASH-REC')) {
          refInput.value = invoiceParam;
        }
        const remInput = document.getElementById('paymentRemarksInput');
        if (remInput && (!remInput.value || remInput.value === 'Weekly collection recovery')) {
          remInput.value = `Collection for Bill ${invoiceParam}`;
        }
      }
    },

    populatePartySelect: function () {
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { party: [] };
      const parties = db.party || [];
      const sel = document.getElementById('paymentPartySelect');
      if (!sel) return;

      sel.innerHTML = '<option value="">-- Choose Retail Store / Kirana --</option>' + parties.map(p => `
        <option value="${DS_App.escapeHtml(p.name)}">${DS_App.escapeHtml(p.name)} (Bal: ₹ ${(p.outstanding || 0).toLocaleString('en-IN')})</option>
      `).join('');

      sel.onchange = () => this.onPartyChange(sel.value);
    },

    onPartyChange: function (partyName) {
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { party: [] };
      const store = (db.party || []).find(p => p.name === partyName);
      const outEl = document.getElementById('paymentCurrentOutstanding');
      const amtInput = document.getElementById('paymentAmountInput');

      if (outEl) {
        if (store) {
          outEl.textContent = DS_App.money(store.outstanding || 0);
          if (amtInput && !amtInput.value) amtInput.value = store.outstanding || '';
        } else {
          outEl.textContent = '₹ 0.00';
        }
      }
    },

    recordPayment: function (event) {
      if (event) event.preventDefault();

      if (window.DS_Auth && !window.DS_Auth.hasPermission('canCollectPayments')) {
        DS_App.toast('Permission Denied: Your active role does not have permission to record payments.', 'error');
        return;
      }

      const partyName = document.getElementById('paymentPartySelect')?.value;
      const amount = parseFloat(document.getElementById('paymentAmountInput')?.value);
      const mode = document.getElementById('paymentModeSelect')?.value || 'Cash';
      const refNo = document.getElementById('paymentRefInput')?.value || (mode === 'Cash' ? 'CASH-REC' : '');
      const remarks = document.getElementById('paymentRemarksInput')?.value || 'Weekly collection recovery';

      if (!partyName) {
        DS_App.toast('Select a store first', 'error');
        return;
      }
      if (isNaN(amount) || amount <= 0) {
        DS_App.toast('Enter a valid collection amount', 'error');
        return;
      }

      const db = window.DS_Storage.getDB();
      const store = (db.party || []).find(p => p.name === partyName);
      const activeSo = window.DS_Auth ? window.DS_Auth.getActiveSo() : { name: 'Field Executive' };

      const collections = window.DS_Storage.getCollections();
      let maxRec = 3000;
      collections.forEach(c => {
        if (c && c.id) {
          const m = String(c.id).match(/\d+$/);
          if (m) {
            const n = parseInt(m[0], 10);
            if (!isNaN(n) && n > maxRec) maxRec = n;
          }
        }
      });
      const receiptId = `REC-2026-${maxRec + 1}`;
      const today = new Date();
      const ymd = today.toISOString().split('T')[0];
      const timeStr = today.toTimeString().split(' ')[0].substring(0, 5);

      const newRec = {
        id: receiptId,
        date: ymd,
        time: timeStr,
        party: partyName,
        phone: store ? store.phone : '',
        route: store ? store.route : '',
        amount: amount,
        paymentMode: mode,
        referenceNo: refNo,
        collectedBy: activeSo.name,
        remarks: remarks
      };

      collections.push(newRec);
      window.DS_Storage.saveCollections(collections);

      // Reduce party outstanding
      if (store) {
        store.outstanding = Math.max(0, (Number(store.outstanding) || 0) - amount);
      }

      // Also adjust unpaid invoices if available
      let remainingCredit = amount;
      (db.unpaid || []).filter(u => u.party === partyName).forEach(inv => {
        if (remainingCredit > 0) {
          const bal = Number(inv.balanceAmount || inv.totalAmount) || 0;
          if (remainingCredit >= bal) {
            remainingCredit -= bal;
            inv.balanceAmount = 0;
          } else {
            inv.balanceAmount = bal - remainingCredit;
            remainingCredit = 0;
          }
        }
      });

      window.DS_Storage.saveDB(db);

      DS_App.toast(`Payment ${receiptId} of ${DS_App.money(amount)} recorded!`, 'success');

      // Reset form
      document.getElementById('paymentAmountInput').value = '';
      if (document.getElementById('paymentRefInput')) document.getElementById('paymentRefInput').value = '';
      this.populatePartySelect();
      this.renderCollectionsTable();

      // Automatically copy formatted receipt text to clipboard and show modal
      if (window.DS_WhatsApp) {
        window.DS_WhatsApp.copyPaymentReceipt(newRec);
      }
    },

    copyReceiptText: function (receiptId) {
      const colls = window.DS_Storage ? window.DS_Storage.getCollections() : [];
      const rec = colls.find(c => c.id === receiptId);
      if (rec && window.DS_WhatsApp) {
        window.DS_WhatsApp.copyPaymentReceipt(rec);
      } else if (!rec) {
        DS_App.toast('Receipt record not found', 'error');
      }
    },

    // Backward compatibility alias
    sendReceiptWhatsApp: function (receiptId) {
      return this.copyReceiptText(receiptId);
    },

    renderCollectionsTable: function () {
      const tbody = document.getElementById('collectionsTableBody');
      if (!tbody) return;

      const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
      const partyMap = {};
      (db.party || []).forEach(p => { if (p && p.name) partyMap[p.name] = p; });

      const from = document.getElementById('pFrom')?.value || '';
      const to = document.getElementById('pTo')?.value || '';
      const city = document.getElementById('pCity')?.value || '';
      const city1 = document.getElementById('pCity1')?.value || '';
      const route = document.getElementById('pRoute')?.value || '';
      const cat = document.getElementById('pCat')?.value || '';
      const subCat = document.getElementById('pSubCat')?.value || '';
      const brand = document.getElementById('pBrand')?.value || '';
      const mode = document.getElementById('pMode')?.value || '';
      const billNo = (document.getElementById('pBillNo')?.value || '').trim().toLowerCase();
      const search = (document.getElementById('pSearch')?.value || '').trim().toLowerCase();

      let brandParties = null;
      if (brand) {
        brandParties = new Set(
          (db.sales || []).filter(s => s && s.brand === brand).map(s => s.party)
        );
      }

      const colls = (window.DS_Storage ? window.DS_Storage.getCollections() : []);
      const seen = new Set();
      const unique = [];
      for (const c of colls) {
        if (c && c.id && !seen.has(c.id)) {
          seen.add(c.id);
          unique.push(c);
        } else if (c && !c.id) {
          unique.push(c);
        }
      }
      unique.reverse();

      const filtered = unique.filter(c => {
        if (from && c.date && c.date < from) return false;
        if (to && c.date && c.date > to) return false;

        const store = partyMap[c.party];
        const storeSubCat = store?.subCategory || store?.['Sub Category'] || c.subCategory || '';
        if (city && (!store || store.city !== city)) return false;
        if (city1 && (!store || store.city1 !== city1)) return false;
        if (route && (c.route !== route && (!store || store.route !== route))) return false;
        if (cat && (!store || store.category !== cat)) return false;
        if (subCat && storeSubCat !== subCat) return false;
        if (brand && (!brandParties || !brandParties.has(c.party))) return false;
        if (mode && c.paymentMode !== mode) return false;

        if (billNo) {
          const mId = c.id && c.id.toLowerCase().includes(billNo);
          const mRef = c.referenceNo && c.referenceNo.toLowerCase().includes(billNo);
          if (!mId && !mRef) return false;
        }

        if (search) {
          const mParty = c.party && c.party.toLowerCase().includes(search);
          const mId = c.id && c.id.toLowerCase().includes(search);
          const mRef = c.referenceNo && c.referenceNo.toLowerCase().includes(search);
          const mRem = c.remarks && c.remarks.toLowerCase().includes(search);
          const mCol = c.collectedBy && c.collectedBy.toLowerCase().includes(search);
          if (!mParty && !mId && !mRef && !mRem && !mCol) return false;
        }

        return true;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--ds-text-muted);">No payment collections matching the selected filters.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(c => {
        const officerName = c.collectedBy ? c.collectedBy.replace(/\s*\([^)]*\)/g, '').trim() : '-';
        return `
        <tr>
          <td><strong>${c.id}</strong></td>
          <td>${DS_App.formatDate(c.date)} ${c.time || ''}</td>
          <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis;" title="${DS_App.escapeHtml(c.party)}"><strong>${DS_App.escapeHtml(c.party)}</strong></td>
          <td><span class="badge" style="background:#e0f2fe; color:#0369a1;">${DS_App.escapeHtml(c.paymentMode)}</span></td>
          <td class="num"><strong>${DS_App.money(c.amount)}</strong></td>
          <td title="${DS_App.escapeHtml(c.collectedBy || '-')}">${DS_App.escapeHtml(officerName)}</td>
          <td style="text-align:center; width:75px;">
            <button type="button" class="btn btn-primary btn-sm" style="padding:4px 8px; font-size:11px;" onclick="DS_Payments.copyReceiptText('${c.id}')" title="Copy Payment Receipt for WhatsApp">📋 Copy</button>
          </td>
        </tr>
      `;
      }).join('');
    }
  };

  window.DS_Payments = DS_Payments;

  if (document.getElementById('collectionsTableBody')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => DS_Payments.init());
    } else {
      DS_Payments.init();
    }
  }

})(window);
