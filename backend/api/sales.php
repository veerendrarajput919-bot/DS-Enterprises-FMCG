<?php
/**
 * ==========================================================================
 * DS ENTERPRISES — SALES LEDGER & BILLING REST API
 * File: backend/api/sales.php
 * Enhancements: Automatic Bill/Invoice Numbers, Multi-Field Filtering,
 * Sorting, Server-Side Pagination, Permanent Identifier Protection
 * ==========================================================================
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/numbering.php';

$pdo = Database::getConnection();
if (!$pdo) {
    errorResponse("Database connection unavailable", 500);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $where = ["1=1"];
    $params = [];

    // Filter by Date Preset (PHP-calculated for cross-database compatibility)
    $preset = $_GET['preset'] ?? '';
    $today = date('Y-m-d');

    if ($preset === 'today') {
        $where[] = "invoice_date = :dt_today";
        $params[':dt_today'] = $today;
    } elseif ($preset === 'yesterday') {
        $where[] = "invoice_date = :dt_yest";
        $params[':dt_yest'] = date('Y-m-d', strtotime('-1 day'));
    } elseif ($preset === '7days') {
        $where[] = "invoice_date >= :dt_7d";
        $params[':dt_7d'] = date('Y-m-d', strtotime('-7 days'));
    } elseif ($preset === '30days') {
        $where[] = "invoice_date >= :dt_30d";
        $params[':dt_30d'] = date('Y-m-d', strtotime('-30 days'));
    } elseif ($preset === 'mtd' || $preset === 'month') {
        $where[] = "invoice_date >= :dt_mtd";
        $params[':dt_mtd'] = date('Y-m-01');
    } elseif ($preset === 'lastmonth') {
        $where[] = "invoice_date >= :dt_lm_start AND invoice_date <= :dt_lm_end";
        $params[':dt_lm_start'] = date('Y-m-01', strtotime('first day of last month'));
        $params[':dt_lm_end'] = date('Y-m-t', strtotime('last day of last month'));
    } elseif (!empty($_GET['from']) || !empty($_GET['to'])) {
        if (!empty($_GET['from'])) {
            $where[] = "invoice_date >= :from";
            $params[':from'] = $_GET['from'];
        }
        if (!empty($_GET['to'])) {
            $where[] = "invoice_date <= :to";
            $params[':to'] = $_GET['to'];
        }
    }

    if (!empty($_GET['route'])) {
        $where[] = "route = :route";
        $params[':route'] = $_GET['route'];
    }

    if (!empty($_GET['brand'])) {
        $where[] = "brand = :brand";
        $params[':brand'] = $_GET['brand'];
    }

    if (!empty($_GET['category'])) {
        $where[] = "category = :category";
        $params[':category'] = $_GET['category'];
    }

    if (!empty($_GET['city'])) {
        $where[] = "city = :city";
        $params[':city'] = $_GET['city'];
    }

    if (!empty($_GET['so'])) {
        $where[] = "sales_person = :so";
        $params[':so'] = $_GET['so'];
    }

    if (!empty($_GET['party_name'])) {
        $where[] = "party_name LIKE :party_name";
        $params[':party_name'] = '%' . $_GET['party_name'] . '%';
    }

    if (!empty($_GET['payment_status'])) {
        $where[] = "payment_status = :payment_status";
        $params[':payment_status'] = $_GET['payment_status'];
    }

    if (!empty($_GET['bill_no'])) {
        $where[] = "bill_no LIKE :bill_no";
        $params[':bill_no'] = '%' . $_GET['bill_no'] . '%';
    }

    if (!empty($_GET['invoice_no'])) {
        $where[] = "invoice_no LIKE :invoice_no";
        $params[':invoice_no'] = '%' . $_GET['invoice_no'] . '%';
    }

    if (!empty($_GET['min_amount'])) {
        $where[] = "amount >= :min_amt";
        $params[':min_amt'] = (float)$_GET['min_amount'];
    }

    if (!empty($_GET['max_amount'])) {
        $where[] = "amount <= :max_amt";
        $params[':max_amt'] = (float)$_GET['max_amount'];
    }

    if (!empty($_GET['import_batch_id'])) {
        $where[] = "import_batch_id = :batch_id";
        $params[':batch_id'] = $_GET['import_batch_id'];
    }

    if (!empty($_GET['search'])) {
        $where[] = "(party_name LIKE :search OR item_name LIKE :search OR invoice_no LIKE :search OR bill_no LIKE :search OR brand LIKE :search OR route LIKE :search)";
        $params[':search'] = '%' . trim($_GET['search']) . '%';
    }

    $sqlWhere = implode(" AND ", $where);

    // Sorting
    $allowedSortCols = [
        'id' => 'id',
        'date' => 'invoice_date',
        'invoice_date' => 'invoice_date',
        'invoice_no' => 'invoice_no',
        'bill_no' => 'bill_no',
        'party_name' => 'party_name',
        'item_name' => 'item_name',
        'brand' => 'brand',
        'amount' => 'amount',
        'qty' => 'qty'
    ];
    $sortBy = $_GET['sort_by'] ?? 'invoice_date';
    $sortCol = $allowedSortCols[$sortBy] ?? 'invoice_date';
    $sortDir = (isset($_GET['sort_dir']) && strtolower($_GET['sort_dir']) === 'asc') ? 'ASC' : 'DESC';

    // Total Count & Aggregates query
    $stmtAgg = $pdo->prepare("SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(SUM(qty), 0) as total_qty,
        COUNT(DISTINCT party_name) as outlet_count
        FROM sales_invoices WHERE {$sqlWhere}");
    $stmtAgg->execute($params);
    $agg = $stmtAgg->fetch();

    $totalRecords = (int)($agg['total_count'] ?? 0);
    $totalAmount = (float)($agg['total_amount'] ?? 0);
    $totalQty = (float)($agg['total_qty'] ?? 0);
    $outletCount = (int)($agg['outlet_count'] ?? 0);
    $aov = $totalRecords > 0 ? ($totalAmount / $totalRecords) : 0;

    // Pagination
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 500;
    if ($limit <= 0) $limit = 500;
    $offset = ($page - 1) * $limit;

    // Fetch records
    $stmt = $pdo->prepare("SELECT * FROM sales_invoices WHERE {$sqlWhere} ORDER BY {$sortCol} {$sortDir}, id DESC LIMIT {$limit} OFFSET {$offset}");
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    jsonResponse([
        'success' => true,
        'summary' => [
            'turnover' => $totalAmount,
            'total_qty' => $totalQty,
            'outlet_count' => $outletCount,
            'aov' => $aov,
            'total_records' => $totalRecords
        ],
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total_records' => $totalRecords,
            'total_pages' => ceil($totalRecords / $limit)
        ],
        'data' => $rows
    ]);
}

if ($method === 'POST') {
    $input = getJsonInput();
    if (empty($input['party_name']) || empty($input['item_name']) || !isset($input['amount'])) {
        errorResponse('Missing required fields (party_name, item_name, amount)', 400);
    }

    $date = $input['invoice_date'] ?? $input['date'] ?? date('Y-m-d');

    // Automatic Unified Invoice / Bill Number Generation (Unique & Permanent)
    $unifiedNo = !empty($input['invoice_no']) 
        ? trim($input['invoice_no']) 
        : (!empty($input['bill_no']) 
            ? trim($input['bill_no']) 
            : NumberGenerator::getNext('invoice', $pdo, $date));
    $billNo = $unifiedNo;
    $invNo = $unifiedNo;

    $qty = (float)($input['qty'] ?? 1);
    $rate = (float)($input['rate'] ?? 0);
    $amount = (float)($input['amount'] ?? ($qty * $rate));
    $tax = (float)($input['tax_amount'] ?? 0);
    $subtotal = (float)($input['subtotal'] ?? ($amount - $tax));

    $stmt = $pdo->prepare("INSERT INTO sales_invoices (
        bill_no, invoice_no, invoice_date, party_name, party_contact, item_name, 
        brand, category, route, city, qty, unit, rate, mrp, amount, tax_amount, 
        subtotal, payment_status, sales_person, so_id, import_batch_id, notes
    ) VALUES (
        :bill, :inv, :date, :party, :contact, :item, 
        :brand, :cat, :route, :city, :qty, :unit, :rate, :mrp, :amount, :tax, 
        :subtotal, :pay_status, :sp, :so_id, :batch_id, :notes
    )");

    $stmt->execute([
        ':bill' => $billNo,
        ':inv' => $invNo,
        ':date' => $date,
        ':party' => $input['party_name'],
        ':contact' => $input['party_contact'] ?? '',
        ':item' => $input['item_name'],
        ':brand' => $input['brand'] ?? 'General',
        ':cat' => $input['category'] ?? 'FMCG',
        ':route' => $input['route'] ?? 'General Route',
        ':city' => $input['city'] ?? 'Kanpur',
        ':qty' => $qty,
        ':unit' => $input['unit'] ?? 'Pcs',
        ':rate' => $rate,
        ':mrp' => (float)($input['mrp'] ?? $rate),
        ':amount' => $amount,
        ':tax' => $tax,
        ':subtotal' => $subtotal,
        ':pay_status' => $input['payment_status'] ?? 'Paid',
        ':sp' => $input['sales_person'] ?? 'Admin',
        ':so_id' => $input['so_id'] ?? null,
        ':batch_id' => $input['import_batch_id'] ?? null,
        ':notes' => $input['notes'] ?? null
    ]);

    $newId = $pdo->lastInsertId();

    // Log to audit_logs
    try {
        $stmtAudit = $pdo->prepare("INSERT INTO audit_logs (action, entity_type, entity_id, new_values, performed_by) VALUES ('create_invoice', 'sales_invoices', :id, :vals, :by)");
        $stmtAudit->execute([
            ':id' => (string)$newId,
            ':vals' => json_encode(['bill_no' => $billNo, 'invoice_no' => $invNo, 'amount' => $amount]),
            ':by' => $input['performed_by'] ?? 'Admin'
        ]);
    } catch (Exception $e) {}

    jsonResponse([
        'success' => true,
        'id' => $newId,
        'bill_no' => $billNo,
        'invoice_no' => $invNo,
        'message' => "Bill {$billNo} / Invoice {$invNo} recorded successfully"
    ], 201);
}

if ($method === 'PUT') {
    $input = getJsonInput();
    $id = $_GET['id'] ?? $input['id'] ?? null;
    $billNo = $input['bill_no'] ?? null;
    $invNo = $input['invoice_no'] ?? null;

    // Must identify existing record
    if (!$id && !$billNo && !$invNo) {
        errorResponse('Record ID, bill_no, or invoice_no required to update', 400);
    }

    // Find existing record
    if ($id) {
        $stmtFind = $pdo->prepare("SELECT * FROM sales_invoices WHERE id = :id");
        $stmtFind->execute([':id' => $id]);
    } elseif ($billNo) {
        $stmtFind = $pdo->prepare("SELECT * FROM sales_invoices WHERE bill_no = :bno");
        $stmtFind->execute([':bno' => $billNo]);
    } else {
        $stmtFind = $pdo->prepare("SELECT * FROM sales_invoices WHERE invoice_no = :ino");
        $stmtFind->execute([':ino' => $invNo]);
    }
    $existing = $stmtFind->fetch();

    if (!$existing) {
        errorResponse('Matching bill/invoice record not found for update', 404);
    }

    // DATA PROTECTION RULE: Preserve bill_no and invoice_no permanently!
    $permBillNo = $existing['bill_no'];
    $permInvNo = $existing['invoice_no'];

    $qty = isset($input['qty']) ? (float)$input['qty'] : (float)$existing['qty'];
    $rate = isset($input['rate']) ? (float)$input['rate'] : (float)$existing['rate'];
    $amount = isset($input['amount']) ? (float)$input['amount'] : ($qty * $rate);
    $tax = isset($input['tax_amount']) ? (float)$input['tax_amount'] : (float)$existing['tax_amount'];
    $subtotal = isset($input['subtotal']) ? (float)$input['subtotal'] : ($amount - $tax);

    $stmtUpd = $pdo->prepare("UPDATE sales_invoices SET
        party_name = :party,
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
        notes = :notes
        WHERE id = :id");

    $stmtUpd->execute([
        ':party' => $input['party_name'] ?? $existing['party_name'],
        ':item' => $input['item_name'] ?? $existing['item_name'],
        ':brand' => $input['brand'] ?? $existing['brand'],
        ':cat' => $input['category'] ?? $existing['category'],
        ':route' => $input['route'] ?? $existing['route'],
        ':city' => $input['city'] ?? $existing['city'],
        ':qty' => $qty,
        ':rate' => $rate,
        ':mrp' => isset($input['mrp']) ? (float)$input['mrp'] : (float)$existing['mrp'],
        ':amount' => $amount,
        ':tax' => $tax,
        ':subtotal' => $subtotal,
        ':pay_status' => $input['payment_status'] ?? $existing['payment_status'],
        ':notes' => $input['notes'] ?? $existing['notes'],
        ':id' => $existing['id']
    ]);

    // Audit log
    try {
        $stmtAudit = $pdo->prepare("INSERT INTO audit_logs (action, entity_type, entity_id, old_values, new_values, performed_by) VALUES ('update_invoice', 'sales_invoices', :id, :old, :new, :by)");
        $stmtAudit->execute([
            ':id' => (string)$existing['id'],
            ':old' => json_encode(['amount' => $existing['amount'], 'qty' => $existing['qty']]),
            ':new' => json_encode(['amount' => $amount, 'qty' => $qty]),
            ':by' => $input['performed_by'] ?? 'Admin'
        ]);
    } catch (Exception $e) {}

    jsonResponse([
        'success' => true,
        'id' => $existing['id'],
        'bill_no' => $permBillNo,
        'invoice_no' => $permInvNo,
        'message' => "Bill {$permBillNo} / Invoice {$permInvNo} updated successfully (Numbers permanently preserved)"
    ]);
}
