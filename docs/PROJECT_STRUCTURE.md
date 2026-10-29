# 📁 DS Enterprises — Complete Project Structure & Code Navigator

> **Project:** FMCG Distribution Management & Field Sales Automation System (DS Enterprises)  
> **Frontend:** Pure Vanilla HTML5, CSS3, ES6+ Modular Components (Zero-Build, PWA Ready)  
> **Backend:** PHP 8+ REST API Engine (CORS enabled, PDO, Prepared Statements)  
> **Database:** MySQL 8.0+ / MariaDB (`ds_enterprises` schema with auto-installer & seeder)  
> **Mode:** Hybrid Online/Offline (Automatic MySQL sync with graceful LocalStorage fallback)

---

## 🗂️ 1. Complete Project Directory Tree

```
DS-Enterprises-FMCG/
│
├── index.html                                        # 🚀 Main Modular Application Entry Point & SPA Hub
│
├── pages/                                            # 🌐 Individual Module HTML Pages (Direct File & Server Access)
│   ├── login.html                                    # 🔐 Dedicated Sign In Portal (Admin PIN + Sales Officer Select)
│   ├── dashboard.html                                # 📊 Executive & Sales Officer Beat KPI Dashboard
│   ├── sales-analysis.html                           # 📈 Multi-Filter Sales Turnover & Revenue Analytics
│   ├── party-wise.html                               # 🏪 Retailer Purchasing History & Account Profile
│   ├── stock.html                                    # 📦 Warehouse Inventory Valuation & Low-Stock Alerts
│   ├── outstanding-party-wise.html                   # ⏳ Party-Wise Outstanding Receivables & Aging Buckets
│   ├── outstanding-brand-wise.html                   # 🏢 Brand-Wise Outstanding Exposure Breakdown
│   ├── route-analysis.html                           # 📍 Beat Route & Retailer Category Density
│   ├── item-brand-wise-sale.html                     # 📑 Item & Brand Cross-Tab Performance Matrix
│   ├── order-punching.html                           # 🛒 Field Order Punching Cart & Store Catalog
│   ├── order-report.html                             # 📋 Order History & Status Lifecycle Tracking
│   ├── sales-officers.html                           # 👥 Sales Officers Master Directory & Target Setup
│   ├── order-approval.html                           # ⚡ Order Fulfillment & Dispatch Approval Pipeline
│   ├── upload-update.html                            # 📥 Excel / CSV Billing Sheet Ingestion Engine
│   ├── clear-old-data.html                           # 🧹 Database Backup, JSON Restore & Safe Reset
│   ├── payment-collections.html                      # 💵 Field Cash/UPI Collection & WhatsApp Receipts
│   ├── dispatch-challan.html                         # 🚚 Official Printable Dispatch Challan (A4 Slip)
│   └── loading-sheet.html                            # 🚐 Consolidated Tempo / Van Loading Manifest
│
├── components/                                       # 🧩 Reusable HTML UI Component Templates
│   ├── header.html                                   # 🔝 Top Role Bar, Live Status & SO Switcher
│   ├── sidebar.html                                  # 🧭 Grouped Navigation Drawer Sidebar
│   ├── footer.html                                   # 🔻 Standardized Footer Bar
│   ├── modal.html                                    # 🪟 Admin PIN Keypad & SO Selector Modals
│   └── notification.html                             # 🔔 Floating Toast Notification Container
│
├── assets/                                           # 🎨 Design System, CSS Stylesheets & JS Modules
│   ├── css/
│   │   ├── style.css                                 # 🎨 Core Theme Variables, Layout, Cards & Tables
│   │   ├── dashboard.css                             # 📊 KPI Cards, Progress Gauges & Store Visit Tiles
│   │   ├── responsive.css                            # 📱 Mobile Drawer & Touch Friendly Controls
│   │   └── print.css                                 # 🖨️ A4 Dispatch Challan & Loading Sheet Print Rules
│   │
│   ├── js/
│   │   ├── app.js                                    # 🚀 Bootstrap, Toasts, Modals & Number Formatters
│   │   ├── auth.js                                   # 🔐 Admin PIN Keypad, Role Verification & Session
│   │   ├── api.js                                    # 🌐 Backend REST API Client & Two-Way MySQL Sync
│   │   ├── dashboard.js                              # 📊 Dashboard KPIs & Sales Officer Beat View
│   │   ├── sales.js                                  # 📈 Sales Multi-Filter & CSV Export Engine
│   │   ├── stock.js                                  # 📦 Stock Valuation & Physical Count Adjuster
│   │   ├── orders.js                                 # 🛒 Store Cart, Stock Deduction & Order Booking
│   │   ├── payments.js                               # 💵 Field Collection & Instant WhatsApp Receipts
│   │   ├── dispatch.js                               # 🚚 Order Approval Pipeline & Challan Printing
│   │   ├── excel-import.js                           # 📥 SheetJS Workbook Parser & Column Mapping
│   │   └── storage.js                                # 💾 Universal LocalStorage Adapter & Auto-Seed
│   │
│   ├── images/
│   │   └── logo.png                                  # 🏷️ DS Enterprises FMCG Brand Badge Logo
│   │
│   └── icons/                                        # 📌 UI Vector Icons
│
├── backend/                                          # 🐘 PHP 8+ Backend & MySQL Database Engine
│   ├── config/
│   │   ├── db.php                                    # 🔌 PDO MySQL Database Connection & CORS Headers
│   │   └── local.example.php                         # ⚙️ Custom Database Credentials Template
│   │
│   ├── database/
│   │   ├── schema.sql                                # 🗄️ MySQL Database Tables, Indexes & Foreign Keys
│   │   └── setup.php                                 # 🚀 Auto-Installer & Sample Data Seeder Script
│   │
│   └── api/                                          # ⚡ REST API Endpoints (JSON)
│       ├── auth.php                                  # 🔐 Admin PIN Verify, Update PIN, SO Login
│       ├── sales.php                                 # 📈 GET Filtered Sales, POST New Invoice
│       ├── parties.php                               # 🏪 GET Retail Outlets, POST/PUT Store Details
│       ├── stock.php                                 # 📦 GET Inventory & Valuation, PUT Stock Adjust
│       ├── outstanding.php                           # ⏳ GET Aging Receivables & Brand Exposure
│       ├── orders.php                                # 🛒 GET Orders, POST Punch Cart, PUT Lifecycle Status
│       ├── payments.php                              # 💵 GET Collections, POST Recovery & WhatsApp
│       ├── sales_officers.php                        # 👥 GET Officers Master, POST New Officer, PUT Targets
│       ├── dispatch.php                              # 🚚 GET A4 Challan Data, GET Van Loading Manifest
│       ├── import_bills.php                          # 📥 POST 100+ Bills Excel Batch Import & Rollback
│       ├── numbering.php                             # 🔢 Configurable Auto Bill/Invoice Sequence Generator
│       ├── route_assignment.php                      # 🗺️ Route Optimization, SO Assignment & Manifest
│       ├── whatsapp.php                              # 💬 Direct WhatsApp Payment & Bill Reminders
│       └── sync.php                                  # 🔄 Two-Way Full State Synchronization
│
├── data/
│   ├── DS_Sample_100_Bills_Template.csv              # 📄 100-Bill FMCG Excel Sample Import Template
│   └── sample-data.json                              # 📦 Realistic Indian FMCG Demo Dataset (Sales, Stock, Parties)
│
├── docs/                                             # 📚 Enterprise Documentation Suite
│   ├── PROJECT_STRUCTURE.md                          # 🧭 You are here: Code navigator & directory tree
│   ├── USER_MANUAL.md                                # 💼 Complete Hindi Operations Manual
│   └── INSTALLATION.md                               # 🚀 Installation, PWA Setup & Local Static Server Guide
│
├── tests/
│   └── test_suite.php                                # 🧪 30-Test Automated Acceptance Verification Suite
│
└── README.md                                         # 📖 Quickstart Guide & Master Overview
```

