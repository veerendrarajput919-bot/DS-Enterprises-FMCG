
    /**
     * ========================================================================
     * PARTY WISE CONTROLLER (Inline Engine for pages/party-wise.html)
     * ========================================================================
     */
    (function (window) {
      'use strict';

      let MONTHLY_CHART = null;

      function n(v) {
        if (v === null || v === undefined) return 0;
        const s = String(v).replace(/₹|,/g, '').replace(/[^0-9.\-]/g, '');
        return parseFloat(s) || 0;
      }

      function esc(s) {
        return String(s ?? '').replace(/[&<>"']/g, m => ({
          '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m]));
      }

      function ymd(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }

      function pwDateDiff(ds) {
        const d = new Date(String(ds || '').slice(0, 10) + 'T00:00:00');
        if (Number.isNaN(d.getTime())) return 99999;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return Math.max(0, Math.floor((today - d) / 86400000));
      }

      const DS_PartyWise = {
        init: function () {
          this.populateFilterDropdowns();
          this.bindEvents();
          this.applyPreset();
          this.update();

          window.addEventListener('ds:db-updated', () => {
            this.populateFilterDropdowns();
            this.update();
          });
        },

        bindEvents: function () {
          document.getElementById('pwPreset')?.addEventListener('change', () => this.applyPreset());
          document.getElementById('pwFrom')?.addEventListener('change', () => {
            const p = document.getElementById('pwPreset');
            if (p) p.value = 'custom';
            this.update();
          });
          document.getElementById('pwTo')?.addEventListener('change', () => {
            const p = document.getElementById('pwPreset');
            if (p) p.value = 'custom';
            this.update();
          });

          ['pwCity', 'pwCity1', 'pwRoute', 'pwCat', 'pwSubCat', 'pwBrand', 'pwBillNo', 'pwStatus'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
              el.addEventListener('change', () => this.update());
              if (el.tagName === 'INPUT') el.addEventListener('input', () => this.update());
            }
          });

          const searchInput = document.getElementById('pwPartySearch');
          if (searchInput) {
            searchInput.addEventListener('input', () => {
              this.renderPartyDetails();
              this.update();
            });
            searchInput.addEventListener('change', () => {
              this.renderPartyDetails();
              this.update();
            });
          }

          document.getElementById('pwPartySort')?.addEventListener('change', () => this.renderPartySummaryList());
          document.getElementById('pwPartyTableSearch')?.addEventListener('input', () => this.renderPartySummaryList());

          // Top Party Events
          document.getElementById('pwTopPartyPreset')?.addEventListener('change', () => this.applyTopPartyPreset());
          document.getElementById('pwTopPartyFrom')?.addEventListener('change', () => this.renderTopPartySales());
          document.getElementById('pwTopPartyTo')?.addEventListener('change', () => this.renderTopPartySales());
          document.getElementById('pwTopPartyBrand')?.addEventListener('change', () => this.renderTopPartySales());
          document.getElementById('pwTopPartyClearBtn')?.addEventListener('click', () => {
            const p = document.getElementById('pwTopPartyPreset'); if (p) p.value = 'all';
            const f = document.getElementById('pwTopPartyFrom'); if (f) f.value = '';
            const t = document.getElementById('pwTopPartyTo'); if (t) t.value = '';
            const b = document.getElementById('pwTopPartyBrand'); if (b) b.value = '';
            this.renderTopPartySales();
          });
          document.getElementById('pwTopPartyExcelBtn')?.addEventListener('click', () => this.exportTopPartyExcel());

          // No Sale Events
          ['pwNoSaleBrandSelect', 'pwNoSaleFirmSelect', 'pwNoSaleFrom', 'pwNoSaleTo', 'pwNoSaleSinceSelect'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.renderNoSale());
          });
          document.getElementById('pwNoSaleClearBtn')?.addEventListener('click', () => {
            const f = document.getElementById('pwNoSaleFirmSelect'); if (f) f.value = '';
            const b = document.getElementById('pwNoSaleBrandSelect'); if (b) b.value = '';
            const from = document.getElementById('pwNoSaleFrom'); if (from) from.value = '';
            const to = document.getElementById('pwNoSaleTo'); if (to) to.value = '';
            const s = document.getElementById('pwNoSaleSinceSelect'); if (s) s.value = 'range';
            this.renderNoSale();
          });
          document.getElementById('pwNoSaleExcelBtn')?.addEventListener('click', () => this.exportNoSaleExcel());
        },

        clearPartyTableSearch: function () {
          const inp = document.getElementById('pwPartyTableSearch');
          if (inp) inp.value = '';
          const clearBtn = document.getElementById('pwPartyTableSearchClear');
          if (clearBtn) clearBtn.style.display = 'none';
          this.renderPartySummaryList();
        },

        resetFilters: function () {
          const p = document.getElementById('pwPreset');
          if (p) p.value = 'month';
          ['pwCity', 'pwCity1', 'pwRoute', 'pwCat', 'pwSubCat', 'pwBrand', 'pwBillNo', 'pwStatus', 'pwPartySearch', 'pwPartyTableSearch'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
          });
          const clearBtn = document.getElementById('pwPartyTableSearchClear');
          if (clearBtn) clearBtn.style.display = 'none';
          this.applyPreset();
        },

        applyPreset: function () {
          const v = document.getElementById('pwPreset')?.value || 'month';
          const f = document.getElementById('pwFrom');
          const t = document.getElementById('pwTo');
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          let a = null, b = today;

          if (v === 'today') a = today;
          else if (v === 'yesterday') { a = new Date(today); a.setDate(a.getDate() - 1); b = a; }
          else if (v === '7days') { a = new Date(today); a.setDate(a.getDate() - 6); }
          else if (v === 'lastmonth') {
            a = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            b = new Date(today.getFullYear(), today.getMonth(), 0);
          }
          else if (v === '15days') { a = new Date(today); a.setDate(a.getDate() - 14); }
          else if (v === 'month') { a = new Date(today.getFullYear(), today.getMonth(), 1); }
          else if (v === '2months') { a = new Date(today.getFullYear(), today.getMonth() - 1, 1); }
          else if (v === '3months') { a = new Date(today.getFullYear(), today.getMonth() - 2, 1); }
          else if (v === '6months') { a = new Date(today.getFullYear(), today.getMonth() - 5, 1); }
          else if (v === '365days') { a = new Date(today); a.setDate(a.getDate() - 364); }
          else if (v === 'all') { a = null; b = null; }

          if (v !== 'custom' && f && t) {
            f.value = a ? ymd(a) : '';
            t.value = b ? ymd(b) : '';
          }
          this.update();
        },

        populateFilterDropdowns: function () {
          const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
          const sales = db.sales || [];
          const stock = db.stock || [];
          const party = db.party || [];

          const brands = [...new Set(sales.map(x => x.Brand || x.brand).filter(Boolean))].sort();
          const firms = [...new Set(stock.map(x => x['Firm Name'] || x.Firm || x.firm).filter(Boolean))].sort();
          const city1s = [...new Set(sales.map(x => x.City_1 || x.city1 || x.City || x.city).filter(Boolean))].sort();
          const cities = [...new Set(sales.map(x => x.City || x.city).filter(Boolean))].sort();
          const routes = [...new Set(sales.map(x => x.Route || x.route).filter(Boolean))].sort();
          const categories = [...new Set([...sales.map(x => x['Party Category'] || x.category || x.partyCategory), ...party.map(x => x['Party Category'] || x.category || x.partyCategory)].filter(Boolean))].sort();
          const subcategories = [...new Set([...sales.map(x => x.subCategory || x['Sub Category'] || x.partySubCategory || x.itemSubCategory), ...party.map(x => x.subCategory || x['Sub Category'])].filter(Boolean))].sort();

          const fill = (id, arr, def) => {
            const el = document.getElementById(id);
            if (!el) return;
            const cur = el.value;
            el.innerHTML = `<option value="">${def}</option>` + arr.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
            if (arr.includes(cur)) el.value = cur;
          };

          fill('pwCity', cities, 'All');
          fill('pwCity1', city1s, 'All');
          fill('pwRoute', routes, 'All');
          fill('pwCat', categories, 'All');
          fill('pwSubCat', subcategories, 'All');
          fill('pwBrand', brands, 'All');
          fill('pwTopPartyBrand', brands, 'All Brands');
          fill('pwNoSaleBrandSelect', brands, 'All Brands');
          fill('pwNoSaleFirmSelect', firms, 'All Firms');

          // Autocomplete Party Search List
          const dl = document.getElementById('pwPartyList');
          if (dl) {
            const partyNames = [...new Set(sales.map(x => String(x['Party Name'] || x.party || x.party_name || '').trim()).filter(Boolean))].sort();
            dl.innerHTML = partyNames.map(p => `<option value="${esc(p)}"></option>`).join('');
          }
        },

        getFilteredSales: function () {
          const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
          const f = document.getElementById('pwFrom')?.value || '';
          const t = document.getElementById('pwTo')?.value || '';
          const brand = document.getElementById('pwBrand')?.value || '';
          const c1 = document.getElementById('pwCity1')?.value || '';
          const c = document.getElementById('pwCity')?.value || '';
          const r = document.getElementById('pwRoute')?.value || '';
          const cat = document.getElementById('pwCat')?.value || '';
          const subCat = document.getElementById('pwSubCat')?.value || '';
          const billFilter = String(document.getElementById('pwBillNo')?.value || '').trim().toLowerCase();
          const statusFilter = String(document.getElementById('pwStatus')?.value || '').trim().toLowerCase();
          const searchVal = String(document.getElementById('pwPartySearch')?.value || '').trim().toLowerCase();
          const unpaidSet = new Set((db.unpaid || []).map(x => String(x.invoice || x.billNo || x.invoiceNo || x.bill_no || x.invoice_no || '').trim()).filter(Boolean));

          return (db.sales || []).filter(x => {
            const d = String(x.Date || x.date || x.invoice_date || '').slice(0, 10);
            if (f && d < f) return false;
            if (t && d > t) return false;
            if (brand && String(x.Brand || x.brand || '') !== brand) return false;
            const xC1 = x.City_1 || x.city1 || x.City || x.city || '';
            const xC = x.City || x.city || '';
            const xR = x.Route || x.route || '';
            const xCat = x['Party Category'] || x.category || x.partyCategory || '';
            const xSubCat = x.subCategory || x['Sub Category'] || x.partySubCategory || x.itemSubCategory || '';
            const inv = String(x['Invoice No.'] || x.invoiceNo || x.invoice_no || '');
            const bill = String(x.bill_no || x.billNo || x['Bill No.'] || '');
            const party = String(x['Party Name'] || x.party || x.party_name || '');
            const item = String(x['Item Name'] || x.item || x.item_name || '');

            if (c1 && String(xC1) !== c1) return false;
            if (c && String(xC) !== c) return false;
            if (r && String(xR) !== r) return false;
            if (cat && String(xCat) !== cat) return false;
            if (subCat && String(xSubCat) !== subCat) return false;

            if (billFilter && !inv.toLowerCase().includes(billFilter) && !bill.toLowerCase().includes(billFilter)) {
              return false;
            }

            if (statusFilter) {
              const isUnpaid = unpaidSet.has(inv) || unpaidSet.has(bill) || String(x.status || x.payment_status || '').toLowerCase() === 'unpaid';
              if (statusFilter === 'unpaid' && !isUnpaid) return false;
              if (statusFilter === 'paid' && isUnpaid) return false;
            }

            if (searchVal && ![party, inv, bill, item, xR, xC1].join(' ').toLowerCase().includes(searchVal)) {
              return false;
            }

            return true;
          });
        },

        update: function () {
          const rows = this.getFilteredSales();
          const parties = new Set(rows.map(x => String(x['Party Name'] || x.party || x.party_name || '').trim()).filter(Boolean));
          const bills = new Set(rows.map(x => String(x.bill_no || x['Invoice No.'] || x.invoiceNo || x.invoice_no || '').trim()).filter(Boolean));
          const salesVal = rows.reduce((s, x) => s + (n(x.AmountNum) || n(x.amount) || n(x.total_amount)), 0);
          const retQty = rows.reduce((s, x) => {
            const q = n(x.QtyNum) || n(x.qty) || n(x.quantity);
            return s + (q < 0 ? Math.abs(q) : 0);
          }, 0);

          const kpiEl = document.getElementById('pwKpi');
          if (kpiEl) {
            kpiEl.innerHTML = [
              ['Total Sales Turnover', DS_App.money(salesVal), 'emerald'],
              ['Billed Parties / Stores', parties.size.toLocaleString('en-IN'), 'blue'],
              ['Invoices Raised', bills.size.toLocaleString('en-IN'), 'blue'],
              ['Total Return Qty', DS_App.qty(retQty), 'amber']
            ].map(it => `
              <div class="kpi-card ${it[2]}" style="padding:12px 14px;">
                <div class="kpi-label">${it[0]}</div>
                <div class="kpi-value" style="font-size:20px; font-weight:800;">${it[1]}</div>
              </div>
            `).join('');
          }

          this.renderPartySummaryList();
          this.renderPartyDetails();
          this.renderMonthlySales(rows);
          this.renderTopPartySales();
          this.renderNoSale();
          this.renderReturns(rows);
        },

        renderPartySummaryList: function () {
          const rows = this.getFilteredSales();
          const map = new Map();

          rows.forEach(x => {
            const party = String(x['Party Name'] || x.party || '').trim();
            if (!party) return;
            const o = map.get(party) || {
              party,
              sale: 0,
              invoices: new Set(),
              returnQty: 0,
              city1: x.City_1 || x.city1 || '',
              city: x.City || x.city || '',
              route: x.Route || x.route || ''
            };
            const q = n(x.QtyNum) || n(x.qty);
            const amt = n(x.AmountNum) || n(x.amount);
            o.sale += amt;
            const inv = String(x['Invoice No.'] || x.invoiceNo || '').trim();
            if (inv) o.invoices.add(inv);
            if (q < 0 || amt < 0) o.returnQty += Math.abs(q);
            map.set(party, o);
          });

          let data = [...map.values()].map(g => ({
            party: g.party,
            sale: g.sale,
            invoices: g.invoices.size,
            returnQty: g.returnQty,
            avg: g.invoices.size ? g.sale / g.invoices.size : 0,
            city1: g.city1,
            city: g.city,
            route: g.route
          }));

          const tableSearch = String(document.getElementById('pwPartyTableSearch')?.value || '').trim().toLowerCase();
          const clearBtn = document.getElementById('pwPartyTableSearchClear');
          if (clearBtn) {
            clearBtn.style.display = tableSearch ? 'inline-block' : 'none';
          }

          if (tableSearch) {
            data = data.filter(g => {
              const p = String(g.party || '').toLowerCase();
              const c1 = String(g.city1 || '').toLowerCase();
              const c = String(g.city || '').toLowerCase();
              const r = String(g.route || '').toLowerCase();
              return p.includes(tableSearch) || c1.includes(tableSearch) || c.includes(tableSearch) || r.includes(tableSearch);
            });
          }

          const mode = document.getElementById('pwPartySort')?.value || 'sale_desc';
          const dir = mode.endsWith('_asc') ? 1 : -1;
          const key = mode.replace(/_(asc|desc)$/, '');

          data.sort((a, b) => {
            if (key === 'party') return a.party.localeCompare(b.party) * dir;
            return ((a[key] || 0) - (b[key] || 0)) * dir;
          });

          const tbody = document.getElementById('pwPartySummaryTable')?.querySelector('tbody');
          if (tbody) {
            if (data.length === 0) {
              tbody.innerHTML = `
                <tr>
                  <td colspan="9" class="text-center" style="padding:24px; color:var(--ds-text-muted);">
                    <div style="font-size:13px; font-weight:700; margin-bottom:6px; color:#475569;">
                      ${tableSearch ? `No parties found matching search "${esc(tableSearch)}"` : 'No parties found for selected filters'}
                    </div>
                    ${tableSearch ? '<button type="button" class="btn btn-sm btn-secondary" onclick="DS_PartyWise.clearPartyTableSearch()">↺ Clear Search</button>' : ''}
                  </td>
                </tr>
              `;
              return;
            }

            tbody.innerHTML = data.map((g, i) => `
              <tr>
                <td class="num">${i + 1}</td>
                <td><strong style="cursor:pointer; color:#1d4ed8;" onclick="document.getElementById('pwPartySearch').value='${esc(g.party)}'; DS_PartyWise.renderPartyDetails();">${esc(g.party)}</strong></td>
                <td class="num font-mono"><strong>${DS_App.money(g.sale)}</strong></td>
                <td class="num">${g.invoices}</td>
                <td class="num font-mono" style="${g.returnQty > 0 ? 'color:#b91c1c;' : ''}">${DS_App.qty(g.returnQty)}</td>
                <td class="num font-mono">${DS_App.money(g.avg)}</td>
                <td>${esc(g.city1)}</td>
                <td>${esc(g.city)}</td>
                <td>${esc(g.route)}</td>
              </tr>
            `).join('');
          }
        },

        renderPartyDetails: function () {
          const search = String(document.getElementById('pwPartySearch')?.value || '').trim().toLowerCase();
          const box = document.getElementById('pwPartyDetail');
          if (!box) return;

          if (!search) {
            box.style.display = 'none';
            return;
          }

          const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
          const allSales = db.sales || [];
          const exact = allSales.find(x => String(x['Party Name'] || x.party || '').trim().toLowerCase() === search);
          const party = exact
            ? String(exact['Party Name'] || exact.party).trim()
            : (allSales.map(x => String(x['Party Name'] || x.party || '').trim()).find(p => p.toLowerCase().includes(search)) || '');

          if (!party) {
            box.style.display = 'none';
            return;
          }

          const pr = allSales.filter(x => String(x['Party Name'] || x.party || '').trim() === party);
          const unpaidSet = new Set((db.unpaid || []).map(x => String(x.invoice || x.billNo || x.invoiceNo || '').trim()).filter(Boolean));

          const invMap = new Map();
          pr.forEach(x => {
            const inv = String(x['Invoice No.'] || x.invoiceNo || '').trim();
            if (!inv) return;
            const o = invMap.get(inv) || { date: x.Date || x.date || '', amount: 0, status: 'Paid' };
            o.amount += (n(x.AmountNum) || n(x.amount));
            o.status = unpaidSet.has(inv) ? 'Unpaid' : 'Paid';
            if (String(x.Date || x.date || '') > String(o.date)) o.date = x.Date || x.date;
            invMap.set(inv, o);
          });

          const totalSale = pr.reduce((s, x) => s + (n(x.AmountNum) || n(x.amount)), 0);
          const outRows = pr.filter(x => unpaidSet.has(String(x['Invoice No.'] || x.invoiceNo || '').trim()));
          const outstanding = outRows.reduce((s, x) => s + (n(x.AmountNum) || n(x.amount)), 0);
          const lastBill = [...invMap.values()].map(x => x.date).filter(Boolean).sort().pop() || '-';

          document.getElementById('pwSelectedPartyTitle').textContent = `${party} — Retailer Analysis`;

          const partyKpi = document.getElementById('pwPartyKpi');
          if (partyKpi) {
            partyKpi.innerHTML = [
              ['Total Sale', DS_App.money(totalSale), 'emerald'],
              ['Total Bills', invMap.size.toLocaleString('en-IN'), 'blue'],
              ['Average Bill', DS_App.money(invMap.size ? totalSale / invMap.size : 0), 'blue'],
              ['Outstanding Due', DS_App.money(outstanding), 'amber'],
              ['Unpaid Bills', new Set(outRows.map(x => x['Invoice No.'] || x.invoiceNo)).size.toLocaleString('en-IN'), 'amber'],
              ['Last Bill Date', lastBill, 'blue']
            ].map(it => `
              <div class="kpi-card ${it[2]}" style="padding:10px 12px;">
                <div class="kpi-label">${it[0]}</div>
                <div class="kpi-value" style="font-size:18px; font-weight:800;">${it[1]}</div>
              </div>
            `).join('');
          }

          // 1. Brand sales
          const bm = new Map();
          pr.forEach(x => {
            const b = String(x.Brand || x.brand || 'Unmapped').trim() || 'Unmapped';
            const o = bm.get(b) || { sale: 0, qty: 0, bills: new Set() };
            o.sale += (n(x.AmountNum) || n(x.amount));
            o.qty += (n(x.QtyNum) || n(x.qty));
            const inv = String(x['Invoice No.'] || x.invoiceNo || '').trim();
            if (inv) o.bills.add(inv);
            bm.set(b, o);
          });
          const brandBody = document.getElementById('pwPartyBrandSales')?.querySelector('tbody');
          if (brandBody) {
            brandBody.innerHTML = [...bm.entries()].sort((a, b) => b[1].sale - a[1].sale).map(it => `
              <tr>
                <td><strong>${esc(it[0])}</strong></td>
                <td class="num font-mono">${DS_App.money(it[1].sale)}</td>
                <td class="num">${DS_App.qty(it[1].qty)}</td>
                <td class="num">${it[1].bills.size}</td>
              </tr>
            `).join('') || '<tr><td colspan="4" class="muted text-center">No brand data</td></tr>';
          }

          // 2. Bill History
          const billBody = document.getElementById('pwPartyBills')?.querySelector('tbody');
          if (billBody) {
            billBody.innerHTML = [...invMap.entries()].sort((a, b) => String(b[1].date).localeCompare(String(a[1].date))).map(it => `
              <tr>
                <td><strong>${esc(it[0])}</strong></td>
                <td>${it[1].date}</td>
                <td class="num font-mono"><strong>${DS_App.money(it[1].amount)}</strong></td>
                <td><span class="badge ${it[1].status === 'Unpaid' ? 'badge-danger' : 'badge-success'}">${it[1].status}</span></td>
                <td>${it[1].status === 'Unpaid' ? pwDateDiff(it[1].date) + ' Days' : '-'}</td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="muted text-center">No bills found</td></tr>';
          }

          // 3. Outstanding Table
          const outBody = document.getElementById('pwPartyOutstanding')?.querySelector('tbody');
          if (outBody) {
            const om = new Map();
            outRows.forEach(x => {
              const inv = String(x['Invoice No.'] || x.invoiceNo || '').trim();
              const o = om.get(inv) || { date: x.Date || x.date || '', amount: 0, brands: new Set() };
              o.amount += (n(x.AmountNum) || n(x.amount));
              o.brands.add(x.Brand || x.brand || 'Unmapped');
              om.set(inv, o);
            });
            outBody.innerHTML = [...om.entries()].map(it => `
              <tr>
                <td><strong>${esc(it[0])}</strong></td>
                <td>${it[1].date}</td>
                <td class="num font-mono" style="color:#b91c1c;"><strong>${DS_App.money(it[1].amount)}</strong></td>
                <td>${pwDateDiff(it[1].date)} Days</td>
                <td>${esc([...it[1].brands].join(', '))}</td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="muted text-center">No unpaid invoices</td></tr>';
          }

          // 4. Returns Table
          const retBody = document.getElementById('pwPartyReturns')?.querySelector('tbody');
          if (retBody) {
            const rm = new Map();
            pr.filter(x => (n(x.QtyNum) || n(x.qty)) < 0 || (n(x.AmountNum) || n(x.amount)) < 0).forEach(x => {
              const b = String(x.Brand || x.brand || 'Unmapped').trim();
              const o = rm.get(b) || { qty: 0, val: 0 };
              o.qty += Math.abs(n(x.QtyNum) || n(x.qty));
              o.val += Math.abs(n(x.AmountNum) || n(x.amount));
              rm.set(b, o);
            });
            retBody.innerHTML = [...rm.entries()].map(it => `
              <tr>
                <td><strong>${esc(it[0])}</strong></td>
                <td class="num font-mono" style="color:#b91c1c;">${DS_App.qty(it[1].qty)}</td>
                <td class="num font-mono" style="color:#b91c1c;">${DS_App.money(it[1].val)}</td>
              </tr>
            `).join('') || '<tr><td colspan="3" class="muted text-center">No returns recorded</td></tr>';
          }

          box.style.display = 'block';
        },

        renderMonthlySales: function (rows) {
          const mm = new Map();
          rows.forEach(x => {
            const m = String(x.Date || x.date || '').slice(0, 7);
            if (/^\d{4}-\d{2}$/.test(m)) {
              mm.set(m, (mm.get(m) || 0) + (n(x.AmountNum) || n(x.amount)));
            }
          });

          const months = [...mm.keys()].sort();
          let run = 0;
          const monthly = months.map((m, i) => {
            const s = mm.get(m);
            run += s;
            return { m, sales: s, avg: run / (i + 1) };
          });

          const labels = monthly.map(o => {
            const [y, mn] = o.m.split('-');
            return new Date(+y, +mn - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
          });

          const tbody = document.getElementById('pwMonthlyTable')?.querySelector('tbody');
          if (tbody) {
            tbody.innerHTML = monthly.map((o, i) => `
              <tr>
                <td><strong>${labels[i]}</strong></td>
                <td class="num font-mono">${DS_App.money(o.sales)}</td>
                <td class="num font-mono" style="color:#0284c7;">${DS_App.money(o.avg)}</td>
              </tr>
            `).join('') || '<tr><td colspan="3" class="muted text-center">No monthly records</td></tr>';
          }

          const canvas = document.getElementById('pwMonthlyChart');
          if (canvas && typeof Chart !== 'undefined') {
            if (MONTHLY_CHART) MONTHLY_CHART.destroy();
            MONTHLY_CHART = new Chart(canvas, {
              type: 'line',
              data: {
                labels,
                datasets: [
                  {
                    label: 'Monthly Turnover (₹)',
                    data: monthly.map(o => o.sales),
                    borderColor: '#1e5eff',
                    backgroundColor: 'rgba(30, 94, 255, 0.08)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.25
                  },
                  {
                    label: 'Running Average (₹)',
                    data: monthly.map(o => o.avg),
                    borderColor: '#0284c7',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.25
                  }
                ]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true, position: 'top' } },
                scales: { y: { beginAtZero: true } }
              }
            });
          }
        },

        applyTopPartyPreset: function () {
          const v = document.getElementById('pwTopPartyPreset')?.value || 'all';
          const f = document.getElementById('pwTopPartyFrom');
          const t = document.getElementById('pwTopPartyTo');
          const now = new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          let a = null, b = today;

          if (v === 'today') a = today;
          else if (v === 'yesterday') { a = new Date(today); a.setDate(a.getDate() - 1); b = a; }
          else if (v === '7days') { a = new Date(today); a.setDate(a.getDate() - 6); }
          else if (v === '15days') { a = new Date(today); a.setDate(a.getDate() - 14); }
          else if (v === '30days') { a = new Date(today); a.setDate(a.getDate() - 29); }
          else if (v === '3months') { a = new Date(today.getFullYear(), today.getMonth() - 2, 1); }
          else if (v === '365days') { a = new Date(today); a.setDate(a.getDate() - 364); }
          else if (v === 'all') { a = null; b = null; }

          if (f && t) {
            f.value = a ? ymd(a) : '';
            t.value = b ? ymd(b) : '';
          }
          this.renderTopPartySales();
        },

        renderTopPartySales: function () {
          const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
          const f = document.getElementById('pwTopPartyFrom')?.value || '';
          const t = document.getElementById('pwTopPartyTo')?.value || '';
          const brand = document.getElementById('pwTopPartyBrand')?.value || '';

          const scoped = (db.sales || []).filter(x => {
            const d = String(x.Date || x.date || '').slice(0, 10);
            if (f && d < f) return false;
            if (t && d > t) return false;
            if (brand && String(x.Brand || x.brand || '') !== brand) return false;
            return true;
          });

          const pm = new Map();
          scoped.forEach(x => {
            const p = String(x['Party Name'] || x.party || 'Unmapped').trim();
            const o = pm.get(p) || {
              sale: 0,
              qty: 0,
              bills: new Set(),
              city1: x.City_1 || x.city1 || '',
              city: x.City || x.city || '',
              route: x.Route || x.route || ''
            };
            o.sale += (n(x.AmountNum) || n(x.amount));
            o.qty += (n(x.QtyNum) || n(x.qty));
            const inv = String(x['Invoice No.'] || x.invoiceNo || '').trim();
            if (inv) o.bills.add(inv);
            pm.set(p, o);
          });

          const sorted = [...pm.entries()].sort((a, b) => b[1].sale - a[1].sale).slice(0, 20);
          const tbody = document.getElementById('pwBrandPartyTable')?.querySelector('tbody');
          if (tbody) {
            tbody.innerHTML = sorted.map((it, i) => `
              <tr>
                <td class="num font-bold">${i + 1}</td>
                <td><strong>${esc(it[0])}</strong></td>
                <td class="num font-mono"><strong>${DS_App.money(it[1].sale)}</strong></td>
                <td class="num">${it[1].bills.size}</td>
                <td class="num">${DS_App.qty(it[1].qty)}</td>
                <td>${esc(it[1].city1)}</td>
                <td>${esc(it[1].city)}</td>
                <td>${esc(it[1].route)}</td>
              </tr>
            `).join('') || '<tr><td colspan="8" class="muted text-center">No records matching Top 20 criteria</td></tr>';
          }

          const note = document.getElementById('pwTopPartyNote');
          if (note) {
            note.textContent = `Showing Top 20 Outlets (${brand || 'All Brands'}) • ${scoped.length.toLocaleString('en-IN')} line items evaluated.`;
          }
        },

        renderNoSale: function () {
          const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
          const brand = document.getElementById('pwNoSaleBrandSelect')?.value || '';
          const firm = document.getElementById('pwNoSaleFirmSelect')?.value || '';
          const from = document.getElementById('pwNoSaleFrom')?.value || '';
          const to = document.getElementById('pwNoSaleTo')?.value || '';
          const since = document.getElementById('pwNoSaleSinceSelect')?.value || 'range';
          const sales = db.sales || [];
          const parties = db.party || [];

          // Map latest invoice per party
          const lastMap = new Map();
          sales.forEach(x => {
            const p = String(x['Party Name'] || x.party || '').trim();
            const d = String(x.Date || x.date || '').slice(0, 10);
            if (p && d && (!lastMap.has(p) || d > lastMap.get(p))) {
              lastMap.set(p, d);
            }
          });

          const out = [];
          const baseDate = to || ymd(new Date());

          parties.forEach(p => {
            const name = String(p.Name || p.name || '').trim();
            if (!name) return;
            const lastDate = lastMap.get(name);
            const daysSince = lastDate ? pwDateDiff(lastDate) : 99999;

            if (since !== 'range') {
              const threshold = Number(since);
              if (daysSince >= threshold) {
                out.push({
                  days: lastDate ? daysSince : 'No Bill',
                  name: name,
                  city1: p.City_1 || p.city1 || '',
                  city: p.City || p.city || '',
                  route: p.Route || p.route || ''
                });
              }
            } else if (from || to) {
              // Billed in date range check
              const hasBilled = sales.some(x => {
                const xp = String(x['Party Name'] || x.party || '').trim();
                const xd = String(x.Date || x.date || '').slice(0, 10);
                const xb = String(x.Brand || x.brand || '').trim();
                if (xp !== name) return false;
                if (from && xd < from) return false;
                if (to && xd > to) return false;
                if (brand && xb !== brand) return false;
                return true;
              });

              if (!hasBilled) {
                out.push({
                  days: lastDate ? daysSince : 'No Bill',
                  name: name,
                  city1: p.City_1 || p.city1 || '',
                  city: p.City || p.city || '',
                  route: p.Route || p.route || ''
                });
              }
            }
          });

          out.sort((a, b) => {
            if (a.days === 'No Bill') return -1;
            if (b.days === 'No Bill') return 1;
            return Number(b.days) - Number(a.days);
          });

          const tbody = document.getElementById('pwNoSaleTable')?.querySelector('tbody');
          if (tbody) {
            tbody.innerHTML = out.map(o => `
              <tr>
                <td class="num font-bold" style="${o.days === 'No Bill' || o.days > 30 ? 'color:#b91c1c;' : ''}">
                  ${o.days === 'No Bill' ? 'Never Billed' : o.days + ' Days'}
                </td>
                <td><strong>${esc(o.name)}</strong></td>
                <td>${esc(o.city1)}</td>
                <td>${esc(o.city)}</td>
                <td>${esc(o.route)}</td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="muted text-center" style="padding:16px;">All mapped outlets have active billing in this period!</td></tr>';
          }

          const note = document.getElementById('pwNoSaleSelectionNote');
          if (note) {
            note.textContent = `Found ${out.length} dormant/lapsed outlets with no billing activity.`;
          }
        },

        renderReturns: function (rows) {
          const rm = new Map();
          rows.forEach(x => {
            const q = n(x.QtyNum) || n(x.qty);
            const v = n(x.AmountNum) || n(x.amount);
            if (q < 0 || v < 0) {
              const p = String(x['Party Name'] || x.party || 'Unmapped').trim();
              const o = rm.get(p) || {
                qty: 0,
                val: 0,
                bills: new Set(),
                city1: x.City_1 || x.city1 || '',
                city: x.City || x.city || '',
                route: x.Route || x.route || ''
              };
              o.qty += Math.abs(q);
              o.val += Math.abs(v);
              const inv = String(x['Invoice No.'] || x.invoiceNo || '').trim();
              if (inv) o.bills.add(inv);
              rm.set(p, o);
            }
          });

          const sorted = [...rm.entries()].sort((a, b) => b[1].qty - a[1].qty);
          const tbody = document.getElementById('pwReturnTable')?.querySelector('tbody');
          if (tbody) {
            tbody.innerHTML = sorted.map((it, i) => `
              <tr>
                <td class="num">${i + 1}</td>
                <td><strong>${esc(it[0])}</strong></td>
                <td class="num font-mono" style="color:#b91c1c;">${DS_App.qty(it[1].qty)}</td>
                <td class="num font-mono" style="color:#b91c1c;">${DS_App.money(it[1].val)}</td>
                <td class="num">${it[1].bills.size}</td>
                <td>${esc(it[1].city1)}</td>
                <td>${esc(it[1].city)}</td>
                <td>${esc(it[1].route)}</td>
              </tr>
            `).join('') || '<tr><td colspan="8" class="muted text-center">No party returns recorded</td></tr>';
          }
        },

        exportTopPartyExcel: function () {
          if (typeof XLSX === 'undefined') {
            DS_App.toast('SheetJS library not loaded', 'error');
            return;
          }
          const table = document.getElementById('pwBrandPartyTable');
          if (!table) return;
          const wb = XLSX.utils.table_to_book(table, { sheet: 'Top 20 Parties' });
          XLSX.writeFile(wb, `DS_Enterprises_Top20_Parties_${ymd(new Date())}.xlsx`);
          DS_App.toast('Exported Top 20 Parties Excel', 'success');
        },

        exportNoSaleExcel: function () {
          if (typeof XLSX === 'undefined') {
            DS_App.toast('SheetJS library not loaded', 'error');
            return;
          }
          const table = document.getElementById('pwNoSaleTable');
          if (!table) return;
          const wb = XLSX.utils.table_to_book(table, { sheet: 'No Sale Retailers' });
          XLSX.writeFile(wb, `DS_Enterprises_No_Sale_Retailers_${ymd(new Date())}.xlsx`);
          DS_App.toast('Exported No Sale Retailers Excel', 'success');
        }
      };

      window.DS_PartyWise = DS_PartyWise;

      document.addEventListener('DOMContentLoaded', () => {
        DS_PartyWise.init();
      });
    })(window);
  