<?php
/**
 * ==========================================================================
 * DS ENTERPRISES — BULK EXCEL BILL INGESTION & DATA UPDATE ENGINE
 * File: backend/api/import_bills.php
 * Handles: Ingestion of 100+ Bills, Stable Matching, Insert/Update/Both,
 * In-Transaction Safeguards, Change Auditing, and Import History
 * ==========================================================================
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/numbering.php';

$pdo = Database::getConnection();
if (!$pdo) {
    errorResponse("Database connection unavailable", 500);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'preview';

/**
 * 1. GET: Ingestion Template, History & Error Reports
 */
if ($method === 'GET') {
    if ($action === 'history') {
        $where = ["1=1"];
        $params = [];

        if (!empty($_GET['status'])) {
            $where[] = "status = :status";
            $params[':status'] = $_GET['status'];
        }

        if (!empty($_GET['from'])) {
            $where[] = "created_at >= :from";
            $params[':from'] = $_GET['from'] . ' 00:00:00';
        }

        if (!empty($_GET['to'])) {
            $where[] = "created_at <= :to";
            $params[':to'] = $_GET['to'] . ' 23:59:59';
        }

        $sqlWhere = implode(" AND ", $where);
        $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 50;
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $offset = ($page - 1) * $limit;

        $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM import_batches WHERE {$sqlWhere}");
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetchColumn();

        $stmt = $pdo->prepare("SELECT * FROM import_batches WHERE {$sqlWhere} ORDER BY created_at DESC LIMIT {$limit} OFFSET {$offset}");
        $stmt->execute($params);
        $batches = $stmt->fetchAll();

        jsonResponse([
            'success' => true,
            'total' => $total,
            'page' => $page,
            'batches' => $batches
        ]);
    }

    if ($action === 'template_columns') {
        jsonResponse([
            'success' => true,
            'columns' => [
                'Bill Number',
                'Invoice Number',
                'Date',
                'Customer ID',
                'Customer Name',
                'Customer Phone',
                'Route',
                'City',
                'Product Code',
                'Product Name',
                'Brand',
                'Category',
                'Quantity',
                'Unit',
                'Rate',
                'MRP',
                'Tax Amount',
                'Total Amount',
                'Payment Status',
                'Sales Person',
                'Notes'
            ]
        ]);
    }
}

/**
 * Helper: Normalize field keys from Excel/CSV headers
 */
function normalizeRow(array $raw): array {
    $map = [];
    foreach ($raw as $k => $v) {
        $cleanKey = preg_replace('/[^a-z0-9]/', '', strtolower(trim((string)$k)));
        $map[$cleanKey] = is_string($v) ? trim($v) : $v;
    }

    $billNo = $map['billnumber'] ?? $map['billno'] ?? $map['bill'] ?? '';
    $invNo = $map['invoicenumber'] ?? $map['invoiceno'] ?? $map['invoice'] ?? '';
    $id = $map['id'] ?? $map['databaseid'] ?? '';
    $date = $map['date'] ?? $map['invoicedate'] ?? $map['billdate'] ?? date('Y-m-d');
    $party = $map['customername'] ?? $map['partyname'] ?? $map['party'] ?? $map['customer'] ?? $map['storename'] ?? $map['store'] ?? '';
    $partyId = $map['customerid'] ?? $map['partyid'] ?? '';
    $phone = $map['customerphone'] ?? $map['partycontact'] ?? $map['phone'] ?? $map['contact'] ?? '';
    $route = $map['route'] ?? $map['beat'] ?? 'General Route';
    $city = $map['city'] ?? 'Kanpur';
    $code = $map['productcode'] ?? $map['itemcode'] ?? $map['sku'] ?? '';
    $item = $map['productname'] ?? $map['itemname'] ?? $map['item'] ?? $map['product'] ?? '';
    $brand = $map['brand'] ?? 'General';
    $category = $map['category'] ?? 'FMCG';
    $qty = (float)($map['quantity'] ?? $map['qty'] ?? 1);
    $unit = $map['unit'] ?? 'Pcs';
    $rate = (float)($map['rate'] ?? $map['price'] ?? 0);
    $mrp = (float)($map['mrp'] ?? $rate);
    $tax = (float)($map['taxamount'] ?? $map['tax'] ?? $map['gst'] ?? 0);
    $amount = (float)($map['totalamount'] ?? $map['amount'] ?? $map['total'] ?? ($qty * $rate));
    $payStatus = $map['paymentstatus'] ?? $map['payment'] ?? $map['status'] ?? 'Paid';
    $sp = $map['salesperson'] ?? $map['salesofficer'] ?? $map['so'] ?? 'Admin';
    $notes = $map['notes'] ?? $map['remarks'] ?? '';

    return [
        'id' => $id,
        'bill_no' => $billNo,
        'invoice_no' => $invNo,
        'date' => $date,
        'party_id' => $partyId,
        'party_name' => $party,
        'party_contact' => $phone,
        'route' => $route,
        'city' => $city,
        'code' => $code,
        'item_name' => $item,

        'brand' => $brand,
        'category' => $category,
        'qty' => $qty,
        'unit' => $unit,
        'rate' => $rate,
        'mrp' => $mrp,
        'tax_amount' => $tax,
        'amount' => $amount,
        'payment_status' => $payStatus,
        'sales_person' => $sp,
        'notes' => $notes,
        'raw' => $raw
    ];
}

