<?php
/**
 * ==========================================================================
 * DS ENTERPRISES — DISPATCH CHALLAN & VAN LOADING SHEET REST API
 * File: backend/api/dispatch.php
 * ==========================================================================
 */

require_once __DIR__ . '/../config/db.php';

$pdo = Database::getConnection();
if (!$pdo) {
    errorResponse("Database connection unavailable", 500);
}

$action = $_GET['action'] ?? 'loading_sheet';

// 1. Dispatch Challan Data
if ($action === 'challan') {
    $orderId = $_GET['order_id'] ?? '';
    if (empty($orderId)) {
        errorResponse('order_id required for Challan', 400);
    }

    $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = :id");
    $stmt->execute([':id' => $orderId]);
    $order = $stmt->fetch();

    if (!$order) {
        errorResponse('Order not found', 404);
    }

    $stmtItems = $pdo->prepare("SELECT * FROM order_items WHERE order_id = :id");
    $stmtItems->execute([':id' => $orderId]);
    $order['items'] = $stmtItems->fetchAll();

    jsonResponse([
        'success' => true,
        'order' => $order
    ]);
}

// 2. Van / Tempo Loading Sheet
if ($action === 'loading_sheet') {
    $where = ["o.status IN ('Approved', 'Dispatched')"];
    $params = [];

    if (!empty($_GET['route'])) {
        $where[] = "o.route = :route";
        $params[':route'] = $_GET['route'];
    }

    $sqlWhere = implode(" AND ", $where);
    $sql = "SELECT 
                oi.item_name,
                oi.brand,
                oi.unit,
                SUM(oi.qty) as total_qty,
                COUNT(DISTINCT o.id) as drop_count
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id
            WHERE {$sqlWhere}
            GROUP BY oi.item_name, oi.brand, oi.unit
            ORDER BY total_qty DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $manifest = $stmt->fetchAll();

    jsonResponse([
        'success' => true,
        'route' => $_GET['route'] ?? 'All Routes',
        'item_count' => count($manifest),
        'data' => $manifest
    ]);
}
