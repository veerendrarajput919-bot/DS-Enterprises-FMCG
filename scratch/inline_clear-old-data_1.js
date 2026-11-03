
    function downloadBackup() {
      try {
        const json = window.DS_Storage ? window.DS_Storage.exportBackup() : '{}';
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `DS_Enterprises_Backup_${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        if (window.DS_App) DS_App.toast('Backup JSON exported successfully!', 'success');
      } catch (err) {
        if (window.DS_App) DS_App.toast('Failed to export backup: ' + err.message, 'error');
      }
    }

    async function restoreBackupFile(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async function (e) {
        try {
          const res = await window.DS_Storage.importBackup(e.target.result);
          if (res.success) {
            if (window.DS_App) DS_App.toast('Database restored successfully from backup!', 'success');
            setTimeout(() => window.location.reload(), 1200);
          } else {
            if (window.DS_App) DS_App.toast('Restore failed: ' + res.error, 'error');
          }
        } catch (err) {
          if (window.DS_App) DS_App.toast('Invalid JSON backup file: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
    }

    async function resetSampleData() {
      if (!confirm('Are you sure you want to restore the clean FMCG sample dataset? All custom edits will be reset to factory defaults.')) return;
      try {
        if (window.DS_Storage && typeof window.DS_Storage.resetToFactory === 'function') {
          await window.DS_Storage.resetToFactory();
        } else if (window.DS_Storage && typeof window.DS_Storage.seedSampleData === 'function') {
          await window.DS_Storage.seedSampleData();
        }
        if (window.DS_App) DS_App.toast('Clean FMCG sample dataset restored successfully!', 'success');
        setTimeout(() => window.location.reload(), 800);
      } catch (err) {
        if (window.DS_App) DS_App.toast('Failed to reset dataset: ' + err.message, 'error');
      }
    }

    function wipeTransactions() {
      if (!window.DS_Auth || !window.DS_Auth.isAdmin()) {
        if (window.DS_Auth) window.DS_Auth.switchToAdminWithPrompt();
        return;
      }
      if (!confirm('CRITICAL ACTION: This will delete all order bookings, payment collections and sales entries while preserving your product catalog and store master. Proceed?')) {
        return;
      }
      const passEl = document.getElementById('dsAdminConfirmPassword');
      if (passEl) passEl.value = '';
      window.onAdminConfirmSubmit = async () => {
        const pin = passEl ? passEl.value.trim() : '';
        if (pin === window.DS_Auth.getAdminPassword()) {
          if (window.DS_App) DS_App.closeModal('dsAdminConfirmModal');
          if (window.DS_Storage) await window.DS_Storage.clearAll();
          if (window.DS_App) DS_App.toast('All transactions cleared. Product catalog and stores preserved.', 'warning');
          setTimeout(() => window.location.reload(), 1200);
        } else {
          if (window.DS_App) DS_App.toast('Invalid Admin PIN! Wipe aborted.', 'error');
        }
      };
      if (window.DS_App) DS_App.openModal('dsAdminConfirmModal');
      setTimeout(() => { if (passEl) passEl.focus(); }, 150);
    }

    function purgeAllDemoDataPrompt() {
      if (!window.DS_Auth || !window.DS_Auth.isAdmin()) {
        if (window.DS_Auth) window.DS_Auth.switchToAdminWithPrompt();
        return;
      }
      if (!confirm('Are you sure you want to purge all demo & test transactions (sample orders, mock bills, and test collections)? Product catalog and store directory will be kept clean and intact.')) {
        return;
      }
      if (window.DS_Storage) {
        const res = window.DS_Storage.purgeAllDemoData();
        if (window.DS_App) DS_App.toast(res.message, 'success');
        setTimeout(() => window.location.reload(), 1000);
      }
    }

    function purgeZeroStockItems() {
      if (!window.DS_Storage) return;
      const db = window.DS_Storage.getDB();
      const count = (db.stock || []).filter(p => Number(p.stock ?? p['Stock Quantity'] ?? 0) <= 0).length;
      if (count === 0) {
        if (window.DS_App) DS_App.toast('No zero-stock products found in catalog.', 'info');
        return;
      }
      if (!confirm(`Found ${count} product(s) with 0 stock. Do you want to remove these unnecessary items from catalog? (क्या आप 0-स्टॉक वाले आइटम्स हटाना चाहते हैं?)`)) return;
      const removed = window.DS_Storage.purgeZeroStockProducts();
      if (window.DS_App) DS_App.toast(`Successfully removed ${removed} zero-stock products from catalog!`, 'success');
    }

    function purgeCancelledOrders() {
      if (!window.DS_Storage) return;
      const orders = window.DS_Storage.getOrders();
      const count = orders.filter(o => (o.status || '').includes('Cancelled') || o.cancelType).length;
      if (count === 0) {
        if (window.DS_App) DS_App.toast('No cancelled orders found to remove.', 'info');
        return;
      }
      if (!confirm(`Found ${count} cancelled order(s). Do you want to permanently remove them? (क्या आप सभी रद्द ऑर्डर्स हटाना चाहते हैं?)`)) return;
      const removed = window.DS_Storage.purgeCancelledOrders();
      if (window.DS_App) DS_App.toast(`Successfully purged ${removed} cancelled order records!`, 'success');
    }
  