<?php
/**
 * ==========================================================================
 * DS ENTERPRISES — TWO-WAY DATABASE SYNCHRONIZATION REST API
 * File: backend/api/sync.php
 * Architecture: Seamless Offline-First & MySQL Cloud / Server Sync
 * ==========================================================================
 */

require_once __DIR__ . '/../config/db.php';

$pdo = Database::getConnection();
if (!$pdo) {
    errorResponse("Database connection unavailable", 500);
}

$method = $_SERVER['REQUEST_METHOD'];

// 1. GET: Full State Pull from MySQL to Frontend LocalStorage
if ($method === 'GET') {
    $sales = $pdo->query("SELECT * FROM sales_invoices ORDER BY invoice_date DESC LIMIT 500")->fetchAll();
    $parties = $pdo->query("SELECT * FROM parties ORDER BY name ASC")->fetchAll();
    $stock = $pdo->query("SELECT * FROM stock ORDER BY brand ASC, name ASC")->fetchAll();
    $orders = $pdo->query("SELECT * FROM orders ORDER BY order_datetime DESC LIMIT 100")->fetchAll();
    $colls = $pdo->query("SELECT * FROM payment_collections ORDER BY collection_date DESC LIMIT 100")->fetchAll();
    $unpaid = $pdo->query("SELECT * FROM outstanding_invoices ORDER BY due_days DESC LIMIT 200")->fetchAll();
    $officers = $pdo->query("SELECT * FROM sales_officers ORDER BY id ASC")->fetchAll();

    // Map order line items
    $orderIds = array_column($orders, 'id');
    if (!empty($orderIds)) {
        $inClause = implode(',', array_fill(0, count($orderIds), '?'));
        $stmtItems = $pdo->prepare("SELECT * FROM order_items WHERE order_id IN ({$inClause})");
        $stmtItems->execute($orderIds);
        $itemsMap = [];
        foreach ($stmtItems->fetchAll() as $item) {
            $itemsMap[$item['order_id']][] = $item;
        }
        foreach ($orders as &$ord) {
            $ord['items'] = $itemsMap[$ord['id']] ?? [];
        }
    }

    jsonResponse([
        'success' => true,
        'synced_at' => date('c'),
        'database' => DB_NAME,
        'data' => [
            'sales' => $sales,
            'parties' => $parties,
            'party' => $parties,
            'stock' => $stock,
            'orders' => $orders,
            'collections' => $colls,
            'unpaid' => $unpaid,
            'salesOfficers' => $officers
        ]
    ]);
}

