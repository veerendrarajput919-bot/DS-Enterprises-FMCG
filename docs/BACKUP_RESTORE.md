# 💾 Backup, Export & Disaster Recovery Guide — DS Enterprises

---

## 📌 How Data Is Stored in DS Enterprises

DS Enterprises operates on a **100% Offline-First architecture**. All business state—including master databases, sales history, punched orders, collections, and security PINs—is stored locally in browser storage:

| Storage Key | Content | Importance |
| :--- | :--- | :---: |
| `ds_admin_pin` | 4-Digit Administrator Security PIN | High |
| `ds_sales_officers_list` | Master profiles of all Sales Officers & targets | Critical |
| `ds_enterprises_orders_v1` | Punch orders, items, lifecycle & fulfillment statuses | Critical |
| `ds_fmcg_collections_v1` | Field cash and UPI payment collection receipts | Critical |
| `ds_fmcg_independent_test_v9` | Imported Sales, Stock, and Outstanding ledger | Critical |

> [!IMPORTANT]
> **Single Device Scope:** Browser `localStorage` is tied to the specific computer, browser, and user profile where it is opened. If you clear browser cookies/site data, this storage can be erased unless you take periodic backups.

---

## 📥 1. How to Backup Data (Data Export)

### Method A: One-Click Excel Reports
1. Go to **`📈 Order Report`** ➔ Click **`⇩ Export Orders Excel`**.
2. Go to **`📦 Order Approval`** ➔ **`💰 Payment Collections`** ➔ Click **`⇩ Export Excel`**.
3. Go to **`Outstanding Party Wise`** ➔ Click **`Download Outstanding Excel`**.

### Method B: Full JSON State Backup (Developer / Admin)
To take a complete snapshot of all orders, sales officers, collections, and settings:
1. Press `F12` on your keyboard to open Developer Tools.
2. Click the **Console** tab.
3. Paste the following snippet and press **Enter**:
```javascript
const backup = {
  date: new Date().toISOString(),
  orders: JSON.parse(localStorage.getItem('ds_enterprises_orders_v1') || '[]'),
  collections: JSON.parse(localStorage.getItem('ds_fmcg_collections_v1') || '[]'),
  salesOfficers: JSON.parse(localStorage.getItem('ds_sales_officers_list') || '[]'),
  adminPin: localStorage.getItem('ds_admin_pin') || '1234'
};
const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = `DS_Enterprises_Backup_${new Date().toISOString().slice(0,10)}.json`;
a.click();
```
A file named `DS_Enterprises_Backup_YYYY-MM-DD.json` will instantly download to your Downloads folder.

---

## 🔄 2. How to Restore Data from JSON Backup

If you changed computers or cleared your browser data, restore your data in 3 seconds:
1. Open [`index.html`](file:///c:/Users/Admin/OneDrive/Desktop/DS%20Enterprises/index.html) in your new browser.
2. Press `F12` ➔ Go to **Console**.
3. Paste the following snippet:
```javascript
async function restoreBackup() {
  const [fileHandle] = await window.showOpenFilePicker({ types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }] });
  const file = await fileHandle.getFile();
  const text = await file.text();
  const data = JSON.parse(text);
  if (data.orders) localStorage.setItem('ds_enterprises_orders_v1', JSON.stringify(data.orders));
  if (data.collections) localStorage.setItem('ds_fmcg_collections_v1', JSON.stringify(data.collections));
  if (data.salesOfficers) localStorage.setItem('ds_sales_officers_list', JSON.stringify(data.salesOfficers));
  if (data.adminPin) localStorage.setItem('ds_admin_pin', data.adminPin);
  alert('✓ Backup successfully restored! Refreshing page...');
  location.reload();
}
restoreBackup();
```
4. Select your backup `.json` file. The page will reload with all your data restored!

---

## 🧹 3. Safe Data Cleanup (सभी टेस्ट व डमी डेटा हटाकर क्लीन डेटाबेस शुरू करना)

When you want to reset all mock/demo transactions and begin live production operations:
1. Navigate to **`🧹 Data Management & Reset`** ([`pages/clear-old-data.html`](file:///c:/Users/Admin/OneDrive/Desktop/DS%20Enterprises/pages/clear-old-data.html)).
2. Under **`🧹 Clean Up Unnecessary Items`**, click:
   - **`✨ Purge All Demo & Test Data (Clean Database)`**: Wipes all 40+ sample sales, 14 unpaid demo invoices, 10 test orders, and 6 payment collections. Resets all party debt to ₹0. Keeps your 14 FMCG products and 10 kirana stores intact.
   - **`🗑️ Remove 0-Stock Items`**: Deletes out-of-stock / obsolete SKUs.
   - **`🗑️ Remove Cancelled Orders`**: Permanently cleans cancelled order audit logs.
3. You can also download or restore the pre-packaged clean starter file: [`data/DS_Enterprises_Clean_Starter_Backup.json`](file:///c:/Users/Admin/OneDrive/Desktop/DS%20Enterprises/data/DS_Enterprises_Clean_Starter_Backup.json).
