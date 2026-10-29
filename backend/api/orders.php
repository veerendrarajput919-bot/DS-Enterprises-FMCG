<?php
/**
 * ==========================================================================
 * DS ENTERPRISES — FIELD ORDERS & FULFILLMENT REST API (V5 ENHANCED)
 * File: backend/api/orders.php
 * Enhancements: 8-State Lifecycle, Cancellation by Customer & Company/Admin,
 * Mandatory Remarks, Stock Restoration/Deduction, Admin Notes, Order History
 * ==========================================================================
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/numbering.php';

$pdo = Database::getConnection();
if (!$pdo) {
    errorResponse("Database connection unavailable", 500);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'list';

/**
 * Valid Order Statuses (Requirement 3)
 */
const VALID_ORDER_STATUSES = [
    'Pending',
    'Submitted', // Backwards compatibility alias for Pending
    'Confirmed',
    'Processing',
    'Ready for Delivery',
    'Dispatched',
    'Delivered',
    'Cancelled by Customer',
    'Cancelled by Company/Admin'
];

/**
 * 1. GET Requests: List Orders or Fetch Order History Timeline
 */
if ($method === 'GET') {
    // 1A. Fetch Timeline / Audit History for a specific order
    if ($action === 'history') {
        $orderId = $_GET['order_id'] ?? $_GET['id'] ?? '';
        if (empty($orderId)) {
            errorResponse('order_id required to fetch order history', 400);
        }

        $stmt = $pdo->prepare("SELECT * FROM order_history WHERE order_id = :oid ORDER BY created_at ASC, id ASC");
        $stmt->execute([':oid' => $orderId]);
        $history = $stmt->fetchAll();

        // Also fetch current order record
        $stmtOrd = $pdo->prepare("SELECT * FROM orders WHERE id = :oid");
        $stmtOrd->execute([':oid' => $orderId]);
        $order = $stmtOrd->fetch();

        jsonResponse([
            'success' => true,
            'order_id' => $orderId,
            'order' => $order,
            'history' => $history
        ]);
    }

    // 1B. List Filtered Orders
    $where = ["1=1"];
    $params = [];

    // Status Filter
    if (!empty($_GET['status'])) {
        $st = $_GET['status'];
        if ($st === 'all_cancelled') {
            $where[] = "status IN ('Cancelled by Customer', 'Cancelled by Company/Admin', 'Cancelled')";
        } elseif ($st === 'Pending' || $st === 'Submitted') {
            $where[] = "status IN ('Pending', 'Submitted')";
        } else {
            $where[] = "status = :status";
            $params[':status'] = $st;
        }
    }

    // Cancellation Type Filter
    if (!empty($_GET['cancelled_by_type'])) {
        $where[] = "cancelled_by_type = :c_type";
        $params[':c_type'] = $_GET['cancelled_by_type'];
    }

    // Cancellation Reason Filter
    if (!empty($_GET['cancellation_reason'])) {
        $where[] = "cancellation_reason = :c_reason";
        $params[':c_reason'] = $_GET['cancellation_reason'];
    }

    // Date Range Presets
    $preset = $_GET['preset'] ?? $_GET['date_preset'] ?? '';
    $today = date('Y-m-d');
    if ($preset === 'today') {
        $where[] = "order_date = :dt_today";
        $params[':dt_today'] = $today;
    } elseif ($preset === 'yesterday') {
        $where[] = "order_date = :dt_yest";
        $params[':dt_yest'] = date('Y-m-d', strtotime('-1 day'));
    } elseif ($preset === '7days') {
        $where[] = "order_date >= :dt_7d";
        $params[':dt_7d'] = date('Y-m-d', strtotime('-7 days'));
    } elseif ($preset === 'this_month' || $preset === 'month') {
        $where[] = "order_date >= :dt_m";
        $params[':dt_m'] = date('Y-m-01');
    } elseif (!empty($_GET['from']) || !empty($_GET['to'])) {
        if (!empty($_GET['from'])) {
            $where[] = "order_date >= :from";
            $params[':from'] = $_GET['from'];
        }
        if (!empty($_GET['to'])) {
            $where[] = "order_date <= :to";
            $params[':to'] = $_GET['to'];
        }
    }

    if (!empty($_GET['route'])) {
        $where[] = "route = :route";
        $params[':route'] = $_GET['route'];
    }

    if (!empty($_GET['id'])) {
        $where[] = "id = :id";
        $params[':id'] = $_GET['id'];
    }

    if (!empty($_GET['party_id'])) {
        $where[] = "party_id = :party_id";
        $params[':party_id'] = $_GET['party_id'];
    }

    if (!empty($_GET['store_name'])) {
        $where[] = "store_name LIKE :store_name";
        $params[':store_name'] = '%' . $_GET['store_name'] . '%';
    }

    if (!empty($_GET['sales_person'])) {
        $where[] = "sales_person = :sp";
        $params[':sp'] = $_GET['sales_person'];
    }

    if (!empty($_GET['so_id'])) {
        $where[] = "so_id = :so_id";
        $params[':so_id'] = $_GET['so_id'];
    }

    if (!empty($_GET['min_amount'])) {
        $where[] = "total_amount >= :min_amt";
        $params[':min_amt'] = (float)$_GET['min_amount'];
    }

    if (!empty($_GET['max_amount'])) {
        $where[] = "total_amount <= :max_amt";
        $params[':max_amt'] = (float)$_GET['max_amount'];
    }

    if (!empty($_GET['payment_status'])) {
        $where[] = "payment_status = :payment_status";
        $params[':payment_status'] = $_GET['payment_status'];
    }

    if (!empty($_GET['search'])) {
        $where[] = "(id LIKE :search OR store_name LIKE :search OR sales_person LIKE :search OR cancellation_remarks LIKE :search OR cancellation_reason LIKE :search)";
        $params[':search'] = '%' . trim($_GET['search']) . '%';
    }

    $sqlWhere = implode(" AND ", $where);

    // Sorting
    $allowedSort = [
        'id' => 'id',
        'date' => 'order_datetime',
        'order_datetime' => 'order_datetime',
        'store_name' => 'store_name',
        'route' => 'route',
        'sales_person' => 'sales_person',
        'total_amount' => 'total_amount',
        'total_qty' => 'total_qty',
        'status' => 'status'
    ];
    $sortBy = $_GET['sort_by'] ?? 'order_datetime';
    $sortCol = $allowedSort[$sortBy] ?? 'order_datetime';
    $sortDir = (isset($_GET['sort_dir']) && strtolower($_GET['sort_dir']) === 'asc') ? 'ASC' : 'DESC';

    // Summary calculation
    $stmtSum = $pdo->prepare("SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(total_amount), 0) as total_val,
        COALESCE(SUM(total_qty), 0) as total_units,
        COALESCE(SUM(CASE WHEN status = 'Delivered' THEN total_amount ELSE 0 END), 0) as delivered_val,
        COUNT(CASE WHEN status = 'Delivered' THEN 1 END) as delivered_count,
        COUNT(CASE WHEN status = 'Cancelled by Customer' THEN 1 END) as cancel_cust_count,
        COALESCE(SUM(CASE WHEN status = 'Cancelled by Customer' THEN total_amount ELSE 0 END), 0) as cancel_cust_val,
        COUNT(CASE WHEN status = 'Cancelled by Company/Admin' THEN 1 END) as cancel_co_count,
        COALESCE(SUM(CASE WHEN status = 'Cancelled by Company/Admin' THEN total_amount ELSE 0 END), 0) as cancel_co_val
        FROM orders WHERE {$sqlWhere}");
    $stmtSum->execute($params);
    $sum = $stmtSum->fetch();

    // Pagination
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 500;
    $offset = ($page - 1) * $limit;

    $stmt = $pdo->prepare("SELECT * FROM orders WHERE {$sqlWhere} ORDER BY {$sortCol} {$sortDir}, id DESC LIMIT {$limit} OFFSET {$offset}");
    $stmt->execute($params);
    $orders = $stmt->fetchAll();

    // Fetch line items for each order
    $orderIds = array_column($orders, 'id');
    $itemsMap = [];
    if (!empty($orderIds)) {
        $inClause = implode(',', array_fill(0, count($orderIds), '?'));
        $stmtItems = $pdo->prepare("SELECT * FROM order_items WHERE order_id IN ({$inClause})");
        $stmtItems->execute($orderIds);
        foreach ($stmtItems->fetchAll() as $item) {
            $itemsMap[$item['order_id']][] = $item;
        }
    }

    foreach ($orders as &$ord) {
        $ord['items'] = $itemsMap[$ord['id']] ?? [];
    }

    jsonResponse([
        'success' => true,
        'count' => count($orders),
        'summary' => [
            'total_count' => (int)$sum['total_count'],
            'total_amount' => (float)$sum['total_val'],
            'total_units' => (float)$sum['total_units'],
            'delivered_amount' => (float)$sum['delivered_val'],
            'delivered_count' => (int)$sum['delivered_count'],
            'cancelled_by_customer_count' => (int)$sum['cancel_cust_count'],
            'cancelled_by_customer_amount' => (float)$sum['cancel_cust_val'],
            'cancelled_by_company_count' => (int)$sum['cancel_co_count'],
            'cancelled_by_company_amount' => (float)$sum['cancel_co_val']
        ],
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total_records' => (int)$sum['total_count'],
            'total_pages' => ceil(((int)$sum['total_count']) / $limit)
        ],
        'data' => $orders
    ]);
}

