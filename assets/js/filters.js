/**
 * ==========================================================================
 * DS ENTERPRISES — GLOBAL FILTER, SORTING, PAGINATION & SECURE EXPORT ENGINE
 * File: assets/js/filters.js
 * Architecture: Universal Filter State, URL Query Sync, Formula Sanitizer
 * ==========================================================================
 */

(function (window) {
  'use strict';

  const DS_Filters = {
    /**
     * Sanitize values to prevent CSV / Excel Formula Injection (CSV Injection / CWE-1236)
     */
    sanitizeCellValue: function (val) {
      if (val === null || val === undefined) return '';
      let s = String(val);
      // If cell begins with =, +, -, @, \t, or \r, prefix with single quote
      if (/^[=+\-@\t\r]/.test(s)) {
        return "'" + s;
      }
      return s;
    },

    /**
     * Sanitize an entire dataset before exporting to Excel or CSV
     */
    sanitizeDataForExport: function (data) {
      if (!Array.isArray(data)) return [];
      return data.map(row => {
        const cleanRow = {};
        for (const [k, v] of Object.entries(row)) {
          if (typeof v === 'number' || typeof v === 'boolean') {
            cleanRow[k] = v;
          } else {
            cleanRow[k] = this.sanitizeCellValue(v);
          }
        }
        return cleanRow;
      });
    },

    /**
     * Export dataset to Excel (.xlsx) securely
     */
    exportToExcel: function (data, filename = 'ds_export.xlsx', sheetName = 'Data') {
      if (!data || !data.length) {
        if (window.DS_App) DS_App.toast('No records available to export', 'warning');
        return;
      }

      if (typeof XLSX === 'undefined') {
        if (window.DS_App) DS_App.toast('SheetJS library is loading, please try again', 'warning');
        return;
      }

      const cleanData = this.sanitizeDataForExport(data);
      const ws = XLSX.utils.json_to_sheet(cleanData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      const safeFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
      XLSX.writeFile(wb, safeFilename);

      if (window.DS_App) DS_App.toast(`✓ Exported ${cleanData.length} records to ${safeFilename}`, 'success');
    },

    /**
     * Export dataset to CSV with formula injection protection
     */
    exportToCSV: function (data, filename = 'ds_export.csv') {
      if (!data || !data.length) {
        if (window.DS_App) DS_App.toast('No records available to export', 'warning');
        return;
      }

      const cleanData = this.sanitizeDataForExport(data);
      const headers = Object.keys(cleanData[0]);

      let csvContent = '\uFEFF'; // UTF-8 BOM
      csvContent += headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',') + '\r\n';

      cleanData.forEach(row => {
        const line = headers.map(h => {
          const val = row[h] ?? '';
          return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',');
        csvContent += line + '\r\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (window.DS_App) DS_App.toast(`✓ Exported ${cleanData.length} records to ${filename}`, 'success');
    },

    /**
     * Read current URL Search Parameters into key-value map
     */
    getUrlParams: function () {
      const params = {};
      const searchParams = new URLSearchParams(window.location.search);
      for (const [k, v] of searchParams.entries()) {
        params[k] = v;
      }
      return params;
    },

    /**
     * Synchronize filter state into browser URL query string without reloading
     */
    syncUrlParams: function (params = {}) {
      const url = new URL(window.location.href);
      for (const [k, v] of Object.entries(params)) {
        if (v === '' || v === null || v === undefined) {
          url.searchParams.delete(k);
        } else {
          url.searchParams.set(k, v);
        }
      }
      window.history.replaceState({}, '', url.toString());
    },

    /**
     * Calculate date string range based on quick preset
     */
    getDatePresetRange: function (preset) {
      const now = new Date();
      const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      if (preset === 'today') {
        const s = fmt(now);
        return { from: s, to: s };
      }
      if (preset === 'yesterday') {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        const s = fmt(y);
        return { from: s, to: s };
      }
      if (preset === '7days') {
        const past = new Date(now);
        past.setDate(past.getDate() - 7);
        return { from: fmt(past), to: fmt(now) };
      }
      if (preset === '30days') {
        const past = new Date(now);
        past.setDate(past.getDate() - 30);
        return { from: fmt(past), to: fmt(now) };
      }
      if (preset === 'month' || preset === 'this_month' || preset === 'mtd') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: fmt(start), to: fmt(now) };
      }
      if (preset === 'lastmonth') {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return { from: fmt(start), to: fmt(end) };
      }
      return { from: '', to: '' };
    },

    /**
     * Standard Pagination Bar Renderer
     */
    renderPagination: function (container, pagination, onPageChange) {
      if (typeof container === 'string') {
        container = document.getElementById(container);
      }
      if (!container) return;

      const { page = 1, total_pages = 1, total_records = 0, limit = 25 } = pagination;
      if (total_pages <= 1 && total_records <= limit) {
        container.innerHTML = `
          <div style="font-size:12px; color:var(--ds-text-muted); display:flex; justify-content:space-between; align-items:center; width:100%; padding:8px 0;">
            <span>Showing all <strong>${total_records}</strong> records</span>
          </div>`;
        return;
      }

      const start = (page - 1) * limit + 1;
      const end = Math.min(page * limit, total_records);

      let html = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; width:100%; padding:10px 0; border-top:1px solid #e2e8f0; font-size:12px;">
          <div style="color:var(--ds-text-muted);">
            Showing <strong>${start}–${end}</strong> of <strong>${total_records}</strong> records
          </div>
          <div style="display:flex; gap:4px; align-items:center;">
            <button type="button" class="btn btn-secondary btn-sm" ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}" style="padding:4px 10px;">
              ‹ Prev
            </button>`;

      // Page numbers window
      const maxPagesToShow = 5;
      let startP = Math.max(1, page - 2);
      let endP = Math.min(total_pages, startP + maxPagesToShow - 1);
      if (endP - startP < maxPagesToShow - 1) {
        startP = Math.max(1, endP - maxPagesToShow + 1);
      }

      for (let p = startP; p <= endP; p++) {
        const isActive = (p === page);
        html += `
          <button type="button" class="btn ${isActive ? 'btn-primary' : 'btn-secondary'} btn-sm" data-page="${p}" style="padding:4px 9px; min-width:30px; ${isActive ? 'font-weight:800;' : ''}">
            ${p}
          </button>`;
      }

      html += `
            <button type="button" class="btn btn-secondary btn-sm" ${page >= total_pages ? 'disabled' : ''} data-page="${page + 1}" style="padding:4px 10px;">
              Next ›
            </button>
          </div>
        </div>`;

      container.innerHTML = html;

      // Bind page clicks
      container.querySelectorAll('button[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetPage = parseInt(btn.getAttribute('data-page'), 10);
          if (targetPage && targetPage !== page && onPageChange) {
            onPageChange(targetPage);
          }
        });
      });
    },

    /**
     * Add Interactive Sorting to Table Headers
     */
    bindTableSorting: function (table, onSortChange) {
      if (typeof table === 'string') table = document.querySelector(table);
      if (!table) return;

      const ths = table.querySelectorAll('th[data-sort]');
      ths.forEach(th => {
        th.style.cursor = 'pointer';
        th.style.userSelect = 'none';
        th.setAttribute('title', 'Click to sort');

        th.addEventListener('click', () => {
          const sortKey = th.getAttribute('data-sort');
          const currentDir = th.getAttribute('data-sort-dir') || '';
          const newDir = currentDir === 'asc' ? 'desc' : 'asc';

          ths.forEach(otherTh => {
            otherTh.removeAttribute('data-sort-dir');
            const ind = otherTh.querySelector('.sort-indicator');
            if (ind) ind.remove();
          });

          th.setAttribute('data-sort-dir', newDir);
          const arrow = newDir === 'asc' ? ' ▲' : ' ▼';
          let ind = th.querySelector('.sort-indicator');
          if (!ind) {
            ind = document.createElement('span');
            ind.className = 'sort-indicator';
            th.appendChild(ind);
          }
          ind.textContent = arrow;

          if (onSortChange) onSortChange(sortKey, newDir);
        });
      });
    }
  };

  window.DS_Filters = DS_Filters;

})(window);