---

## 🗄️ 2. MySQL Database Schema Specification

| Table Name | Primary Key | Description & Relationships |
| :--- | :--- | :--- |
| `settings` | `setting_key` | System settings (Admin PIN, company profile, GSTIN) |
| `sales_officers` | `id` (e.g. `SO-101`) | Field sales officers, assigned beats, monthly targets |
| `parties` | `id` (e.g. `P001`) | Retail stores, kirana shops, credit limit, outstanding |
| `stock` | `code` (e.g. `SKU-001`) | FMCG items, brand, category, physical stock, rate, MRP |
| `sales_invoices` | `id` (Auto-inc) | Historical and imported billing invoices |
| `orders` | `id` (e.g. `ORD-2026-5001`) | Field punched orders with lifecycle status |
| `order_items` | `id` (Auto-inc) | Order line items with item code, qty, price, total |
| `payment_collections` | `id` (e.g. `REC-2026-3001`)| Field cash/UPI collection ledger with receipt ID |
| `outstanding_invoices`| `id` (Auto-inc) | Party-wise unpaid bills categorized by aging buckets |

---

## 🚀 3. How to Setup and Run Backend (PHP & MySQL)

### Step 1: Open XAMPP Control Panel
1. Start **Apache** and **MySQL**.

### Step 2: Initialize Database with 1-Click
Run the automated installer script:
- **Via Browser:** Open `http://localhost/DS%20Enterprises/backend/database/setup.php`
- **Via CLI:**
  ```bash
  "C:\xampp\php\php.exe" backend/database/setup.php
  ```
The installer automatically creates the `ds_enterprises` database, runs `schema.sql`, and seeds all initial FMCG data from `data/sample-data.json`.

### Step 3: Frontend Hybrid Connection
- If running under XAMPP (`http://localhost/DS%20Enterprises/`), [`assets/js/api.js`](file:///c:/Users/Admin/OneDrive/Desktop/DS%20Enterprises/assets/js/api.js) automatically connects to the PHP REST API and MySQL!
- If double-clicking `.html` files offline via `file:///`, the system automatically falls back to `LocalStorage` so the application NEVER crashes!