/**
 * 2. POST: Preview or Execute Batch Import
 */
if ($method === 'POST') {
    $input = getJsonInput();
    $rows = $input['rows'] ?? [];
    $mode = $input['mode'] ?? 'insert_update'; // 'insert', 'update', 'insert_update'
    $clearBlankFields = !empty($input['clear_blank_fields']);
    $recalcTaxes = !empty($input['recalc_taxes']);
    $adminUser = $input['admin_user'] ?? $input['user'] ?? 'Administrator';
    $fileName = $input['file_name'] ?? $input['filename'] ?? ('upload_' . date('Ymd_His') . '.xlsx');
    $batchIdParam = $input['batch_id'] ?? null;

    if (!is_array($rows) || empty($rows)) {
        errorResponse('No rows supplied in upload payload', 400);
    }

    // Cache existing records by bill_no, invoice_no, and id for high-speed matching
    $stmtAll = $pdo->query("SELECT * FROM sales_invoices");
    $existingRows = $stmtAll->fetchAll();

    $byId = [];
    $byBillNo = [];
    $byInvNo = [];
    foreach ($existingRows as $er) {
        $byId[(string)$er['id']] = $er;
        if (!empty($er['bill_no'])) $byBillNo[strtoupper(trim($er['bill_no']))] = $er;
        if (!empty($er['invoice_no'])) $byInvNo[strtoupper(trim($er['invoice_no']))] = $er;
    }

    $toInsert = [];
    $toUpdate = [];
    $unchanged = [];
    $invalid = [];

    $seenKeys = []; // To detect in-file duplicates

    foreach ($rows as $idx => $r) {
        $rowNum = $idx + 2; // 1-based + 1 for header
        $norm = normalizeRow($r);

        // Validation: Required fields
        if (empty($norm['party_name'])) {
            $invalid[] = ['row' => $rowNum, 'reason' => 'Customer / Party Name is blank', 'data' => $norm];
            continue;
        }
        if (empty($norm['item_name'])) {
            $invalid[] = ['row' => $rowNum, 'reason' => 'Product / Item Name is blank', 'data' => $norm];
            continue;
        }
        if ($norm['qty'] <= 0) {
            $invalid[] = ['row' => $rowNum, 'reason' => 'Quantity must be greater than zero', 'data' => $norm];
            continue;
        }
        if ($norm['rate'] < 0) {
            $invalid[] = ['row' => $rowNum, 'reason' => 'Rate cannot be negative', 'data' => $norm];
            continue;
        }

        // Recalculate totals if requested
        if ($recalcTaxes) {
            $computedSubtotal = $norm['qty'] * $norm['rate'];
            // standard 5% FMCG tax rule if tax wasn't specified
            if ($norm['tax_amount'] <= 0) {
                $norm['tax_amount'] = round($computedSubtotal * 0.05, 2);
            }
            $norm['amount'] = round($computedSubtotal + $norm['tax_amount'], 2);
        }

        // Ensure bill_no and invoice_no are unified to identical identifier
        if (empty($norm['invoice_no']) && !empty($norm['bill_no'])) {
            $norm['invoice_no'] = $norm['bill_no'];
        }
        if (empty($norm['bill_no']) && !empty($norm['invoice_no'])) {
            $norm['bill_no'] = $norm['invoice_no'];
        }

        // Check for in-file duplicate keys
        $uniqueKey = '';
        if (!empty($norm['bill_no'])) $uniqueKey = 'bill:' . strtoupper($norm['bill_no']);
        elseif (!empty($norm['invoice_no'])) $uniqueKey = 'bill:' . strtoupper($norm['invoice_no']);
        elseif (!empty($norm['id'])) $uniqueKey = 'id:' . $norm['id'];

        if ($uniqueKey) {
            if (isset($seenKeys[$uniqueKey])) {
                $invalid[] = [
                    'row' => $rowNum,
                    'reason' => "Duplicate unique identifier in uploaded file ({$uniqueKey}). Repeated identifier flagged for safety.",
                    'data' => $norm
                ];
                continue;
            }
            $seenKeys[$uniqueKey] = $rowNum;
        }

        // Find existing match
        $matched = null;
        if (!empty($norm['id']) && isset($byId[(string)$norm['id']])) {
            $matched = $byId[(string)$norm['id']];
        } elseif (!empty($norm['bill_no']) && isset($byBillNo[strtoupper($norm['bill_no'])])) {
            $matched = $byBillNo[strtoupper($norm['bill_no'])];
        } elseif (!empty($norm['invoice_no']) && isset($byInvNo[strtoupper($norm['invoice_no'])])) {
            $matched = $byInvNo[strtoupper($norm['invoice_no'])];
        }

        if ($matched) {
            // Existing record matched
            if ($mode === 'insert') {
                // In insert-only mode, skip existing
                $unchanged[] = ['row' => $rowNum, 'status' => 'Skipped (Insert Only mode)', 'existing' => $matched, 'new' => $norm];
                continue;
            }

            // Check if values actually changed
            $changes = [];
            $fieldsToCompare = ['party_name', 'item_name', 'brand', 'category', 'route', 'city', 'qty', 'rate', 'mrp', 'amount', 'tax_amount', 'payment_status', 'notes'];
            foreach ($fieldsToCompare as $f) {
                $oldVal = $matched[$f] ?? '';
                $newVal = $norm[$f] ?? '';
                // Numeric comparison
                if (in_array($f, ['qty', 'rate', 'mrp', 'amount', 'tax_amount'])) {
                    if (abs((float)$oldVal - (float)$newVal) > 0.001) {
                        $changes[$f] = ['old' => (float)$oldVal, 'new' => (float)$newVal];
                    }
                } else {
                    if (strcasecmp(trim((string)$oldVal), trim((string)$newVal)) !== 0) {
                        if ($newVal === '' && !$clearBlankFields) {
                            // Do not erase existing data with blank column unless clearBlankFields is true
                            continue;
                        }
                        $changes[$f] = ['old' => $oldVal, 'new' => $newVal];
                    }
                }
            }

            if (empty($changes)) {
                $unchanged[] = ['row' => $rowNum, 'status' => 'Identical (No Changes)', 'existing' => $matched, 'new' => $norm];
            } else {
                $toUpdate[] = [
                    'row' => $rowNum,
                    'id' => $matched['id'],
                    'bill_no' => $matched['bill_no'],
                    'invoice_no' => $matched['invoice_no'],
                    'changes' => $changes,
                    'existing' => $matched,
                    'data' => $norm
                ];
            }

        } else {
            // No existing record found
            if ($mode === 'update') {
                $invalid[] = [
                    'row' => $rowNum,
                    'reason' => 'Record not found in database (Update Existing Only mode is active)',
                    'data' => $norm
                ];
                continue;
            }

            $toInsert[] = ['row' => $rowNum, 'data' => $norm];
        }
    }

    /**
     * ACTION: PREVIEW ONLY
     */
    if ($action === 'preview') {
        $previewRows = [];
        foreach (array_slice($toInsert, 0, 100) as $ti) {
            $previewRows[] = [
                'action' => 'insert',
                'bill_no' => $ti['data']['bill_no'] ?? '',
                'invoice_no' => $ti['data']['invoice_no'] ?? '',
                'party_name' => $ti['data']['party_name'] ?? '',
                'invoice_date' => $ti['data']['date'] ?? '',
                'total_amount' => $ti['data']['amount'] ?? 0,
                'status' => $ti['data']['payment_status'] ?? 'Paid',
                'notes' => 'New Bill to be created'
            ];
        }
        foreach (array_slice($toUpdate, 0, 100) as $tu) {
            $changeList = [];
            foreach (($tu['changes'] ?? []) as $f => $cv) {
                $changeList[] = "{$f}: " . ($cv['old'] ?? '') . " → " . ($cv['new'] ?? '');
            }
            $previewRows[] = [
                'action' => 'update',
                'bill_no' => $tu['bill_no'] ?? '',
                'invoice_no' => $tu['invoice_no'] ?? '',
                'party_name' => $tu['data']['party_name'] ?? ($tu['existing']['party_name'] ?? ''),
                'invoice_date' => $tu['data']['date'] ?? ($tu['existing']['invoice_date'] ?? ''),
                'total_amount' => $tu['data']['amount'] ?? ($tu['existing']['amount'] ?? 0),
                'status' => $tu['data']['payment_status'] ?? ($tu['existing']['payment_status'] ?? 'Paid'),
                'notes' => implode(', ', $changeList) ?: 'Updated fields'
            ];
        }
        foreach (array_slice($unchanged, 0, 50) as $unc) {
            $previewRows[] = [
                'action' => 'unchanged',
                'bill_no' => $unc['existing']['bill_no'] ?? '',
                'invoice_no' => $unc['existing']['invoice_no'] ?? '',
                'party_name' => $unc['existing']['party_name'] ?? '',
                'invoice_date' => $unc['existing']['invoice_date'] ?? '',
                'total_amount' => $unc['existing']['amount'] ?? 0,
                'status' => $unc['existing']['payment_status'] ?? 'Paid',
                'notes' => 'Identical record already in database'
            ];
        }

        $invalidFormatted = [];
        foreach ($invalid as $inv) {
            $invalidFormatted[] = [
                'row_num' => $inv['row'] ?? '-',
                'identifier' => ($inv['data']['bill_no'] ?? '') ?: (($inv['data']['invoice_no'] ?? '') ?: ($inv['data']['id'] ?? '')),
                'party_name' => $inv['data']['party_name'] ?? '-',
                'reason' => $inv['reason'] ?? 'Validation failure'
            ];
        }

        jsonResponse([
            'success' => true,
            'summary' => [
                'total_rows' => count($rows),
                'total' => count($rows),
                'new_count' => count($toInsert),
                'to_insert' => count($toInsert),
                'update_count' => count($toUpdate),
                'to_update' => count($toUpdate),
                'unchanged_count' => count($unchanged),
                'unchanged' => count($unchanged),
                'invalid_count' => count($invalid),
                'failed' => count($invalid),
                'mode' => $mode
            ],
            'new_records' => array_slice($toInsert, 0, 100),
            'update_records' => array_slice($toUpdate, 0, 100),
            'unchanged_records' => array_slice($unchanged, 0, 50),
            'invalid_records' => $invalid,
            'invalid_rows' => $invalidFormatted,
            'preview_rows' => $previewRows
        ]);
    }

    /**
     * ACTION: EXECUTE IMPORT TRANSACTION
     */
    if ($action === 'execute') {
        $pdo->beginTransaction();
        $batchId = $batchIdParam ?: ('BATCH-' . date('Ymd-His') . '-' . substr(uniqid(), -4));

        $insertedCount = 0;
        $updatedCount = 0;

        try {
            // Prepared statements for insertion
            $stmtInsert = $pdo->prepare("INSERT INTO sales_invoices (
                bill_no, invoice_no, invoice_date, party_name, party_contact, item_name, 
                brand, category, route, city, qty, unit, rate, mrp, amount, tax_amount, 
                subtotal, payment_status, sales_person, so_id, import_batch_id, notes
            ) VALUES (
                :bill, :inv, :date, :party, :contact, :item, 
                :brand, :cat, :route, :city, :qty, :unit, :rate, :mrp, :amount, :tax, 
                :subtotal, :pay_status, :sp, :so_id, :batch_id, :notes
            )");

            // Auto party registration statement
            $isSqlite = Database::getDriver() === 'sqlite';
            $sqlParty = $isSqlite
                ? "INSERT OR REPLACE INTO parties (id, name, phone, route, city, category, credit_limit, outstanding)
                    VALUES (:id, :name, :phone, :route, :city, 'Retail Kirana', 50000.00, 0.00)"
                : "INSERT INTO parties (id, name, phone, route, city, category, credit_limit, outstanding)
                    VALUES (:id, :name, :phone, :route, :city, 'Retail Kirana', 50000.00, 0.00)
                    ON DUPLICATE KEY UPDATE route=VALUES(route), city=VALUES(city)";
            $stmtParty = $pdo->prepare($sqlParty);

            // Auto stock registration statement
            $sqlStock = $isSqlite
                ? "INSERT OR IGNORE INTO stock (code, name, brand, category, current_stock, unit, rate, mrp, min_stock)
                    VALUES (:code, :name, :brand, :cat, 100.00, :unit, :rate, :mrp, 20.00)"
                : "INSERT INTO stock (code, name, brand, category, current_stock, unit, rate, mrp, min_stock)
                    VALUES (:code, :name, :brand, :cat, 100.00, :unit, :rate, :mrp, 20.00)
                    ON DUPLICATE KEY UPDATE rate=VALUES(rate), mrp=VALUES(mrp)";
            $stmtStock = $pdo->prepare($sqlStock);

            // Auto outstanding invoices statement
            $sqlOut = $isSqlite
                ? "INSERT OR REPLACE INTO outstanding_invoices (bill_no, invoice_date, party_name, route, phone, total_amount, balance_amount, due_days, age_bucket, sales_person)
                    VALUES (:bill, :date, :party, :route, :phone, :total, :bal, :days, :bucket, :sp)"
                : "INSERT INTO outstanding_invoices (bill_no, invoice_date, party_name, route, phone, total_amount, balance_amount, due_days, age_bucket, sales_person)
                    VALUES (:bill, :date, :party, :route, :phone, :total, :bal, :days, :bucket, :sp)
                    ON DUPLICATE KEY UPDATE balance_amount=VALUES(balance_amount), due_days=VALUES(due_days)";
            $stmtOut = $pdo->prepare($sqlOut);
            $stmtOutDel = $pdo->prepare("DELETE FROM outstanding_invoices WHERE bill_no = :bill");

            // Audit log statement
            $stmtAudit = $pdo->prepare("INSERT INTO audit_logs (action, entity_type, entity_id, old_values, new_values, performed_by, batch_id) VALUES (:act, :ent_type, :ent_id, :old, :new, :by, :batch)");

            // Process NEW Records
            foreach ($toInsert as $item) {
                $d = $item['data'];
                $date = $d['date'] ?: date('Y-m-d');

                // Generate Bill No & Invoice No if missing
                $bno = !empty($d['bill_no']) ? $d['bill_no'] : NumberGenerator::getNext('bill', $pdo, $date);
                $ino = !empty($d['invoice_no']) ? $d['invoice_no'] : NumberGenerator::getNext('invoice', $pdo, $date);

                $taxAmt = (float)$d['tax_amount'];
                $subtotal = (float)$d['amount'] - $taxAmt;

                $stmtInsert->execute([
                    ':bill' => $bno,
                    ':inv' => $ino,
                    ':date' => $date,
                    ':party' => $d['party_name'],
                    ':contact' => $d['party_contact'],
                    ':item' => $d['item_name'],
                    ':brand' => $d['brand'],
                    ':cat' => $d['category'],
                    ':route' => $d['route'],
                    ':city' => $d['city'],
                    ':qty' => (float)$d['qty'],
                    ':unit' => $d['unit'],
                    ':rate' => (float)$d['rate'],
                    ':mrp' => (float)$d['mrp'],
                    ':amount' => (float)$d['amount'],
                    ':tax' => $taxAmt,
                    ':subtotal' => $subtotal,
                    ':pay_status' => $d['payment_status'],
                    ':sp' => $d['sales_person'],
                    ':so_id' => null,
                    ':batch_id' => $batchId,
                    ':notes' => $d['notes']
                ]);

                $newRecId = $pdo->lastInsertId();

                // Register party
                $pId = !empty($d['party_id']) ? $d['party_id'] : ('P' . substr(md5($d['party_name']), 0, 6));
                $stmtParty->execute([
                    ':id' => $pId,
                    ':name' => $d['party_name'],
                    ':phone' => $d['party_contact'],
                    ':route' => $d['route'],
                    ':city' => $d['city']
                ]);

                // Register product SKU in stock catalog if not present
                $sCode = !empty($d['code']) ? $d['code'] : ('SKU-' . substr(md5($d['item_name']), 0, 6));
                $stmtStock->execute([
                    ':code' => $sCode,
                    ':name' => $d['item_name'],
                    ':brand' => $d['brand'] ?: 'General',
                    ':cat' => $d['category'] ?: 'FMCG',
                    ':unit' => $d['unit'] ?: 'Pcs',
                    ':rate' => (float)$d['rate'],
                    ':mrp' => (float)$d['mrp']
                ]);

                // Manage outstanding unpaid ledger
                if (strcasecmp($d['payment_status'], 'Unpaid') === 0) {
                    $nowDt = new DateTime();
                    $invDt = new DateTime($date);
                    $diffDays = max(0, $nowDt->diff($invDt)->days);
                    $bucket = $diffDays > 60 ? '60+ Days' : ($diffDays > 30 ? '30-60 Days' : '0-30 Days');
                    $stmtOut->execute([
                        ':bill' => $bno,
                        ':date' => $date,
                        ':party' => $d['party_name'],
                        ':route' => $d['route'],
                        ':phone' => $d['party_contact'],
                        ':total' => (float)$d['amount'],
                        ':bal' => (float)$d['amount'],
                        ':days' => $diffDays,
                        ':bucket' => $bucket,
                        ':sp' => $d['sales_person']
                    ]);
                }

                // Audit log
                $stmtAudit->execute([
                    ':act' => 'bulk_insert_bill',
                    ':ent_type' => 'sales_invoices',
                    ':ent_id' => (string)$newRecId,
                    ':old' => null,
                    ':new' => json_encode(['bill_no' => $bno, 'invoice_no' => $ino, 'amount' => $d['amount']]),
                    ':by' => $adminUser,
                    ':batch' => $batchId
                ]);

                $insertedCount++;
            }

            // Process UPDATES
            $stmtUpdate = $pdo->prepare("UPDATE sales_invoices SET
                party_name = :party,
                party_contact = :contact,
                item_name = :item,
                brand = :brand,
                category = :cat,
                route = :route,
                city = :city,
                qty = :qty,
                rate = :rate,
                mrp = :mrp,
                amount = :amount,
                tax_amount = :tax,
                subtotal = :subtotal,
                payment_status = :pay_status,
                notes = :notes,
                import_batch_id = :batch_id
                WHERE id = :id");

            foreach ($toUpdate as $item) {
                $ex = $item['existing'];
                $d = $item['data'];

                $qty = (float)$d['qty'];
                $rate = (float)$d['rate'];
                $mrp = (float)$d['mrp'];
                $amount = (float)$d['amount'];
                $tax = (float)$d['tax_amount'];
                $subtotal = $amount - $tax;

                $partyName = (!empty($d['party_name']) || $clearBlankFields) ? $d['party_name'] : $ex['party_name'];
                $contact = (!empty($d['party_contact']) || $clearBlankFields) ? $d['party_contact'] : $ex['party_contact'];
                $itemName = (!empty($d['item_name']) || $clearBlankFields) ? $d['item_name'] : $ex['item_name'];
                $brand = (!empty($d['brand']) || $clearBlankFields) ? $d['brand'] : $ex['brand'];
                $category = (!empty($d['category']) || $clearBlankFields) ? $d['category'] : $ex['category'];
                $route = (!empty($d['route']) || $clearBlankFields) ? $d['route'] : $ex['route'];
                $city = (!empty($d['city']) || $clearBlankFields) ? $d['city'] : $ex['city'];
                $payStatus = (!empty($d['payment_status']) || $clearBlankFields) ? $d['payment_status'] : $ex['payment_status'];
                $notes = (!empty($d['notes']) || $clearBlankFields) ? $d['notes'] : $ex['notes'];

                $stmtUpdate->execute([
                    ':party' => $partyName,
                    ':contact' => $contact,
                    ':item' => $itemName,
                    ':brand' => $brand,
                    ':cat' => $category,
                    ':route' => $route,
                    ':city' => $city,
                    ':qty' => $qty,
                    ':rate' => $rate,
                    ':mrp' => $mrp,
                    ':amount' => $amount,
                    ':tax' => $tax,
                    ':subtotal' => $subtotal,
                    ':pay_status' => $payStatus,
                    ':notes' => $notes,
                    ':batch_id' => $batchId,
                    ':id' => $ex['id']
                ]);

                // Sync outstanding status on update
                $bno = $ex['bill_no'];
                if (strcasecmp($payStatus, 'Unpaid') === 0) {
                    $nowDt = new DateTime();
                    $invDt = new DateTime($ex['invoice_date']);
                    $diffDays = max(0, $nowDt->diff($invDt)->days);
                    $bucket = $diffDays > 60 ? '60+ Days' : ($diffDays > 30 ? '30-60 Days' : '0-30 Days');
                    $stmtOut->execute([
                        ':bill' => $bno,
                        ':date' => $ex['invoice_date'],
                        ':party' => $partyName,
                        ':route' => $route,
                        ':phone' => $contact,
                        ':total' => $amount,
                        ':bal' => $amount,
                        ':days' => $diffDays,
                        ':bucket' => $bucket,
                        ':sp' => $ex['sales_person'] ?? 'Admin'
                    ]);
                } else {
                    $stmtOutDel->execute([':bill' => $bno]);
                }

                // Audit log
                $stmtAudit->execute([
                    ':act' => 'bulk_update_bill',
                    ':ent_type' => 'sales_invoices',
                    ':ent_id' => (string)$ex['id'],
                    ':old' => json_encode($item['changes']),
                    ':new' => json_encode(['amount' => $amount, 'qty' => $qty]),
                    ':by' => $adminUser,
                    ':batch' => $batchId
                ]);

                $updatedCount++;
            }

            // Record batch in import_batches
            $stmtBatch = $pdo->prepare("INSERT INTO import_batches (
                id, batch_type, file_name, uploaded_by, mode, total_rows, 
                inserted_rows, updated_rows, unchanged_rows, failed_rows, status, error_summary
            ) VALUES (
                :id, 'bills', :file, :user, :mode, :tot, 
                :ins, :upd, :unc, :fail, :st, :err
            )");

            $statusText = count($invalid) > 0 ? (count($invalid) === count($rows) ? 'Failed' : 'Partial') : 'Success';
            $errorSummary = count($invalid) > 0 ? (count($invalid) . " rows skipped due to validation errors") : null;

            $stmtBatch->execute([
                ':id' => $batchId,
                ':file' => $fileName,
                ':user' => $adminUser,
                ':mode' => $mode,
                ':tot' => count($rows),
                ':ins' => $insertedCount,
                ':upd' => $updatedCount,
                ':unc' => count($unchanged),
                ':fail' => count($invalid),
                ':st' => $statusText,
                ':err' => $errorSummary
            ]);

            $pdo->commit();

            jsonResponse([
                'success' => true,
                'batch_id' => $batchId,
                'status' => $statusText,
                'message' => "Successfully processed Excel import: {$insertedCount} bills inserted, {$updatedCount} bills updated, " . count($unchanged) . " unchanged, " . count($invalid) . " failed.",
                'counts' => [
                    'inserted' => $insertedCount,
                    'updated' => $updatedCount,
                    'unchanged' => count($unchanged),
                    'failed' => count($invalid)
                ],
                'summary' => [
                    'total_rows' => count($rows),
                    'inserted' => $insertedCount,
                    'updated' => $updatedCount,
                    'unchanged' => count($unchanged),
                    'failed' => count($invalid)
                ],
                'invalid_rows' => $invalid
            ], 201);

        } catch (Exception $e) {
            $pdo->rollBack();
            errorResponse("Batch transaction failed and was safely rolled back: " . $e->getMessage(), 500);
        }
    }
}