// 2. POST: Push Offline Data from Frontend to MySQL
if ($method === 'POST') {
    $input = getJsonInput();
    $syncedOrders = 0;
    $syncedColls = 0;

    $pdo->beginTransaction();
    try {
        $isSqlite = Database::getDriver() === 'sqlite';

        // Sync Offline Punched Orders
        if (!empty($input['orders']) && is_array($input['orders'])) {
            $sqlOrder = $isSqlite
                ? "INSERT OR REPLACE INTO orders (id, order_date, order_datetime, store_name, party_id, location, city, route, category, contact_person, contact_phone, sales_person, so_id, total_amount, total_qty, status, payment_status)
                    VALUES (:id, :date, :datetime, :store, :party_id, :loc, :city, :route, :cat, :contact, :phone, :sp, :so_id, :total, :qty, :status, :payment)"
                : "INSERT INTO orders (id, order_date, order_datetime, store_name, party_id, location, city, route, category, contact_person, contact_phone, sales_person, so_id, total_amount, total_qty, status, payment_status)
                    VALUES (:id, :date, :datetime, :store, :party_id, :loc, :city, :route, :cat, :contact, :phone, :sp, :so_id, :total, :qty, :status, :payment)
                    ON DUPLICATE KEY UPDATE status=VALUES(status), payment_status=VALUES(payment_status)";
            $stmtOrder = $pdo->prepare($sqlOrder);
            
            $sqlItem = $isSqlite
                ? "INSERT OR REPLACE INTO order_items (order_id, item_code, item_name, brand, qty, unit, price, total)
                    VALUES (:oid, :code, :name, :brand, :qty, :unit, :price, :total)"
                : "INSERT INTO order_items (order_id, item_code, item_name, brand, qty, unit, price, total)
                    VALUES (:oid, :code, :name, :brand, :qty, :unit, :price, :total)
                    ON DUPLICATE KEY UPDATE qty=VALUES(qty)";
            $stmtItem = $pdo->prepare($sqlItem);

            foreach ($input['orders'] as $ord) {
                if (empty($ord['id'])) continue;
                $stmtOrder->execute([
                    ':id' => $ord['id'],
                    ':date' => $ord['date'] ?? date('Y-m-d'),
                    ':datetime' => $ord['dateTime'] ?? ($ord['date'] . ' 10:00:00'),
                    ':store' => $ord['storeName'] ?? $ord['party'] ?? 'Store',
                    ':party_id' => $ord['partyId'] ?? null,
                    ':loc' => $ord['location'] ?? '',
                    ':city' => $ord['city'] ?? 'Kanpur',
                    ':route' => $ord['route'] ?? '',
                    ':cat' => $ord['category'] ?? 'Retail Kirana',
                    ':contact' => $ord['givenName'] ?? '',
                    ':phone' => $ord['givenContact'] ?? '',
                    ':sp' => $ord['salesPerson'] ?? 'Field Executive',
                    ':so_id' => $ord['soId'] ?? null,
                    ':total' => (float)($ord['total'] ?? 0),
                    ':qty' => (float)($ord['qty'] ?? 0),
                    ':status' => $ord['status'] ?? 'Submitted',
                    ':payment' => $ord['payment'] ?? 'Unpaid'
                ]);
                $syncedOrders++;

                if (!empty($ord['items']) && is_array($ord['items'])) {
                    foreach ($ord['items'] as $it) {
                        $stmtItem->execute([
                            ':oid' => $ord['id'],
                            ':code' => $it['code'] ?? null,
                            ':name' => $it['name'] ?? 'Item',
                            ':brand' => $it['brand'] ?? '',
                            ':qty' => (float)($it['qty'] ?? 1),
                            ':unit' => $it['unit'] ?? 'Pcs',
                            ':price' => (float)($it['price'] ?? 0),
                            ':total' => (float)($it['total'] ?? 0)
                        ]);
                    }
                }
            }
        }

        // Sync Offline Collections
        if (!empty($input['collections']) && is_array($input['collections'])) {
            $sqlColl = $isSqlite
                ? "INSERT OR REPLACE INTO payment_collections (id, collection_date, collection_time, party_name, phone, route, amount, payment_mode, reference_no, collected_by, remarks)
                    VALUES (:id, :date, :time, :party, :phone, :route, :amount, :mode, :ref, :by, :remarks)"
                : "INSERT INTO payment_collections (id, collection_date, collection_time, party_name, phone, route, amount, payment_mode, reference_no, collected_by, remarks)
                    VALUES (:id, :date, :time, :party, :phone, :route, :amount, :mode, :ref, :by, :remarks)
                    ON DUPLICATE KEY UPDATE amount=VALUES(amount)";
            $stmtColl = $pdo->prepare($sqlColl);

            foreach ($input['collections'] as $c) {
                if (empty($c['id'])) continue;
                $stmtColl->execute([
                    ':id' => $c['id'],
                    ':date' => $c['date'] ?? date('Y-m-d'),
                    ':time' => $c['time'] ?? date('H:i'),
                    ':party' => $c['party'],
                    ':phone' => $c['phone'] ?? '',
                    ':route' => $c['route'] ?? '',
                    ':amount' => (float)($c['amount'] ?? 0),
                    ':mode' => $c['paymentMode'] ?? 'Cash',
                    ':ref' => $c['referenceNo'] ?? '',
                    ':by' => $c['collectedBy'] ?? 'Field Collector',
                    ':remarks' => $c['remarks'] ?? ''
                ]);
                $syncedColls++;
            }
        }

        $syncedSales = 0;
        $syncedParties = 0;
        $syncedStock = 0;

        // Sync Sales Ledger (e.g. from 4-File upload or offline edits)
        if (!empty($input['sales']) && is_array($input['sales'])) {
            $sqlSales = $isSqlite
                ? "INSERT OR REPLACE INTO sales_invoices (bill_no, invoice_no, invoice_date, party_name, item_name, brand, category, route, city, qty, rate, amount, payment_status)
                    VALUES (:bill, :inv, :date, :party, :item, :brand, :cat, :route, :city, :qty, :rate, :amount, :status)"
                : "INSERT INTO sales_invoices (bill_no, invoice_no, invoice_date, party_name, item_name, brand, category, route, city, qty, rate, amount, payment_status)
                    VALUES (:bill, :inv, :date, :party, :item, :brand, :cat, :route, :city, :qty, :rate, :amount, :status)
                    ON DUPLICATE KEY UPDATE amount=VALUES(amount), qty=VALUES(qty), payment_status=VALUES(payment_status)";
            $stmtSales = $pdo->prepare($sqlSales);

            foreach ($input['sales'] as $s) {
                $inv = $s['Invoice No.'] ?? $s['invoiceNo'] ?? $s['invoice_no'] ?? '';
                $bill = $s['bill_no'] ?? $s['billNo'] ?? $s['Bill No.'] ?? $inv;
                $pName = $s['Party Name'] ?? $s['party'] ?? $s['party_name'] ?? '';
                $iName = $s['Item Name'] ?? $s['item'] ?? $s['item_name'] ?? '';
                if (empty($pName) || empty($iName)) continue;

                $stmtSales->execute([
                    ':bill' => $bill ?: $inv,
                    ':inv' => $inv ?: $bill,
                    ':date' => $s['Date'] ?? $s['date'] ?? $s['invoice_date'] ?? date('Y-m-d'),
                    ':party' => $pName,
                    ':item' => $iName,
                    ':brand' => $s['Brand'] ?? $s['brand'] ?? 'General',
                    ':cat' => $s['Category'] ?? $s['category'] ?? 'FMCG',
                    ':route' => $s['Route'] ?? $s['route'] ?? 'General Route',
                    ':city' => $s['City'] ?? $s['city'] ?? 'Kanpur',
                    ':qty' => (float)($s['QtyNum'] ?? $s['qty'] ?? 1),
                    ':rate' => (float)($s['PriceNum'] ?? $s['rate'] ?? 0),
                    ':amount' => (float)($s['AmountNum'] ?? $s['amount'] ?? 0),
                    ':status' => $s['Status'] ?? $s['status'] ?? $s['payment_status'] ?? 'Paid'
                ]);
                $syncedSales++;
            }
        }

        // Sync Parties Master
        if (!empty($input['parties']) && is_array($input['parties'])) {
            $sqlP = $isSqlite
                ? "INSERT OR REPLACE INTO parties (id, name, phone, route, city, category, credit_limit, outstanding)
                    VALUES (:id, :name, :phone, :route, :city, :cat, :limit, :out)"
                : "INSERT INTO parties (id, name, phone, route, city, category, credit_limit, outstanding)
                    VALUES (:id, :name, :phone, :route, :city, :cat, :limit, :out)
                    ON DUPLICATE KEY UPDATE route=VALUES(route), city=VALUES(city), phone=VALUES(phone)";
            $stmtP = $pdo->prepare($sqlP);
            foreach ($input['parties'] as $p) {
                $name = $p['Name'] ?? $p['name'] ?? '';
                if (empty($name)) continue;
                $pid = $p['id'] ?? ('P' . substr(md5($name), 0, 6));
                $stmtP->execute([
                    ':id' => $pid,
                    ':name' => $name,
                    ':phone' => $p['Mob No.'] ?? $p['phone'] ?? '',
                    ':route' => $p['Route'] ?? $p['route'] ?? 'General Route',
                    ':city' => $p['City'] ?? $p['city'] ?? 'Kanpur',
                    ':cat' => $p['Party Category'] ?? $p['category'] ?? 'B - Retail Kirana',
                    ':limit' => (float)($p['creditLimit'] ?? $p['credit_limit'] ?? 50000),
                    ':out' => (float)($p['outstanding'] ?? 0)
                ]);
                $syncedParties++;
            }
        }

        // Sync Stock Master
        if (!empty($input['stock']) && is_array($input['stock'])) {
            $sqlStk = $isSqlite
                ? "INSERT OR REPLACE INTO stock (code, name, brand, category, current_stock, unit, rate, mrp, min_stock)
                    VALUES (:code, :name, :brand, :cat, :stock, :unit, :rate, :mrp, :min)"
                : "INSERT INTO stock (code, name, brand, category, current_stock, unit, rate, mrp, min_stock)
                    VALUES (:code, :name, :brand, :cat, :stock, :unit, :rate, :mrp, :min)
                    ON DUPLICATE KEY UPDATE rate=VALUES(rate), mrp=VALUES(mrp), current_stock=VALUES(current_stock)";
            $stmtStk = $pdo->prepare($sqlStk);
            foreach ($input['stock'] as $sk) {
                $name = $sk['Name'] ?? $sk['name'] ?? '';
                if (empty($name)) continue;
                $code = $sk['code'] ?? ('SKU-' . substr(md5($name), 0, 6));
                $stmtStk->execute([
                    ':code' => $code,
                    ':name' => $name,
                    ':brand' => $sk['Brand'] ?? $sk['brand'] ?? 'General',
                    ':cat' => $sk['Item Category Name'] ?? $sk['category'] ?? 'FMCG',
                    ':stock' => (float)($sk['Stock Quantity'] ?? $sk['stock'] ?? 0),
                    ':unit' => $sk['unit'] ?? 'Pcs',
                    ':rate' => (float)($sk['Selling Price'] ?? $sk['rate'] ?? 0),
                    ':mrp' => (float)($sk['MRP'] ?? $sk['mrp'] ?? 0),
                    ':min' => (float)($sk['minStock'] ?? 20)
                ]);
                $syncedStock++;
            }
        }

        $pdo->commit();

        jsonResponse([
            'success' => true,
            'message' => 'Sync completed successfully',
            'synced_orders' => $syncedOrders,
            'synced_collections' => $syncedColls,
            'synced_sales' => $syncedSales,
            'synced_parties' => $syncedParties,
            'synced_stock' => $syncedStock
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();
        errorResponse("Sync failed: " . $e->getMessage(), 500);
    }
}
