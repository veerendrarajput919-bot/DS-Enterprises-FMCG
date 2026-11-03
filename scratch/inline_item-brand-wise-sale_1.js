
    let matrixData = [];

    function matDateRange(preset, fromVal, toVal) {
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

    function matYmd(d) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function applyMatrixPreset() {
      const p = document.getElementById('matPreset')?.value || 'month';
      const f = document.getElementById('matFrom');
      const t = document.getElementById('matTo');
      const { start, end } = matDateRange(p, f?.value, t?.value);
      if (p !== 'custom' && f && t) {
        f.value = start ? matYmd(start) : '';
        t.value = end ? matYmd(end) : '';
      }
      renderItemBrandMatrix();
    }

    function resetItemBrandFilters() {
      const p = document.getElementById('matPreset');
      if (p) p.value = 'month';
      ['matCity', 'matCity1', 'matRoute', 'matCat', 'matSubCat', 'matrixBrandSelect', 'matBillNo', 'matStatus', 'matrixSearchInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      applyMatrixPreset();
    }

    function populateMatrixOptions() {
      const db = window.DS_Storage ? window.DS_Storage.getDB() : { sales: [], stock: [], party: [] };
      const s = db.sales || [];
      const p = db.party || [];
      const stock = db.stock || [];

      const fill = (id, vals) => {
        const el = document.getElementById(id);
        if (!el) return;
        const cur = el.value;
        const uniq = [...new Set((vals || []).filter(Boolean).map(String))].sort();
        el.innerHTML = '<option value="">All</option>' + uniq.map(v => `<option value="${v}">${v}</option>`).join('');
        if (uniq.includes(cur)) el.value = cur;
      };

      fill('matCity', [...s.map(x => x.City || x.city), ...p.map(x => x.City || x.city)]);
      fill('matCity1', [...s.map(x => x.City_1 || x.city1), ...p.map(x => x.City_1 || x.city1)]);
      fill('matRoute', [...s.map(x => x.Route || x.route), ...p.map(x => x.Route || x.route)]);
      fill('matCat', [...s.map(x => x['Party Category'] || x.category), ...p.map(x => x['Party Category'] || x.category)]);
      fill('matSubCat', [
        ...s.map(x => x.subCategory || x['Sub Category'] || x.partySubCategory || x.itemSubCategory),
        ...p.map(x => x.subCategory || x['Sub Category']),
        ...stock.map(x => x.subCategory || x['Sub Category Name'])
      ]);
      fill('matrixBrandSelect', [...s.map(x => x.Brand || x.brand), ...stock.map(x => x.Brand || x.brand)]);
    }

    function initItemBrandMatrix() {
      populateMatrixOptions();

      // Bind events once
      const presetEl = document.getElementById('matPreset');
      if (presetEl && !presetEl.dataset.bound) {
        presetEl.dataset.bound = 'true';
        presetEl.addEventListener('change', applyMatrixPreset);

        ['matFrom', 'matTo'].forEach(id => {
          document.getElementById(id)?.addEventListener('change', () => {
            const p = document.getElementById('matPreset');
            if (p) p.value = 'custom';
            renderItemBrandMatrix();
          });
        });

        ['matCity', 'matCity1', 'matRoute', 'matCat', 'matSubCat', 'matrixBrandSelect', 'matBillNo', 'matStatus', 'matrixSearchInput'].forEach(id => {
          const el = document.getElementById(id);
          if (el) {
            el.addEventListener('change', () => renderItemBrandMatrix());
            if (el.tagName === 'INPUT') el.addEventListener('input', () => renderItemBrandMatrix());
          }
        });
      }

      applyMatrixPreset();
    }

    window.addEventListener('ds:db-updated', () => {
      populateMatrixOptions();
      renderItemBrandMatrix();
    });

    function renderItemBrandMatrix() {
      const tbody = document.getElementById('itemBrandTableBody');
      if (!tbody) return;

      const db = window.DS_Storage ? window.DS_Storage.getDB() : { sales: [], stock: [] };
      const sales = db.sales || [];
      const stock = db.stock || [];
      const unpaid = new Set((db.unpaid || []).map(x => String(x.invoice || x.billNo || x.invoiceNo || x.bill_no || '').trim()).filter(Boolean));

      const preset = document.getElementById('matPreset')?.value || 'month';
      const fromVal = document.getElementById('matFrom')?.value || '';
      const toVal = document.getElementById('matTo')?.value || '';
      const { start, end } = matDateRange(preset, fromVal, toVal);

      const city = document.getElementById('matCity')?.value || '';
      const city1 = document.getElementById('matCity1')?.value || '';
      const route = document.getElementById('matRoute')?.value || '';
      const cat = document.getElementById('matCat')?.value || '';
      const subCat = document.getElementById('matSubCat')?.value || '';
      const brandFilter = document.getElementById('matrixBrandSelect')?.value || '';
      const billFilter = String(document.getElementById('matBillNo')?.value || '').trim().toLowerCase();
      const statusFilter = String(document.getElementById('matStatus')?.value || '').trim().toLowerCase();
      const search = (document.getElementById('matrixSearchInput')?.value || '').toLowerCase().trim();

      // Filter sales before aggregating
      const filteredSales = sales.filter(row => {
        const d = new Date((row.Date || row.date || '') + 'T00:00:00');
        if (start && (!isNaN(d.getTime()) && d < start)) return false;
        if (end && (!isNaN(d.getTime()) && d > end)) return false;

        const xCity = row.City || row.city || '';
        const xCity1 = row.City_1 || row.city1 || xCity;
        const xRoute = row.Route || row.route || '';
        const xCat = row['Party Category'] || row.category || '';
        const xSubCat = row.subCategory || row['Sub Category'] || row.partySubCategory || row.itemSubCategory || '';
        const xBrand = row.Brand || row.brand || '';
        const inv = String(row['Invoice No.'] || row.invoiceNo || row.invoice_no || '');
        const bill = String(row.bill_no || row.billNo || row['Bill No.'] || '');
        const party = String(row['Party Name'] || row.party || row.party_name || '');
        const item = String(row['Item Name'] || row.item || row.item_name || row.itemName || '');

        if (city && String(xCity) !== city) return false;
        if (city1 && String(xCity1) !== city1) return false;
        if (route && String(xRoute) !== route) return false;
        if (cat && String(xCat) !== cat) return false;
        if (subCat && String(xSubCat) !== subCat) return false;
        if (brandFilter && String(xBrand) !== brandFilter) return false;

        if (billFilter && !inv.toLowerCase().includes(billFilter) && !bill.toLowerCase().includes(billFilter)) return false;

        if (statusFilter) {
          const isUnpaid = unpaid.has(inv) || unpaid.has(bill) || String(row.status || row.payment_status || '').toLowerCase() === 'unpaid';
          if (statusFilter === 'unpaid' && !isUnpaid) return false;
          if (statusFilter === 'paid' && isUnpaid) return false;
        }

        if (search && ![item, xBrand, party, inv, bill, xRoute].join(' ').toLowerCase().includes(search)) {
          return false;
        }

        return true;
      });

      // Group sales by Brand + Item
      const agg = {};
      filteredSales.forEach(row => {
        const item = String(row['Item Name'] || row.item || row.item_name || row.itemName || row.description || 'General Item').trim();
        const brand = String(row.Brand || row.brand || 'General').trim();
        const key = brand + '___' + item;
        const qty = parseFloat(String(row.QtyNum ?? row.qty ?? row.quantity ?? 0).replace(/[^0-9.\-]/g, '')) || 0;
        const amt = parseFloat(String(row.AmountNum ?? row.amount ?? row.total_amount ?? row.total ?? 0).replace(/[^0-9.\-]/g, '')) || 0;

        if (!agg[key]) {
          agg[key] = { brand: brand, item: item, qty: 0, amount: 0 };
        }
        agg[key].qty += qty;
        agg[key].amount += amt;
      });

      // If no sales found and no filters active, show default catalog demo
      if (Object.keys(agg).length === 0 && stock.length > 0 && !brandFilter && !search && !city && !city1 && !route && !billFilter && !statusFilter && preset === 'all') {
        stock.forEach(stk => {
          const key = (stk.brand || 'General') + '___' + (stk.name || stk.Name);
          agg[key] = { brand: stk.brand || 'General', item: stk.name || stk.Name, qty: 15, amount: 15 * (stk.price || stk.rate || 100) };
        });
      }

      matrixData = Object.values(agg).sort((a, b) => b.amount - a.amount);

      const totalRevenue = matrixData.reduce((sum, m) => sum + m.amount, 0);
      const totalQty = matrixData.reduce((sum, m) => sum + m.qty, 0);

      document.getElementById('matTotalTurnover').textContent = '₹ ' + totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 });
      document.getElementById('matTotalQty').textContent = totalQty.toLocaleString('en-IN');
      document.getElementById('matTotalSkus').textContent = matrixData.length;

      if (matrixData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--ds-text-muted);">No product items found matching criteria.</td></tr>';
        return;
      }

      tbody.innerHTML = matrixData.map((m, idx) => {
        const avgRate = m.qty > 0 ? (m.amount / m.qty) : 0;
        const share = totalRevenue > 0 ? ((m.amount / totalRevenue) * 100).toFixed(1) : '0';
        return `
          <tr>
            <td>${idx + 1}</td>
            <td><span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;">${m.brand}</span></td>
            <td><strong>${m.item}</strong></td>
            <td class="num font-mono">${m.qty.toLocaleString('en-IN')}</td>
            <td class="num font-mono"><strong>₹ ${m.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
            <td class="num font-mono">₹ ${avgRate.toFixed(2)}</td>
            <td class="num" style="font-weight:700; color:var(--ds-accent);">${share}%</td>
          </tr>
        `;
      }).join('');
    }

    function exportMatrixExcel() {
      if (typeof XLSX === 'undefined') {
        alert('SheetJS Excel library is loading. Please try again.');
        return;
      }
      const data = matrixData.map((m, i) => ({
        '#': i + 1,
        'Brand': m.brand,
        'Item Description': m.item,
        'Units Sold': m.qty,
        'Gross Revenue (INR)': m.amount,
        'Average Rate': m.qty > 0 ? (m.amount / m.qty).toFixed(2) : 0
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Item_Brand_Matrix');
      XLSX.writeFile(wb, `DS_Enterprises_Item_Brand_Matrix_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    document.addEventListener('DOMContentLoaded', initItemBrandMatrix);
    window.addEventListener('ds:components:loaded', initItemBrandMatrix);
  