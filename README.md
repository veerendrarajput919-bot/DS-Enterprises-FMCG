# 🏢 DS Enterprises — FMCG Management & Field Sales System

> A complete distribution management and sales officer field operations system engineered for FMCG distributors.  
> **Frontend:** Pure Vanilla HTML5, CSS3, ES6+ (Multi-Page & Master SPA)  
> **Backend:** PHP 8+ REST API Engine (CORS enabled, PDO, Prepared Statements)  
> **Database:** MySQL 8.0+ / MariaDB (`ds_enterprises` schema)  
> **Architecture:** Zero-Build • PWA Enabled • 100% Offline-First with Automatic MySQL Sync

---

## ⚡ Quick Start

### Option 1: Double-Click & Run (Zero-Setup Offline Mode)
1. Double-click [`index.html`](index.html) or any page in [`pages/`](pages/) in Google Chrome or Microsoft Edge.
2. The system runs 100% offline using the built-in LocalStorage engine.
3. Default **Admin PIN:** **`1234`**.

### Option 2: Run with PHP & MySQL Backend (XAMPP / Apache Stack)
1. Place the project folder in your Apache web directory (e.g. `C:\xampp\htdocs\DS-Enterprises-FMCG`).
2. Start **Apache** and **MySQL** in XAMPP Control Panel.
3. Initialize the database by opening:
   ```
   http://localhost/DS-Enterprises-FMCG/backend/database/setup.php
   ```
   *(Or import [`backend/database/schema.sql`](backend/database/schema.sql) into phpMyAdmin).*
4. Open the application:
   ```
   http://localhost/DS-Enterprises-FMCG/index.html
   ```
   The frontend automatically detects the live PHP REST API and synchronizes all orders, collections, stock, and sales to MySQL!

---

## 📂 Complete Project Architecture

```
DS-Enterprises-FMCG/
│
├── index.html                                        # 🚀 Main Modular Application Entry Point & SPA Hub
│
├── pages/                                            # 🌐 18 Modular HTML Pages
│   ├── login.html                                    # 🔐 Dedicated Sign In Portal (Admin PIN + SO Select)
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
│   └── sample-data.json                              # 📦 Realistic Indian FMCG Demo Dataset
│
├── docs/                                             # 📚 Enterprise Documentation Suite
│   ├── PROJECT_STRUCTURE.md                          # 🧭 Code navigator & line directory
│   ├── USER_MANUAL.md                                # 💼 Complete operations guide in Hindi/English
│   └── INSTALLATION.md                               # 🚀 PWA installation & static server guide
│
├── tests/
│   └── test_suite.php                                # 🧪 30-Test Automated Acceptance Verification Suite
│
└── README.md                                         # 📖 Quickstart Guide & Master Overview
```

---

## 🎯 Key Capabilities & Highlights

- **🐘 Full-Stack Hybrid:** Runs either with PHP + MySQL on Apache/XAMPP or standalone 100% offline via `file:///` with Zero-Build!
- **👑 2-Tier Role System:** Seamless switching between **👑 Admin Panel** (full control, 18 modules) and **💼 Sales Officer Field Mode** (mobile beat view).
- **🔒 Admin PIN Security:** 4-digit touch keypad lock (Default: `1234`) with instant lockout and custom PIN settings.
- **🚀 Sales Officer Beat Dashboard:** Real-time daily target tracking (Target vs Booked vs Remaining), assigned route stores with pending balances, and 1-click order booking.
- **📦 Order Fulfillment Pipeline:** Complete status workflow: `Submitted` ➔ `Approved` ➔ `Dispatched` ➔ `Delivered` ➔ `Cancelled`.
- **🖨️ Printable Dispatch Challan & Packing Slip:** One-click invoice/challan generation with party details, itemized breakdown, and signature blocks.
- **🚚 Consolidated Tempo / Van Loading Sheet:** Automated SKU pick list (total crates/boxes by item) and delivery drop sequence.
- **💵 Field Payment Collections:** On-beat cash/UPI collection recording with automatic store balance deduction and instant WhatsApp receipts.
