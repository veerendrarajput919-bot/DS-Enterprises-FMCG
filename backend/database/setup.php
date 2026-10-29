<?php
/**
 * ==========================================================================
 * DS ENTERPRISES — BACKEND DATABASE AUTO-INSTALLER & SEEDER
 * File: backend/database/setup.php
 * Supports: MySQL and Zero-Config SQLite Fallback
 * Run via CLI: php backend/database/setup.php
 * Or via Browser: http://localhost/DS%20Enterprises/backend/database/setup.php
 * ==========================================================================
 */

require_once __DIR__ . '/../config/db.php';

$pdo = Database::getConnection();

if (!$pdo) {
    if (php_sapi_name() === 'cli') {
        echo "ERROR: Failed to initialize database connection.\nPlease check backend/config/db.php\n";
    } else {
        errorResponse("Failed to connect to database.", 500);
    }
    exit(1);
}

$driver = Database::getDriver();

// 1. Initialize Tables
if ($driver === 'sqlite') {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS settings (
            setting_key TEXT PRIMARY KEY,
            setting_value TEXT NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS sales_officers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            user_id TEXT,
            password TEXT DEFAULT '1234',
            phone TEXT NOT NULL,
            route TEXT NOT NULL,
            target REAL DEFAULT 300000.00,
            role TEXT DEFAULT 'so',
            permissions TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS parties (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            contact_person TEXT,
            phone TEXT,
            route TEXT NOT NULL,
            address TEXT,
            city TEXT DEFAULT 'Kanpur',
            category TEXT DEFAULT 'B - Retail Kirana',
            credit_limit REAL DEFAULT 50000.00,
            outstanding REAL DEFAULT 0.00,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS stock (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            brand TEXT NOT NULL,
            category TEXT NOT NULL,
            current_stock REAL DEFAULT 0.00,
            unit TEXT DEFAULT 'Pcs',
            rate REAL DEFAULT 0.00,
            mrp REAL DEFAULT 0.00,
            min_stock REAL DEFAULT 50,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS sales_invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_no TEXT,
            invoice_date TEXT,
            party_name TEXT,
            party_contact TEXT,
            item_name TEXT,
            brand TEXT,
            category TEXT,
            route TEXT,
            city TEXT,
            qty REAL DEFAULT 1,
            unit TEXT DEFAULT 'Pcs',
            rate REAL DEFAULT 0.00,
            mrp REAL DEFAULT 0.00,
            amount REAL DEFAULT 0.00,
            sales_person TEXT,
            so_id TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            bill_no TEXT,
            invoice_no TEXT,
            order_date TEXT,
            order_datetime TEXT,
            store_name TEXT,
            party_id TEXT,
            location TEXT,
            city TEXT DEFAULT 'Kanpur',
            route TEXT,
            category TEXT,
            contact_person TEXT,
            contact_phone TEXT,
            sales_person TEXT,
            so_id TEXT,
            total_amount REAL DEFAULT 0.00,
            total_qty REAL DEFAULT 0,
            status TEXT DEFAULT 'Pending',
            payment_status TEXT DEFAULT 'Unpaid',
            cancellation_type TEXT,
            cancellation_reason TEXT,
            cancellation_remark TEXT,
            cancelled_by TEXT,
            cancelled_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT,
            item_code TEXT,
            item_name TEXT,
            brand TEXT,
            qty REAL DEFAULT 1,
            unit TEXT DEFAULT 'Pcs',
            price REAL DEFAULT 0.00,
            total REAL DEFAULT 0.00
        );
        CREATE TABLE IF NOT EXISTS payment_collections (
            id TEXT PRIMARY KEY,
            collection_date TEXT,
            collection_time TEXT,
            party_name TEXT,
            phone TEXT,
            route TEXT,
            amount REAL DEFAULT 0.00,
            payment_mode TEXT DEFAULT 'Cash',
            reference_no TEXT,
            collected_by TEXT,
            remarks TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS outstanding_invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_no TEXT,
            invoice_date TEXT,
            party_name TEXT,
            route TEXT,
            phone TEXT,
            total_amount REAL DEFAULT 0.00,
            balance_amount REAL DEFAULT 0.00,
            due_days INTEGER DEFAULT 0,
            age_bucket TEXT DEFAULT '0-15 Days',
            sales_person TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    ");
} else {
    $schemaSql = file_get_contents(__DIR__ . '/schema.sql');
    $pdo->exec($schemaSql);
}

// 2. Read Sample Data from data/sample-data.json
$jsonPath = __DIR__ . '/../../data/sample-data.json';
$stats = [
    'officers' => 0,
    'parties' => 0,
    'stock' => 0,
    'sales' => 0,
    'orders' => 0,
    'collections' => 0,
    'outstanding' => 0
];

if (file_exists($jsonPath)) {
    $data = json_decode(file_get_contents($jsonPath), true);

    // Seed Sales Officers
    if (!empty($data['salesOfficers'])) {
        $sql = ($driver === 'sqlite')
            ? "INSERT OR REPLACE INTO sales_officers (id, name, phone, route, target, is_active) VALUES (:id, :name, :phone, :route, :target, :active)"
            : "INSERT INTO sales_officers (id, name, phone, route, target, is_active) VALUES (:id, :name, :phone, :route, :target, :active) ON DUPLICATE KEY UPDATE name=VALUES(name), phone=VALUES(phone), route=VALUES(route), target=VALUES(target)";
        $stmt = $pdo->prepare($sql);
        foreach ($data['salesOfficers'] as $so) {
            $stmt->execute([
                ':id' => $so['id'],
                ':name' => $so['name'],
                ':phone' => $so['phone'],
                ':route' => $so['route'],
                ':target' => $so['target'] ?? 300000.00,
                ':active' => !empty($so['active']) ? 1 : 1
            ]);
            $stats['officers']++;
        }
    }

    // Seed Parties
    if (!empty($data['parties'])) {
        $sql = ($driver === 'sqlite')
            ? "INSERT OR REPLACE INTO parties (id, name, contact_person, phone, route, address, city, category, credit_limit, outstanding) VALUES (:id, :name, :contact, :phone, :route, :address, :city, :category, :credit, :outstanding)"
            : "INSERT INTO parties (id, name, contact_person, phone, route, address, city, category, credit_limit, outstanding) VALUES (:id, :name, :contact, :phone, :route, :address, :city, :category, :credit, :outstanding) ON DUPLICATE KEY UPDATE contact_person=VALUES(contact_person), phone=VALUES(phone), outstanding=VALUES(outstanding)";
        $stmt = $pdo->prepare($sql);
        foreach ($data['parties'] as $p) {
            $stmt->execute([
                ':id' => $p['id'],
                ':name' => $p['name'],
                ':contact' => $p['contact'] ?? '',
                ':phone' => $p['phone'] ?? '',
                ':route' => $p['route'] ?? 'General Route',
                ':address' => $p['address'] ?? '',
                ':city' => $p['city'] ?? 'Kanpur',
                ':category' => $p['category'] ?? 'Retail Kirana',
                ':credit' => $p['creditLimit'] ?? 50000.00,
                ':outstanding' => $p['outstanding'] ?? 0.00
            ]);
            $stats['parties']++;
        }
    }

    // Seed Stock
    if (!empty($data['stock'])) {
        $sql = ($driver === 'sqlite')
            ? "INSERT OR REPLACE INTO stock (code, name, brand, category, current_stock, unit, rate, mrp, min_stock) VALUES (:code, :name, :brand, :category, :stock, :unit, :rate, :mrp, :min_stock)"
            : "INSERT INTO stock (code, name, brand, category, current_stock, unit, rate, mrp, min_stock) VALUES (:code, :name, :brand, :category, :stock, :unit, :rate, :mrp, :min_stock) ON DUPLICATE KEY UPDATE name=VALUES(name), current_stock=VALUES(current_stock), rate=VALUES(rate), mrp=VALUES(mrp)";
        $stmt = $pdo->prepare($sql);
        foreach ($data['stock'] as $s) {
            $stmt->execute([
                ':code' => $s['code'],
                ':name' => $s['name'],
                ':brand' => $s['brand'] ?? 'Generic',
                ':category' => $s['category'] ?? 'FMCG Goods',
                ':stock' => $s['stock'] ?? 0,
                ':unit' => $s['unit'] ?? 'Pcs',
                ':rate' => $s['rate'] ?? 0.00,
                ':mrp' => $s['mrp'] ?? 0.00,
                ':min_stock' => $s['minStock'] ?? 50
            ]);
            $stats['stock']++;
        }
    }

    // Seed Sales Invoices
    if (!empty($data['sales'])) {
        $stmt = $pdo->prepare("INSERT INTO sales_invoices (invoice_no, invoice_date, party_name, party_contact, item_name, brand, category, route, city, qty, unit, rate, mrp, amount, sales_person, so_id)
            VALUES (:inv, :date, :party, :contact, :item, :brand, :cat, :route, :city, :qty, :unit, :rate, :mrp, :amount, :sp, :so_id)");
        
        $pdo->exec("DELETE FROM sales_invoices WHERE invoice_no LIKE 'INV-2026-%'");
        foreach ($data['sales'] as $sale) {
            $stmt->execute([
                ':inv' => $sale['invoiceNo'] ?? ('INV-' . uniqid()),
                ':date' => $sale['date'] ?? date('Y-m-d'),
                ':party' => $sale['party'],
                ':contact' => $sale['partyContact'] ?? '',
                ':item' => $sale['item'],
                ':brand' => $sale['brand'] ?? 'Generic',
                ':cat' => $sale['category'] ?? 'General',
                ':route' => $sale['route'] ?? 'General Beat',
                ':city' => $sale['city'] ?? 'Kanpur',
                ':qty' => $sale['qty'] ?? 1,
                ':unit' => $sale['unit'] ?? 'Pcs',
                ':rate' => $sale['rate'] ?? 0.00,
                ':mrp' => $sale['mrp'] ?? 0.00,
                ':amount' => $sale['amount'] ?? 0.00,
                ':sp' => $sale['salesPerson'] ?? 'Admin Ingestion',
                ':so_id' => $sale['soId'] ?? 'SO-101'
            ]);
            $stats['sales']++;
        }
    }

    // Seed Orders & Items
    if (!empty($data['orders'])) {
        $sqlOrder = ($driver === 'sqlite')
            ? "INSERT OR REPLACE INTO orders (id, order_date, order_datetime, store_name, party_id, location, city, route, category, contact_person, contact_phone, sales_person, so_id, total_amount, total_qty, status, payment_status) VALUES (:id, :date, :datetime, :store, :party_id, :loc, :city, :route, :cat, :contact, :phone, :sp, :so_id, :total, :qty, :status, :payment)"
            : "INSERT INTO orders (id, order_date, order_datetime, store_name, party_id, location, city, route, category, contact_person, contact_phone, sales_person, so_id, total_amount, total_qty, status, payment_status) VALUES (:id, :date, :datetime, :store, :party_id, :loc, :city, :route, :cat, :contact, :phone, :sp, :so_id, :total, :qty, :status, :payment) ON DUPLICATE KEY UPDATE status=VALUES(status), payment_status=VALUES(payment_status)";
        $stmtOrder = $pdo->prepare($sqlOrder);
        
        $stmtItem = $pdo->prepare("INSERT INTO order_items (order_id, item_code, item_name, brand, qty, unit, price, total)
            VALUES (:oid, :code, :name, :brand, :qty, :unit, :price, :total)");

        foreach ($data['orders'] as $ord) {
            $stmtOrder->execute([
                ':id' => $ord['id'],
                ':date' => $ord['date'],
                ':datetime' => $ord['dateTime'] ?? ($ord['date'] . ' 10:00:00'),
                ':store' => $ord['storeName'] ?? $ord['party'],
                ':party_id' => $ord['partyId'] ?? null,
                ':loc' => $ord['location'] ?? '',
                ':city' => $ord['city'] ?? 'Kanpur',
                ':route' => $ord['route'] ?? '',
                ':cat' => $ord['category'] ?? 'Retail Kirana',
                ':contact' => $ord['givenName'] ?? '',
                ':phone' => $ord['givenContact'] ?? '',
                ':sp' => $ord['salesPerson'] ?? 'Field Executive',
                ':so_id' => $ord['soId'] ?? 'SO-101',
                ':total' => $ord['total'] ?? 0.00,
                ':qty' => $ord['qty'] ?? 0,
                ':status' => $ord['status'] ?? 'Submitted',
                ':payment' => $ord['payment'] ?? 'Unpaid'
            ]);
            $stats['orders']++;

            if (!empty($ord['items'])) {
                foreach ($ord['items'] as $it) {
                    $stmtItem->execute([
                        ':oid' => $ord['id'],
                        ':code' => $it['code'] ?? null,
                        ':name' => $it['name'] ?? 'Product',
                        ':brand' => $it['brand'] ?? '',
                        ':qty' => $it['qty'] ?? 1,
                        ':unit' => $it['unit'] ?? 'Pcs',
                        ':price' => $it['price'] ?? 0.00,
                        ':total' => $it['total'] ?? 0.00
                    ]);
                }
            }
        }
    }

    // Seed Payment Collections
    if (!empty($data['collections'])) {
        $sqlColl = ($driver === 'sqlite')
            ? "INSERT OR REPLACE INTO payment_collections (id, collection_date, collection_time, party_name, phone, route, amount, payment_mode, reference_no, collected_by, remarks) VALUES (:id, :date, :time, :party, :phone, :route, :amount, :mode, :ref, :by, :remarks)"
            : "INSERT INTO payment_collections (id, collection_date, collection_time, party_name, phone, route, amount, payment_mode, reference_no, collected_by, remarks) VALUES (:id, :date, :time, :party, :phone, :route, :amount, :mode, :ref, :by, :remarks) ON DUPLICATE KEY UPDATE amount=VALUES(amount)";
        $stmtColl = $pdo->prepare($sqlColl);
        foreach ($data['collections'] as $c) {
            $stmtColl->execute([
                ':id' => $c['id'],
                ':date' => $c['date'],
                ':time' => $c['time'] ?? '12:00',
                ':party' => $c['party'],
                ':phone' => $c['phone'] ?? '',
                ':route' => $c['route'] ?? '',
                ':amount' => $c['amount'] ?? 0.00,
                ':mode' => $c['paymentMode'] ?? 'Cash',
                ':ref' => $c['referenceNo'] ?? '',
                ':by' => $c['collectedBy'] ?? 'Field Collector',
                ':remarks' => $c['remarks'] ?? ''
            ]);
            $stats['collections']++;
        }
    }

    // Seed Outstanding Invoices
    if (!empty($data['unpaid'])) {
        $stmtUnpaid = $pdo->prepare("INSERT INTO outstanding_invoices (bill_no, invoice_date, party_name, route, phone, total_amount, balance_amount, due_days, age_bucket, sales_person)
            VALUES (:bill, :date, :party, :route, :phone, :total, :balance, :days, :bucket, :sp)");
        $pdo->exec("DELETE FROM outstanding_invoices WHERE bill_no LIKE 'BILL-%'");
        foreach ($data['unpaid'] as $u) {
            $stmtUnpaid->execute([
                ':bill' => $u['billNo'] ?? ('BILL-' . uniqid()),
                ':date' => $u['date'],
                ':party' => $u['party'],
                ':route' => $u['route'] ?? '',
                ':phone' => $u['phone'] ?? '',
                ':total' => $u['totalAmount'] ?? 0.00,
                ':balance' => $u['balanceAmount'] ?? 0.00,
                ':days' => $u['dueDays'] ?? 0,
                ':bucket' => $u['ageBucket'] ?? '0-15 Days',
                ':sp' => $u['salesPerson'] ?? 'Field Staff'
            ]);
            $stats['outstanding']++;
        }
    }
}

$output = [
    'success' => true,
    'message' => 'DS Enterprises Database setup & seed completed successfully!',
    'driver' => $driver,
    'records_inserted' => $stats,
    'timestamp' => date('c')
];

if (php_sapi_name() === 'cli') {
    echo json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
} else {
    jsonResponse($output);
}