/**
 * 2. POST Requests: Punch New Field Order
 */
if ($method === 'POST') {
    $input = getJsonInput();
    $subAction = $_GET['action'] ?? $input['action'] ?? 'punch';

    // 2A. Cancel Order via POST
    if ($subAction === 'cancel') {
        handleCancelOrder($pdo, $input);
    }

    // 2B. Reopen Order via POST
    if ($subAction === 'reopen') {
        handleReopenOrder($pdo, $input);
    }

    // 2C. Add Admin Note via POST
    if ($subAction === 'add_note') {
        handleAddAdminNote($pdo, $input);
    }

    // 2D. Regular Order Punching
    $storeName = trim($input['store_name'] ?? $input['storeName'] ?? '');
    if (empty($storeName) || empty($input['items']) || !is_array($input['items'])) {
        errorResponse('Store name and at least 1 line item required', 400);
    }

    $pdo->beginTransaction();
    try {
        $orderDate = $input['date'] ?? date('Y-m-d');
        // Generate atomic unique order and unified invoice/bill number
        $orderId = !empty($input['id']) ? $input['id'] : NumberGenerator::getNext('order', $pdo, $orderDate);
        $invoiceNo = !empty($input['invoice_no']) ? $input['invoice_no'] : (!empty($input['invoiceNo']) ? $input['invoiceNo'] : (!empty($input['bill_no']) ? $input['bill_no'] : NumberGenerator::getNext('invoice', $pdo, $orderDate)));
        $billNo = $invoiceNo; // Unified single standard identifier (Invoice = Bill)
        $now = date('Y-m-d H:i:s');

        $totalAmt = 0;
        $totalQty = 0;
        foreach ($input['items'] as $it) {
            $q = (float)($it['qty'] ?? 1);
            $p = (float)($it['price'] ?? 0);
            $totalQty += $q;
            $totalAmt += ($q * $p);
        }

        $initialStatus = 'Pending'; // Requirement 3

        $stmtOrder = $pdo->prepare("INSERT INTO orders (
            id, bill_no, invoice_no, order_date, order_datetime, store_name, party_id, location, city, 
            route, category, contact_person, contact_phone, sales_person, so_id, 
            total_amount, total_qty, status, payment_status
        ) VALUES (
            :id, :bill_no, :invoice_no, :date, :datetime, :store, :party_id, :loc, :city, 
            :route, :cat, :contact, :phone, :sp, :so_id, 
            :total, :qty, :status, :payment
        )");

        $stmtOrder->execute([
            ':id' => $orderId,
            ':bill_no' => $billNo,
            ':invoice_no' => $invoiceNo,
            ':date' => $orderDate,
            ':datetime' => $input['dateTime'] ?? $now,
            ':store' => $storeName,
            ':party_id' => $input['party_id'] ?? null,
            ':loc' => $input['location'] ?? '',
            ':city' => $input['city'] ?? 'Kanpur',
            ':route' => $input['route'] ?? 'General Route',
            ':cat' => $input['category'] ?? 'Retail Kirana',
            ':contact' => $input['contact_person'] ?? $input['givenName'] ?? '',
            ':phone' => $input['contact_phone'] ?? $input['givenContact'] ?? '',
            ':sp' => $input['sales_person'] ?? $input['salesPerson'] ?? 'Field Executive',
            ':so_id' => $input['so_id'] ?? $input['soId'] ?? null,
            ':total' => (float)($input['total'] ?? $totalAmt),
            ':qty' => (float)($input['qty'] ?? $totalQty),
            ':status' => $initialStatus,
            ':payment' => 'Unpaid'
        ]);

        $stmtItem = $pdo->prepare("INSERT INTO order_items (order_id, item_code, item_name, brand, qty, unit, price, total)
            VALUES (:oid, :code, :name, :brand, :qty, :unit, :price, :total)");

        // Deduct warehouse inventory stock
        $deductSql = ($driver === 'sqlite')
            ? "UPDATE stock SET current_stock = MAX(0, current_stock - :qty) WHERE code = :code"
            : "UPDATE stock SET current_stock = GREATEST(0, current_stock - :qty) WHERE code = :code";
        $stmtDeductStock = $pdo->prepare($deductSql);

        foreach ($input['items'] as $it) {
            $q = (float)($it['qty'] ?? 1);
            $p = (float)($it['price'] ?? 0);
            $tot = (float)($it['total'] ?? ($q * $p));
            $code = $it['code'] ?? null;

            $stmtItem->execute([
                ':oid' => $orderId,
                ':code' => $code,
                ':name' => $it['name'] ?? 'Product',
                ':brand' => $it['brand'] ?? '',
                ':qty' => $q,
                ':unit' => $it['unit'] ?? 'Pcs',
                ':price' => $p,
                ':total' => $tot
            ]);

            if ($code) {
                $stmtDeductStock->execute([':qty' => $q, ':code' => $code]);
            }
        }

        // Record initial status in order_history
        $stmtHist = $pdo->prepare("INSERT INTO order_history (order_id, from_status, to_status, changed_by, user_id, action_type, remarks)
            VALUES (:oid, NULL, :to_st, :by, :uid, 'booked', 'Order booked by field sales officer')");
        $stmtHist->execute([
            ':oid' => $orderId,
            ':to_st' => $initialStatus,
            ':by' => $input['sales_person'] ?? 'Field Executive',
            ':uid' => $input['so_id'] ?? 'SO-USER'
        ]);

        $pdo->commit();

        jsonResponse([
            'success' => true,
            'order_id' => $orderId,
            'bill_no' => $invoiceNo,
            'invoice_no' => $invoiceNo,
            'status' => $initialStatus,
            'message' => "Order {$orderId} (Invoice / Bill: {$invoiceNo}) booked successfully and inventory deducted"
        ], 201);

    } catch (Exception $e) {
        $pdo->rollBack();
        errorResponse("Failed to punch order: " . $e->getMessage(), 500);
    }
}

/**
 * 3. PUT Requests: Status Updates, Cancellation & Reopening
 */
if ($method === 'PUT') {
    $input = getJsonInput();
    $subAction = $_GET['action'] ?? $input['action'] ?? 'update_status';

    if ($subAction === 'cancel') {
        handleCancelOrder($pdo, $input);
    }

    if ($subAction === 'reopen') {
        handleReopenOrder($pdo, $input);
    }

    if ($subAction === 'add_note') {
        handleAddAdminNote($pdo, $input);
    }

    // Standard Status Progression (Pending -> Confirmed -> Processing -> Ready for Delivery -> Dispatched -> Delivered)
    $id = $_GET['id'] ?? $input['id'] ?? '';
    $newStatus = $input['status'] ?? '';

    if (empty($id) || empty($newStatus)) {
        errorResponse('Order ID and new status required', 400);
    }

    if (!in_array($newStatus, VALID_ORDER_STATUSES)) {
        errorResponse('Invalid status. Allowed: ' . implode(', ', VALID_ORDER_STATUSES), 400);
    }

    // Fetch existing order
    $stmtCurrent = $pdo->prepare("SELECT * FROM orders WHERE id = :id");
    $stmtCurrent->execute([':id' => $id]);
    $current = $stmtCurrent->fetch();

    if (!$current) {
        errorResponse('Order not found', 404);
    }

    $currentStatus = $current['status'];

    // CRITICAL REQUIREMENT: Prevent cancelled orders from being dispatched or delivered without explicit admin reopen!
    $isCurrentlyCancelled = in_array($currentStatus, ['Cancelled by Customer', 'Cancelled by Company/Admin', 'Cancelled']);
    if ($isCurrentlyCancelled && !in_array($newStatus, ['Cancelled by Customer', 'Cancelled by Company/Admin'])) {
        errorResponse("Order {$id} is currently CANCELLED ({$currentStatus}). Cancelled orders cannot be moved to {$newStatus} directly. An authorized admin must explicitly Reopen the order first.", 403);
    }

    $paymentStatus = ($newStatus === 'Delivered') ? 'Paid' : $current['payment_status'];

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("UPDATE orders SET status = :status, payment_status = :pay WHERE id = :id");
        $stmt->execute([':status' => $newStatus, ':pay' => $paymentStatus, ':id' => $id]);

        // Record history log
        $stmtHist = $pdo->prepare("INSERT INTO order_history (order_id, from_status, to_status, changed_by, user_id, action_type, remarks)
            VALUES (:oid, :from_st, :to_st, :by, :uid, 'status_change', :rem)");
        $stmtHist->execute([
            ':oid' => $id,
            ':from_st' => $currentStatus,
            ':to_st' => $newStatus,
            ':by' => $input['changed_by'] ?? 'Admin',
            ':uid' => $input['user_id'] ?? 'ADMIN-1',
            ':rem' => $input['remarks'] ?? "Status updated from {$currentStatus} to {$newStatus}"
        ]);

        $pdo->commit();

        jsonResponse([
            'success' => true,
            'order_id' => $id,
            'previous_status' => $currentStatus,
            'new_status' => $newStatus,
            'message' => "Order {$id} status updated to {$newStatus}"
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        errorResponse("Failed to update status: " . $e->getMessage(), 500);
    }
}

/**
 * ──────────────────────────────────────────────────────────────────────────
 * ORDER CANCELLATION HANDLER (Requirement 3)
 * Records who cancelled (Customer vs Company/Admin), mandatory reasons/remarks,
 * user ID, timestamp, saves previous status, and restores warehouse stock.
 * ──────────────────────────────────────────────────────────────────────────
 */
function handleCancelOrder(PDO $pdo, array $input): void {
    $orderId = trim($input['id'] ?? $input['order_id'] ?? '');
    $cancelType = trim($input['cancelled_by_type'] ?? $input['cancel_type'] ?? '');
    $reason = trim($input['cancellation_reason'] ?? $input['reason'] ?? '');
    $remarks = trim($input['cancellation_remarks'] ?? $input['remarks'] ?? '');
    $user = trim($input['cancelled_by_user'] ?? $input['user_name'] ?? 'Administrator');
    $userId = trim($input['user_id'] ?? 'ADMIN');

    if (empty($orderId)) {
        errorResponse('Order ID is required for cancellation', 400);
    }

    // Validate Cancellation Type: Customer or Company/Admin
    $allowedTypes = ['Customer', 'Company/Admin', 'Company', 'Admin'];
    if (!in_array($cancelType, $allowedTypes)) {
        errorResponse("Cancellation type must be either 'Customer' or 'Company/Admin'", 400);
    }

    $standardType = ($cancelType === 'Customer') ? 'Customer' : 'Company/Admin';
    $targetStatus = ($standardType === 'Customer') ? 'Cancelled by Customer' : 'Cancelled by Company/Admin';

    // Mandatory cancellation reason & remarks
    if (empty($reason)) {
        errorResponse('Cancellation reason category is mandatory', 400);
    }
    if (empty($remarks) || strlen($remarks) < 3) {
        errorResponse('Mandatory cancellation remarks/notes are required (minimum 3 characters)', 400);
    }

    // Fetch existing order
    $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = :id");
    $stmt->execute([':id' => $orderId]);
    $order = $stmt->fetch();

    if (!$order) {
        errorResponse("Order {$orderId} not found", 404);
    }

    if (in_array($order['status'], ['Cancelled by Customer', 'Cancelled by Company/Admin'])) {
        errorResponse("Order {$orderId} is already cancelled ({$order['status']})", 400);
    }

    $previousStatus = $order['status'];
    $now = date('Y-m-d H:i:s');

    $pdo->beginTransaction();
    try {
        // 1. Update order status and cancellation details
        $stmtUpd = $pdo->prepare("UPDATE orders SET
            status = :st,
            previous_status = :prev_st,
            cancelled_by_type = :c_type,
            cancelled_by_user = :c_user,
            cancelled_at = :c_at,
            cancellation_reason = :reason,
            cancellation_remarks = :remarks
            WHERE id = :id");

        $stmtUpd->execute([
            ':st' => $targetStatus,
            ':prev_st' => $previousStatus,
            ':c_type' => $standardType,
            ':c_user' => "{$user} ({$userId})",
            ':c_at' => $now,
            ':reason' => $reason,
            ':remarks' => $remarks,
            ':id' => $orderId
        ]);

        // 2. Fetch order items to restore stock
        $stmtItems = $pdo->prepare("SELECT item_code, qty FROM order_items WHERE order_id = :id");
        $stmtItems->execute([':id' => $orderId]);
        $items = $stmtItems->fetchAll();

        // 3. Restore warehouse stock for each item
        $stmtRestore = $pdo->prepare("UPDATE stock SET current_stock = current_stock + :qty WHERE code = :code");
        $restoredItemsCount = 0;
        foreach ($items as $it) {
            if (!empty($it['item_code'])) {
                $stmtRestore->execute([
                    ':qty' => (float)$it['qty'],
                    ':code' => $it['item_code']
                ]);
                $restoredItemsCount++;
            }
        }

        // 4. Log in order_history
        $stmtHist = $pdo->prepare("INSERT INTO order_history (
            order_id, from_status, to_status, changed_by, user_id, action_type, reason, remarks
        ) VALUES (
            :oid, :from_st, :to_st, :by, :uid, 'cancellation', :reason, :rem
        )");
        $stmtHist->execute([
            ':oid' => $orderId,
            ':from_st' => $previousStatus,
            ':to_st' => $targetStatus,
            ':by' => $user,
            ':uid' => $userId,
            ':reason' => "Cancelled by {$standardType}: {$reason}",
            ':rem' => $remarks
        ]);

        // 5. Log in audit_logs
        $stmtAudit = $pdo->prepare("INSERT INTO audit_logs (action, entity_type, entity_id, old_values, new_values, performed_by) VALUES ('order_cancellation', 'orders', :id, :old, :new, :by)");
        $stmtAudit->execute([
            ':id' => $orderId,
            ':old' => json_encode(['status' => $previousStatus]),
            ':new' => json_encode([
                'status' => $targetStatus,
                'type' => $standardType,
                'reason' => $reason,
                'remarks' => $remarks
            ]),
            ':by' => "{$user} ({$userId})"
        ]);

        $pdo->commit();

        jsonResponse([
            'success' => true,
            'order_id' => $orderId,
            'previous_status' => $previousStatus,
            'new_status' => $targetStatus,
            'cancelled_by_type' => $standardType,
            'cancellation_reason' => $reason,
            'cancellation_remarks' => $remarks,
            'restored_items_count' => $restoredItemsCount,
            'message' => "Order {$orderId} has been successfully cancelled by {$standardType}. Stock has been automatically restored to warehouse."
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();
        errorResponse("Cancellation failed: " . $e->getMessage(), 500);
    }
}

/**
 * ──────────────────────────────────────────────────────────────────────────
 * REOPEN CANCELLED ORDER HANDLER (Requirement 3)
 * Allows authorized admins to reopen cancelled orders, re-deducting stock.
 * ──────────────────────────────────────────────────────────────────────────
 */
function handleReopenOrder(PDO $pdo, array $input): void {
    $orderId = trim($input['id'] ?? $input['order_id'] ?? '');
    $adminUser = trim($input['admin_user'] ?? $input['user_name'] ?? 'Admin');
    $adminId = trim($input['admin_id'] ?? $input['user_id'] ?? 'ADMIN-1');
    $remarks = trim($input['remarks'] ?? 'Reopened by authorized administrator');

    if (empty($orderId)) {
        errorResponse('Order ID required to reopen order', 400);
    }

    $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = :id");
    $stmt->execute([':id' => $orderId]);
    $order = $stmt->fetch();

    if (!$order) {
        errorResponse("Order {$orderId} not found", 404);
    }

    $currentStatus = $order['status'];
    if (!in_array($currentStatus, ['Cancelled by Customer', 'Cancelled by Company/Admin', 'Cancelled'])) {
        errorResponse("Only cancelled orders can be reopened. Order {$orderId} is currently {$currentStatus}.", 400);
    }

    // Determine target restored status (previous_status or Pending)
    $targetStatus = !empty($order['previous_status']) ? $order['previous_status'] : 'Pending';
    if (in_array($targetStatus, ['Cancelled by Customer', 'Cancelled by Company/Admin', 'Cancelled'])) {
        $targetStatus = 'Pending';
    }

    $now = date('Y-m-d H:i:s');

    $pdo->beginTransaction();
    try {
        // Re-deduct warehouse stock
        $stmtItems = $pdo->prepare("SELECT item_code, qty FROM order_items WHERE order_id = :id");
        $stmtItems->execute([':id' => $orderId]);
        $items = $stmtItems->fetchAll();

        $sqlDeduct = (Database::getDriver() === 'sqlite')
            ? "UPDATE stock SET current_stock = MAX(0, current_stock - :qty) WHERE code = :code"
            : "UPDATE stock SET current_stock = GREATEST(0, current_stock - :qty) WHERE code = :code";
        $stmtDeductStock = $pdo->prepare($sqlDeduct);
        foreach ($items as $it) {
            if (!empty($it['item_code'])) {
                $stmtDeductStock->execute([
                    ':qty' => (float)$it['qty'],
                    ':code' => $it['item_code']
                ]);
            }
        }

        // Update order
        $stmtUpd = $pdo->prepare("UPDATE orders SET
            status = :st,
            reopened_by = :r_by,
            reopened_at = :r_at
            WHERE id = :id");

        $stmtUpd->execute([
            ':st' => $targetStatus,
            ':r_by' => "{$adminUser} ({$adminId})",
            ':r_at' => $now,
            ':id' => $orderId
        ]);

        // History log
        $stmtHist = $pdo->prepare("INSERT INTO order_history (
            order_id, from_status, to_status, changed_by, user_id, action_type, remarks
        ) VALUES (
            :oid, :from_st, :to_st, :by, :uid, 'reopen', :rem
        )");
        $stmtHist->execute([
            ':oid' => $orderId,
            ':from_st' => $currentStatus,
            ':to_st' => $targetStatus,
            ':by' => $adminUser,
            ':uid' => $adminId,
            ':rem' => $remarks
        ]);

        $pdo->commit();

        jsonResponse([
            'success' => true,
            'order_id' => $orderId,
            'restored_status' => $targetStatus,
            'message' => "Order {$orderId} has been successfully reopened to status {$targetStatus} by {$adminUser}."
        ]);

    } catch (Exception $e) {
        $pdo->rollBack();
        errorResponse("Failed to reopen order: " . $e->getMessage(), 500);
    }
}

/**
 * ──────────────────────────────────────────────────────────────────────────
 * ADD ADMIN INTERNAL NOTES HANDLER (Requirement 3)
 * Allows authorized admins to append internal timestamped notes to an order.
 * ──────────────────────────────────────────────────────────────────────────
 */
function handleAddAdminNote(PDO $pdo, array $input): void {
    $orderId = trim($input['id'] ?? $input['order_id'] ?? '');
    $note = trim($input['note'] ?? $input['admin_notes'] ?? '');
    $adminUser = trim($input['admin_user'] ?? $input['user_name'] ?? 'Admin');

    if (empty($orderId) || empty($note)) {
        errorResponse('Order ID and note content required', 400);
    }

    $stmt = $pdo->prepare("SELECT admin_notes FROM orders WHERE id = :id");
    $stmt->execute([':id' => $orderId]);
    $order = $stmt->fetch();

    if (!$order) {
        errorResponse("Order {$orderId} not found", 404);
    }

    $timestamp = date('d-M-Y H:i');
    $formattedNote = "[{$timestamp} - {$adminUser}]: {$note}";
    $existingNotes = trim((string)$order['admin_notes']);
    $newNotes = $existingNotes ? ($existingNotes . "\n" . $formattedNote) : $formattedNote;

    $stmtUpd = $pdo->prepare("UPDATE orders SET admin_notes = :notes WHERE id = :id");
    $stmtUpd->execute([':notes' => $newNotes, ':id' => $orderId]);

    // History log
    $stmtHist = $pdo->prepare("INSERT INTO order_history (order_id, from_status, to_status, changed_by, action_type, remarks)
        VALUES (:oid, 'current', 'current', :by, 'admin_note', :rem)");
    $stmtHist->execute([
        ':oid' => $orderId,
        ':by' => $adminUser,
        ':rem' => "Internal note added: {$note}"
    ]);

    jsonResponse([
        'success' => true,
        'order_id' => $orderId,
        'admin_notes' => $newNotes,
        'message' => 'Admin internal note added successfully'
    ]);
}
