# 🧪 Automated & Manual QA Testing Guide — DS Enterprises

---

## 🎯 Overview

This testing guide provides complete verification procedures for both **Automated Browser Automation (Headless Edge via Chrome DevTools Protocol)** and **Manual Functional QA** across all 14 modules of the DS Enterprises FMCG application.

---

## 🤖 1. Automated Headless Browser Testing (Zero-Setup)

Because the project runs in the browser, automated testing is executed against real Microsoft Edge / Chrome engines using Node.js without requiring third-party testing frameworks.

### Running the End-to-End Test Suite:
Run the test runner from terminal:
```powershell
node scratch/test_e2e.js
```

### What the Automated Test Verifies:
1. **Admin Portal Authentication:** Tests wrong PIN rejection and correct PIN `1234` unlocking.
2. **Sales Officer Role Switching:** Tests switching into `so_101` (Rahul Sharma), verifies badge and target updates.
3. **SO Dashboard Live Rendering:** Tests target card, booked today calculation, and beat route listing.
4. **Admin PIN Lockout:** Tests returning to admin mode via 4-digit keypad modal.
5. **Order Approval Pipeline:** Tests counts across Total, Pending, Approved, Dispatched, Delivered.
6. **Sales Officers Master:** Verifies directory listing, count badge, and route assignment.
7. **Tempo Loading Sheet Modal:** Verifies modal opening, SKU pick list, and drop sequence.
8. **Field Payment Collections:** Verifies collection log dialog, mode selection, and export button.
9. **All 14 Navigation Tabs:** Switches across all 14 tabs and verifies **0 console errors / 0 runtime exceptions**.

---

## 📋 2. Manual QA Verification Checklist

### Module 01: Portal Sign-In & PIN Authentication
- [ ] Open [`index.html`](file:///c:/Users/Admin/OneDrive/Desktop/DS%20Enterprises/index.html) in browser. Ensure the Sign-In modal appears immediately.
- [ ] Type `9999` and click **Unlock**. Verify error: *"❌ Incorrect Admin PIN. Default PIN is 1234."*
- [ ] Type `1234` and press physical keyboard **Enter**. Verify instant unlock and toast notification: *"✓ Welcome, Administrator!"*.
- [ ] Click top-right **🚪 Logout**. Verify system locks and opens Sign-In modal again.

### Module 02: Sales Officer Beat Dashboard (`soHome`)
- [ ] Click **🔄 Switch to Sales Officer** in top bar. Select *Rahul Sharma (SO-01)*.
- [ ] Verify Admin-only tabs (Upload, Clear Data, Sales Officers) disappear.
- [ ] Select route from dropdown (e.g. *Main Market*).
- [ ] Verify beat stores list loads with store name, pending balance, and buttons.
- [ ] Verify red **🛑 Credit Limit Alert** appears for stores with pending dues exceeding ₹40,000.

### Module 03: Field Payment Collection (`soPaymentModal`)
- [ ] On a store card, click **💵 Collect**.
- [ ] Enter Amount (e.g. `5000`), choose Mode (*Cash* / *UPI* / *Cheque*), enter reference `UPI123456`, and submit.
- [ ] Verify store pending balance decreases by ₹5,000 immediately.
- [ ] Verify **Collected Today** card on top updates in real time.

### Module 04: Order Booking Cart (`order`)
- [ ] Click **🛒 Take Order** on a store or navigate to **Order** tab.
- [ ] Search an item, enter quantity (e.g. `10`), discount (`5%`), and add to cart.
- [ ] Verify cart calculations (Tax, Net Total, Roundoff).
- [ ] Click **Submit Order**. Verify success notification and order persistence.

### Module 05: Order Approval & Fulfillment Pipeline (`orderApprove`)
- [ ] Unlock Admin mode (PIN `1234`).
- [ ] Go to **📦 Order Approval** tab.
- [ ] Verify newly booked order is listed with status **⏳ Submitted**.
- [ ] Click **✓ Approve**. Status changes to **📦 Approved**.
- [ ] Click **🚚 Dispatch**. Enter vehicle `PB10-9876`. Status changes to **🚚 Dispatched**.
- [ ] Click **🖨 Slip**. Verify official **DS Enterprises Dispatch Challan** opens with itemized table and signatures.
- [ ] Click **💬 WhatsApp**. Verify wa.me URL opens with formatted dispatch details.
- [ ] Click **✓ Delivered**. Status updates to delivered.

### Module 06: Consolidated Tempo / Van Loading Sheet
- [ ] In Order Approval tab, click **🚚 Tempo / Van Loading Sheet**.
- [ ] Select Route and Date.
- [ ] Verify **Section A (SKU Pick List)** aggregates total boxes across all orders.
- [ ] Verify **Section B (Drop Sequence)** lists stores in order.
- [ ] Click **🖨 Print Loading Sheet**. Verify print layout.

### Module 07: Data Upload & Parsing (`upload`)
- [ ] In Admin mode, navigate to **📥 Upload / Update** tab.
- [ ] Drop a sample Excel file into the upload zone.
- [ ] Verify row count preview card updates.
- [ ] Verify Sales, Stock, and Outstanding KPIs refresh across the dashboard.
