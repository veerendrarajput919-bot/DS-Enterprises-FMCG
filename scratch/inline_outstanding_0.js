
    function switchOutstandingTab(tab) {
      const btnP = document.getElementById('btnTabParty');
      const btnB = document.getElementById('btnTabBrand');
      const paneP = document.getElementById('tabPaneParty');
      const paneB = document.getElementById('tabPaneBrand');

      if (tab === 'brand') {
        btnP?.classList.remove('active');
        btnB?.classList.add('active');
        paneP?.classList.remove('active');
        paneB?.classList.add('active');
        if (window.DS_OutBrand) {
          DS_OutBrand.update();
        }
      } else {
        btnB?.classList.remove('active');
        btnP?.classList.add('active');
        paneB?.classList.remove('active');
        paneP?.classList.add('active');
        if (window.DS_OutParty) {
          DS_OutParty.update();
        }
      }
      history.replaceState(null, '', '?tab=' + tab);
    }

    (function () {
      const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
      const n = v => Number(v) || 0;

      function ageDays(dStr) {
        if (!dStr) return 0;
        let d = new Date(dStr + (dStr.includes('T') ? '' : 'T00:00:00'));
        if (isNaN(d.getTime())) return 0;
        let now = new Date();
        let today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return Math.max(0, Math.floor((today - d) / 86400000));
      }

      function formatDisplayDate(dStr) {
        if (!dStr) return '-';
        let d = new Date(dStr + (dStr.includes('T') ? '' : 'T00:00:00'));
        if (isNaN(d.getTime())) return dStr;
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
      }

      function ageMatches(days, age) {
        if (age === 'all') return true;
        if (age === 'today') return days === 0;
        if (age === 'yesterday') return days === 1;
        if (age === '7plus') return days >= 7;
        if (age === '15plus') return days >= 15;
        if (age === '30plus') return days >= 30;
        if (age === '45plus') return days >= 45;
        if (age === '60plus') return days >= 60;
        if (age === '90plus') return days >= 90;
        if (age === '180plus') return days >= 180;
        return true;
      }

      function unpaidSet() {
        const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
        return new Set((db.unpaid || []).map(x => String(x.invoice || x.billNo || x.invoiceNo || '').trim()).filter(Boolean));
      }

      function outDateRange(preset, fromVal, toVal) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        let start = null, end = today;

        if (preset === 'today') {
          start = today;
        } else if (preset === 'yesterday') {
          start = new Date(today);
          start.setDate(start.getDate() - 1);
          end = start;
        } else if (preset === '7days') {
          start = new Date(today);
          start.setDate(start.getDate() - 6);
        } else if (preset === 'month') {
          start = new Date(today.getFullYear(), today.getMonth(), 1);
        } else if (preset === 'lastmonth') {
          start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          end = new Date(today.getFullYear(), today.getMonth(), 0);
        } else if (preset === '3months') {
          start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        } else if (preset === '6months') {
          start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        } else if (preset === '365days') {
          start = new Date(today);
          start.setDate(start.getDate() - 364);
        } else if (preset === 'all') {
          start = null;
          end = null;
        } else if (preset === 'custom') {
          start = fromVal ? new Date(fromVal + 'T00:00:00') : null;
          end = toVal ? new Date(toVal + 'T23:59:59') : today;
        }
        return { start, end };
      }

      function outYmd(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }

      let AGE_CHART = null, CITY_CHART = null;

      // ── DS_OutParty Logic ───────────────────────────────────────────────────
      const DS_OutParty = {
        init: function() {
          this.populateFilters();
          this.bindEvents();
          this.update();
        },

        bindEvents: function() {
          document.getElementById('oPreset')?.addEventListener('change', () => this.applyPreset());
          ['oFrom', 'oTo'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
              const p = document.getElementById('oPreset');
              if (p) p.value = 'custom';
              this.update();
            });
          });

          ['oCity', 'oCity1', 'oRoute', 'oCat', 'oSubCat', 'oBrand', 'oBillNo', 'oStatus', 'oAge', 'oSearch'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
              el.addEventListener('change', () => this.update());
              if (el.tagName === 'INPUT') el.addEventListener('input', () => this.update());
            }
          });
        },

        applyPreset: function() {
          const p = document.getElementById('oPreset')?.value || 'all';
          const fromEl = document.getElementById('oFrom');
          const toEl = document.getElementById('oTo');
          const { start, end } = outDateRange(p, fromEl?.value, toEl?.value);
          if (p !== 'custom' && fromEl && toEl) {
            fromEl.value = start ? outYmd(start) : '';
            toEl.value = end ? outYmd(end) : '';
          }
          this.update();
        },

        resetFilters: function() {
          const p = document.getElementById('oPreset'); if (p) p.value = 'all';
          const f = document.getElementById('oFrom'); if (f) f.value = '';
          const t = document.getElementById('oTo'); if (t) t.value = '';
          const st = document.getElementById('oStatus'); if (st) st.value = 'Unpaid';
          ['oCity', 'oCity1', 'oRoute', 'oCat', 'oSubCat', 'oBrand', 'oBillNo', 'oSearch'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
          });
          const age = document.getElementById('oAge'); if (age) age.value = 'all';
          this.update();
        },

        getOutstandingRows: function() {
          const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
          const status = document.getElementById('oStatus')?.value || 'Unpaid';
          const u = unpaidSet();
          const allSales = db.sales || [];
          if (status === 'Unpaid') {
            return allSales.filter(x => u.has(String(x['Invoice No.'] || x.invoiceNo || x.bill_no || x.billNo || '').trim()) || String(x.status || x.payment_status || '').toLowerCase() === 'unpaid');
          }
          if (status === 'Paid') {
            return allSales.filter(x => !u.has(String(x['Invoice No.'] || x.invoiceNo || x.bill_no || x.billNo || '').trim()) && String(x.status || x.payment_status || '').toLowerCase() !== 'unpaid');
          }
          return allSales;
        },

        populateFilters: function() {
          const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
          const rows = db.sales || [];
          const party = db.party || [];
          const stock = db.stock || [];
          const unpaid = db.unpaid || [];

          const fill = (id, vals) => {
            const el = document.getElementById(id);
            if (!el) return;
            const cur = el.value;
            const uniq = [...new Set((vals || []).filter(Boolean).map(v => String(v).trim()))].sort();
            el.innerHTML = '<option value="">All</option>' + uniq.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
            if (uniq.includes(cur)) el.value = cur;
          };

          const allCities = [...rows.map(x => x.City || x.city), ...party.map(x => x.City || x.city)];
          const allCity1 = [...rows.map(x => x.City_1 || x.city1 || x.City || x.city), ...party.map(x => x.City_1 || x.city1 || x.City || x.city)];
          const allRoutes = [...rows.map(x => x.Route || x.route), ...party.map(x => x.Route || x.route), ...unpaid.map(x => x.route)];
          const allCats = [...rows.map(x => x['Party Category'] || x.category || x.partyCategory), ...party.map(x => x['Party Category'] || x.category || x.partyCategory), ...stock.map(x => x.category)];
          const allSubCats = [...rows.map(x => x.subCategory || x['Sub Category'] || x.partySubCategory || x.itemSubCategory), ...party.map(x => x.subCategory || x['Sub Category'])];
          const allBrands = [...rows.map(x => x.Brand || x.brand), ...stock.map(x => x.brand), ...unpaid.map(x => x.brand)];

          fill('oCity', allCities);
          fill('oCity1', allCity1);
          fill('oRoute', allRoutes);
          fill('oCat', allCats);
          fill('oSubCat', allSubCats);
          fill('oBrand', allBrands);
        },

        getFilteredRows: function() {
          const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
          const partyMap = new Map((db.party || []).map(p => [(p.name || p.Name || '').trim().toLowerCase(), p]));
          const rows = this.getOutstandingRows();
          const p = document.getElementById('oPreset')?.value || 'all';
          const fromVal = document.getElementById('oFrom')?.value || '';
          const toVal = document.getElementById('oTo')?.value || '';
          const { start, end } = outDateRange(p, fromVal, toVal);

          const city1 = document.getElementById('oCity1')?.value || '';
          const city = document.getElementById('oCity')?.value || '';
          const route = document.getElementById('oRoute')?.value || '';
          const cat = document.getElementById('oCat')?.value || '';
          const subCat = document.getElementById('oSubCat')?.value || '';
          const brand = document.getElementById('oBrand')?.value || '';
          const billNo = String(document.getElementById('oBillNo')?.value || '').trim().toLowerCase();
          const age = document.getElementById('oAge')?.value || 'all';
          const search = String(document.getElementById('oSearch')?.value || '').trim().toLowerCase();

          return rows.filter(x => {
            const d = new Date((x.Date || x.date || '') + 'T00:00:00');
            if (start && (!isNaN(d.getTime()) && d < start)) return false;
            if (end && (!isNaN(d.getTime()) && d > end)) return false;

            const party = String(x['Party Name'] || x.party || x.party_name || '').trim();
            const pMeta = partyMap.get(party.toLowerCase()) || {};

            const xCity = x.City || x.city || pMeta.city || pMeta.City || '';
            const xCity1 = x.City_1 || x.city1 || pMeta.city1 || pMeta.City_1 || xCity;
            const xRoute = x.Route || x.route || pMeta.route || pMeta.Route || '';
            const xCat = x['Party Category'] || x.category || x.partyCategory || pMeta.category || pMeta['Party Category'] || '';
            const xSubCat = x.subCategory || x['Sub Category'] || x.partySubCategory || x.itemSubCategory || pMeta.subCategory || '';
            const xBrand = x.Brand || x.brand || '';
            const inv = String(x['Invoice No.'] || x.invoiceNo || x.invoice_no || '');
            const bill = String(x.bill_no || x.billNo || x['Bill No.'] || '');
            const item = String(x['Item Name'] || x.item || x.item_name || '');

            if (city1 && String(xCity1) !== city1) return false;
            if (city && String(xCity) !== city) return false;
            if (route && String(xRoute) !== route) return false;
            if (cat && String(xCat) !== cat) return false;
            if (subCat && String(xSubCat) !== subCat) return false;
            if (brand && String(xBrand) !== brand) return false;

            if (billNo && !inv.toLowerCase().includes(billNo) && !bill.toLowerCase().includes(billNo)) return false;
            if (!ageMatches(ageDays(x.Date || x.date), age)) return false;

            if (search && ![party, inv, bill, item, xBrand, xRoute, xCity1, xCity].join(' ').toLowerCase().includes(search)) {
              return false;
            }

            return true;
          });
        },

        update: function() {
          const filtered = this.getFilteredRows();
          const pm = new Map();
          let total = 0, unpaidInvoices = 0, oldestAge = 0;

          filtered.forEach(x => {
            const party = String(x['Party Name'] || x.party || 'Unmapped').trim();
            const inv = String(x['Invoice No.'] || x.invoiceNo || '').trim();
            const days = ageDays(x.Date || x.date);
            const amt = n(x.AmountNum) || n(x.amount);

            total += amt;
            if (days > oldestAge) oldestAge = days;

            let rec = pm.get(party);
            if (!rec) {
              rec = { party, route: x.Route || x.route || 'General Route', city: x.City || x.city || 'Kanpur', invoices: new Set(), totalAmt: 0, maxAge: 0 };
              pm.set(party, rec);
            }
            if (inv) {
              rec.invoices.add(inv);
              unpaidInvoices++;
            }
            rec.totalAmt += amt;
            if (days > rec.maxAge) rec.maxAge = days;
          });

          const kpi = document.getElementById('outKpi');
          if (kpi) {
            kpi.innerHTML = [
              ['Total Overdue Outstanding', DS_App.money(total), 'danger'],
              ['Unpaid Invoices', unpaidInvoices.toLocaleString('en-IN'), 'blue'],
              ['Overdue Parties / Stores', pm.size.toLocaleString('en-IN'), 'amber'],
              ['Oldest Aging', oldestAge + ' Days', 'danger']
            ].map(it => `
              <div class="kpi-card ${it[2]}" style="padding:12px 14px;">
                <div class="kpi-label">${it[0]}</div>
                <div class="kpi-value" style="font-size:20px; font-weight:800;">${it[1]}</div>
              </div>
            `).join('');
          }

          this.renderCharts(filtered);
          this.renderTable(pm);
        },

        renderCharts: function(rows) {
          const ageBuckets = ['0–7 Days', '8–15 Days', '16–30 Days', '31–45 Days', '46–90 Days', '91–180 Days', '180+ Days'];
          const ageMap = new Map(ageBuckets.map(b => [b, 0]));

          rows.forEach(x => {
            const days = ageDays(x.Date || x.date);
            const amt = n(x.AmountNum) || n(x.amount);
            const k = days <= 7 ? '0–7 Days' : days <= 15 ? '8–15 Days' : days <= 30 ? '16–30 Days' : days <= 45 ? '31–45 Days' : days <= 90 ? '46–90 Days' : days <= 180 ? '91–180 Days' : '180+ Days';
            ageMap.set(k, (ageMap.get(k) || 0) + amt);
          });

          const canvasAge = document.getElementById('outAgeChart');
          if (canvasAge && typeof Chart !== 'undefined') {
            if (AGE_CHART) AGE_CHART.destroy();
            AGE_CHART = new Chart(canvasAge, {
              type: 'bar',
              data: {
                labels: [...ageMap.keys()],
                datasets: [{ label: 'Outstanding (₹)', data: [...ageMap.values()], backgroundColor: '#ef4444', borderRadius: 6 }]
              },
              options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
          }

          const c1m = new Map();
          rows.forEach(x => {
            const c1 = String(x.City_1 || x.city1 || 'Kanpur').trim();
            c1m.set(c1, (c1m.get(c1) || 0) + (n(x.AmountNum) || n(x.amount)));
          });
          const topC1 = [...c1m.entries()].sort((a,b)=>b[1]-a[1]);

          const canvasCity = document.getElementById('outPartyChart');
          if (canvasCity && typeof Chart !== 'undefined') {
            if (CITY_CHART) CITY_CHART.destroy();
            CITY_CHART = new Chart(canvasCity, {
              type: 'doughnut',
              data: {
                labels: topC1.map(x=>x[0]),
                datasets: [{ data: topC1.map(x=>x[1]), backgroundColor: ['#0284c7', '#0d9488', '#f59e0b', '#ef4444', '#8b5cf6'] }]
              },
              options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
            });
          }
        },

        renderTable: function(pm) {
          const tbody = document.getElementById('oDetailTable')?.querySelector('tbody');
          if (!tbody) return;

          const sorted = [...pm.values()].sort((a,b) => b.totalAmt - a.totalAmt);
          if (sorted.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:20px; color:var(--ds-text-muted);">No overdue parties found for active filters.</td></tr>';
            return;
          }

          tbody.innerHTML = sorted.map(p => `
            <tr>
              <td><strong>${esc(p.party)}</strong></td>
              <td>${esc(p.route)}</td>
              <td class="num font-mono">${p.invoices.size}</td>
              <td class="num font-mono ${p.maxAge >= 30 ? 'text-danger font-bold' : ''}">${p.maxAge} Days</td>
              <td class="num font-mono" style="color:#b91c1c;"><strong>${DS_App.money(p.totalAmt)}</strong></td>
              <td style="text-align:center;">
                <div style="display:flex; gap:6px; justify-content:center;">
                  <button type="button" class="btn btn-sm btn-primary" onclick="DS_WhatsApp.sendPartyPaymentReminder('${esc(p.party)}')" title="Send WhatsApp Payment Reminder">WhatsApp Reminder</button>
                  <a href="payment-collections.html?party=${encodeURIComponent(p.party)}" class="btn btn-sm btn-success" title="Record Payment Receipt">Collect</a>
                </div>
              </td>
            </tr>
          `).join('');
        },

        exportCSV: function() {
          const rows = this.getFilteredRows();
          if (!rows.length) { DS_App.toast('No rows to export', 'warning'); return; }
          const header = ['Party Name', 'Beat / Route', 'Invoice / Bill No', 'Bill Date', 'Overdue Days', 'Amount Due'];
          const lines = [header.join(',')];
          rows.forEach(r => {
            lines.push([
              `"${(r['Party Name'] || r.party || '').replace(/"/g, '""')}"`,
              `"${(r.Route || r.route || '').replace(/"/g, '""')}"`,
              `"${r['Invoice No.'] || r.invoiceNo || r.bill_no || r.billNo || ''}"`,
              `"${r.Date || r.date || ''}"`,
              ageDays(r.Date || r.date),
              (n(r.AmountNum) || n(r.amount)).toFixed(2)
            ].join(','));
          });
          const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'DS_Enterprises_Party_Outstanding.csv';
          a.click();
          DS_App.toast('CSV downloaded successfully', 'success');
        },

        exportExcel: function() {
          if (typeof XLSX === 'undefined') { DS_App.toast('XLSX library not loaded', 'error'); return; }
          const rows = this.getFilteredRows();
          const data = rows.map(r => ({
            'Party Name': r['Party Name'] || r.party || '',
            'Beat / Route': r.Route || r.route || '',
            'Invoice / Bill No': r['Invoice No.'] || r.invoiceNo || r.bill_no || r.billNo || '',
            'Bill Date': r.Date || r.date || '',
            'Overdue Days': ageDays(r.Date || r.date),
            'Amount Due (₹)': n(r.AmountNum) || n(r.amount)
          }));
          const ws = XLSX.utils.json_to_sheet(data);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Party Outstanding');
          XLSX.writeFile(wb, 'DS_Enterprises_Party_Outstanding.xlsx');
          DS_App.toast('Excel downloaded successfully', 'success');
        },

        exportPDF: function() {
          if (typeof window.jspdf === 'undefined') { DS_App.toast('jsPDF library not available', 'error'); return; }
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF('l', 'pt', 'a4');
          doc.setFontSize(16); doc.text('DS Enterprises — Outstanding Party-Wise Report', 30, 30);
          const table = document.getElementById('oDetailTable');
          if (table && doc.autoTable) {
            doc.autoTable({ html: table, startY: 50, styles: { fontSize: 8 } });
            doc.save('DS_Enterprises_Party_Outstanding.pdf');
            DS_App.toast('Downloaded Party Outstanding PDF', 'success');
          }
        }
      };

      // ── DS_OutBrand Logic ───────────────────────────────────────────────────
      const DS_OutBrand = {
        init: function() {
          this.populateFilters();
          this.bindEvents();
          this.update();
        },

        bindEvents: function() {
          document.getElementById('obPreset')?.addEventListener('change', () => this.applyPreset());
          ['obFrom', 'obTo'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
              const p = document.getElementById('obPreset');
              if (p) p.value = 'custom';
              this.update();
            });
          });

          ['obCity', 'obCity1', 'obRoute', 'obCat', 'obSubCat', 'obBrand', 'obBillNo', 'obStatus', 'obAge', 'obSearch'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
              el.addEventListener('change', () => this.update());
              if (el.tagName === 'INPUT') el.addEventListener('input', () => this.update());
            }
          });
        },

        applyPreset: function() {
          const p = document.getElementById('obPreset')?.value || 'all';
          const fromEl = document.getElementById('obFrom');
          const toEl = document.getElementById('obTo');
          const { start, end } = outDateRange(p, fromEl?.value, toEl?.value);
          if (p !== 'custom' && fromEl && toEl) {
            fromEl.value = start ? outYmd(start) : '';
            toEl.value = end ? outYmd(end) : '';
          }
          this.update();
        },

        resetFilters: function() {
          const p = document.getElementById('obPreset'); if (p) p.value = 'all';
          const f = document.getElementById('obFrom'); if (f) f.value = '';
          const t = document.getElementById('obTo'); if (t) t.value = '';
          const st = document.getElementById('obStatus'); if (st) st.value = 'Unpaid';
          ['obCity', 'obCity1', 'obRoute', 'obCat', 'obSubCat', 'obBrand', 'obBillNo', 'obSearch'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
          });
          const age = document.getElementById('obAge'); if (age) age.value = 'all';
          this.update();
        },

        getOutstandingRows: function() {
          const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
          const status = document.getElementById('obStatus')?.value || 'Unpaid';
          const u = unpaidSet();
          const allSales = db.sales || [];
          if (status === 'Unpaid') {
            return allSales.filter(x => u.has(String(x['Invoice No.'] || x.invoiceNo || x.bill_no || x.billNo || '').trim()) || String(x.status || x.payment_status || '').toLowerCase() === 'unpaid');
          }
          if (status === 'Paid') {
            return allSales.filter(x => !u.has(String(x['Invoice No.'] || x.invoiceNo || x.bill_no || x.billNo || '').trim()) && String(x.status || x.payment_status || '').toLowerCase() !== 'unpaid');
          }
          return allSales;
        },

        populateFilters: function() {
          const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
          const rows = db.sales || [];
          const party = db.party || [];
          const stock = db.stock || [];
          const unpaid = db.unpaid || [];

          const fill = (id, vals) => {
            const el = document.getElementById(id);
            if (!el) return;
            const cur = el.value;
            const uniq = [...new Set((vals || []).filter(Boolean).map(v => String(v).trim()))].sort();
            el.innerHTML = '<option value="">All</option>' + uniq.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
            if (uniq.includes(cur)) el.value = cur;
          };

          const allCities = [...rows.map(x => x.City || x.city), ...party.map(x => x.City || x.city)];
          const allCity1 = [...rows.map(x => x.City_1 || x.city1 || x.City || x.city), ...party.map(x => x.City_1 || x.city1 || x.City || x.city)];
          const allRoutes = [...rows.map(x => x.Route || x.route), ...party.map(x => x.Route || x.route), ...unpaid.map(x => x.route)];
          const allCats = [...rows.map(x => x['Party Category'] || x.category || x.partyCategory), ...party.map(x => x['Party Category'] || x.category || x.partyCategory), ...stock.map(x => x.category)];
          const allSubCats = [...rows.map(x => x.subCategory || x['Sub Category'] || x.partySubCategory || x.itemSubCategory), ...party.map(x => x.subCategory || x['Sub Category'])];
          const allBrands = [...rows.map(x => x.Brand || x.brand), ...stock.map(x => x.brand), ...unpaid.map(x => x.brand)];

          fill('obCity', allCities);
          fill('obCity1', allCity1);
          fill('obRoute', allRoutes);
          fill('obCat', allCats);
          fill('obSubCat', allSubCats);
          fill('obBrand', allBrands);
        },

        getFilteredRows: function() {
          const db = window.DS_Storage ? window.DS_Storage.getDB() : {};
          const partyMap = new Map((db.party || []).map(p => [(p.name || p.Name || '').trim().toLowerCase(), p]));
          const rows = this.getOutstandingRows();
          const p = document.getElementById('obPreset')?.value || 'all';
          const fromVal = document.getElementById('obFrom')?.value || '';
          const toVal = document.getElementById('obTo')?.value || '';
          const { start, end } = outDateRange(p, fromVal, toVal);

          const city1 = document.getElementById('obCity1')?.value || '';
          const city = document.getElementById('obCity')?.value || '';
          const route = document.getElementById('obRoute')?.value || '';
          const cat = document.getElementById('obCat')?.value || '';
          const subCat = document.getElementById('obSubCat')?.value || '';
          const brand = document.getElementById('obBrand')?.value || '';
          const billNo = String(document.getElementById('obBillNo')?.value || '').trim().toLowerCase();
          const age = document.getElementById('obAge')?.value || 'all';
          const search = String(document.getElementById('obSearch')?.value || '').trim().toLowerCase();

          return rows.filter(x => {
            const d = new Date((x.Date || x.date || '') + 'T00:00:00');
            if (start && (!isNaN(d.getTime()) && d < start)) return false;
            if (end && (!isNaN(d.getTime()) && d > end)) return false;

            const party = String(x['Party Name'] || x.party || x.party_name || '').trim();
            const pMeta = partyMap.get(party.toLowerCase()) || {};

            const xCity = x.City || x.city || pMeta.city || pMeta.City || '';
            const xCity1 = x.City_1 || x.city1 || pMeta.city1 || pMeta.City_1 || xCity;
            const xRoute = x.Route || x.route || pMeta.route || pMeta.Route || '';
            const xCat = x['Party Category'] || x.category || x.partyCategory || pMeta.category || pMeta['Party Category'] || '';
            const xSubCat = x.subCategory || x['Sub Category'] || x.partySubCategory || x.itemSubCategory || pMeta.subCategory || '';
            const xBrand = x.Brand || x.brand || '';
            const inv = String(x['Invoice No.'] || x.invoiceNo || x.invoice_no || '');
            const bill = String(x.bill_no || x.billNo || x['Bill No.'] || '');
            const item = String(x['Item Name'] || x.item || x.item_name || '');

            if (city1 && String(xCity1) !== city1) return false;
            if (city && String(xCity) !== city) return false;
            if (route && String(xRoute) !== route) return false;
            if (cat && String(xCat) !== cat) return false;
            if (subCat && String(xSubCat) !== subCat) return false;
            if (brand && String(xBrand) !== brand) return false;

            if (billNo && !inv.toLowerCase().includes(billNo) && !bill.toLowerCase().includes(billNo)) return false;
            if (!ageMatches(ageDays(x.Date || x.date), age)) return false;

            if (search && ![party, inv, bill, item, xBrand, xRoute, xCity1, xCity].join(' ').toLowerCase().includes(search)) {
              return false;
            }

            return true;
          });
        },

        update: function() {
          const rows = this.getFilteredRows();
          const totalVal = rows.reduce((s, x) => s + (n(x.AmountNum) || n(x.amount)), 0);
          const totalInvoices = new Set(rows.map(x => x['Invoice No.'] || x.invoiceNo || x.bill_no || x.billNo)).size;
          const totalParties = new Set(rows.map(x => x['Party Name'] || x.party)).size;
          const totalBrands = new Set(rows.map(x => x.Brand || x.brand || 'Unmapped')).size;
          const totalQty = rows.reduce((s, x) => s + (n(x.QtyNum) || n(x.qty)), 0);

          const kpi = document.getElementById('outBrandKpi');
          if (kpi) {
            kpi.innerHTML = [
              ['Filtered Outstanding', DS_App.money(totalVal), 'danger'],
              ['Unpaid Bills', totalInvoices.toLocaleString('en-IN'), 'blue'],
              ['Parties Due', totalParties.toLocaleString('en-IN'), 'amber'],
              ['Brands Impacted', totalBrands.toLocaleString('en-IN'), 'blue'],
              ['Unpaid Units (Qty)', DS_App.qty(totalQty), 'blue']
            ].map(it => `
              <div class="kpi-card ${it[2]}" style="padding:12px 14px;">
                <div class="kpi-label">${it[0]}</div>
                <div class="kpi-value" style="font-size:20px; font-weight:800;">${it[1]}</div>
              </div>
            `).join('');
          }

          const bm = new Map();
          rows.forEach(x => {
            const b = String(x.Brand || x.brand || 'Unmapped').trim() || 'Unmapped';
            const o = bm.get(b) || { bills: new Set(), parties: new Set(), qty: 0, val: 0 };
            const inv = String(x['Invoice No.'] || x.invoiceNo || x.bill_no || x.billNo || '').trim();
            const party = String(x['Party Name'] || x.party || '').trim();
            if (inv) o.bills.add(inv);
            if (party) o.parties.add(party);
            o.qty += (n(x.QtyNum) || n(x.qty));
            o.val += (n(x.AmountNum) || n(x.amount));
            bm.set(b, o);
          });

          const brandBody = document.getElementById('obBrandTable')?.querySelector('tbody');
          if (brandBody) {
            brandBody.innerHTML = [...bm.entries()].sort((a,b)=>b[1].val - a[1].val).map(([b, o]) => `
              <tr>
                <td><strong>${esc(b)}</strong></td>
                <td class="num">${o.bills.size}</td>
                <td class="num">${o.parties.size}</td>
                <td class="num">${DS_App.qty(o.qty)}</td>
                <td class="num font-mono" style="color:#b91c1c;"><strong>${DS_App.money(o.val)}</strong></td>
              </tr>
            `).join('') || '<tr><td colspan="5" class="text-center" style="padding:14px; color:var(--ds-text-muted);">No brand outstanding found</td></tr>';
          }

          const mm = new Map();
          rows.forEach(x => {
            const inv = String(x['Invoice No.'] || x.invoiceNo || x.bill_no || x.billNo || '').trim();
            const party = String(x['Party Name'] || x.party || 'Unmapped').trim();
            const date = String(x.Date || x.date || '').slice(0, 10);
            const route = String(x.Route || x.route || 'General Beat').trim();
            const key = inv ? `${inv}|${party}|${date}|${route}` : `${party}|${date}|${route}`;
            const o = mm.get(key) || { inv, party, date, route, v: 0 };
            o.v += (n(x.AmountNum) || n(x.amount));
            mm.set(key, o);
          });

          const partyBody = document.getElementById('obPartyTable')?.querySelector('tbody');
          if (partyBody) {
            partyBody.innerHTML = [...mm.values()].sort((a,b)=>b.v - a.v).map(item => {
              const days = ageDays(item.date);
              const ageBadge = days >= 60 
                ? `<span class="badge" style="background:#fee2e2; color:#b91c1c; font-weight:700;">${days} Days</span>`
                : days >= 30 
                ? `<span class="badge" style="background:#fef3c7; color:#b45309; font-weight:700;">${days} Days</span>`
                : `<span class="badge" style="background:#dcfce7; color:#15803d; font-weight:700;">${days} Days</span>`;

              return `
                <tr>
                  <td><strong>${esc(item.party)}</strong></td>
                  <td><span class="badge" style="font-family:monospace; background:#eff6ff; color:#1d4ed8; font-weight:700;">${esc(item.inv || 'PENDING')}</span></td>
                  <td style="text-align:center; font-size:12px; color:var(--ds-text-secondary);">${esc(formatDisplayDate(item.date))}</td>
                  <td>${esc(item.route)}</td>
                  <td class="num">${ageBadge}</td>
                  <td class="num font-mono" style="color:#b91c1c; font-size:13px;"><strong>${DS_App.money(item.v)}</strong></td>
                  <td style="text-align:center;">
                    <div style="display:flex; gap:6px; justify-content:center;">
                      <button type="button" class="btn btn-sm btn-primary" onclick="DS_WhatsApp.sendPartyPaymentReminder('${esc(item.party)}')" title="Send WhatsApp Payment Reminder">WhatsApp Reminder</button>
                      <a href="payment-collections.html?party=${encodeURIComponent(item.party)}&amount=${item.v}" class="btn btn-sm btn-success" title="Record Payment Receipt">Collect</a>
                    </div>
                  </td>
                </tr>
              `;
            }).join('') || '<tr><td colspan="7" class="text-center" style="padding:20px; color:var(--ds-text-muted);">No records found</td></tr>';
          }
        },

        exportPDF: function() {
          if (typeof window.jspdf === 'undefined') { DS_App.toast('jsPDF library not available', 'error'); return; }
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF('l', 'pt', 'a4');
          doc.setFontSize(16); doc.text('DS Enterprises — Outstanding Brand-Wise Report', 30, 30);
          const table = document.getElementById('obBrandTable');
          if (table && doc.autoTable) {
            doc.autoTable({ html: table, startY: 50, styles: { fontSize: 8 } });
            doc.save('DS_Enterprises_Brand_Outstanding.pdf');
            DS_App.toast('Downloaded Brand Outstanding PDF', 'success');
          }
        }
      };

      window.DS_OutParty = DS_OutParty;
      window.DS_OutBrand = DS_OutBrand;

      document.addEventListener('DOMContentLoaded', () => {
        DS_OutParty.init();
        DS_OutBrand.init();

        // Check if URL has tab parameter
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab === 'brand') {
          switchOutstandingTab('brand');
        } else {
          switchOutstandingTab('party');
        }
      });
    })(window);
  