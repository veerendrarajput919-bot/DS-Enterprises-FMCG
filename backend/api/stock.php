<?php
/**
 * ==========================================================================
 * DS ENTERPRISES — WAREHOUSE STOCK & INVENTORY REST API
 * File: backend/api/stock.php
 * ==========================================================================
 */

require_once __DIR__ . '/../config/db.php';

$pdo = Database::getConnection();
if (!$pdo) {
    errorResponse("Database connection unavailable", 500);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $where = ["1=1"];
    $params = [];

    if (!empty($_GET['category'])) {
        $where[] = "category = :cat";
        $params[':cat'] = $_GET['category'];
    }

    if (!empty($_GET['brand'])) {
        $where[] = "brand = :brand";
        $params[':brand'] = $_GET['brand'];
    }

    if (!empty($_GET['low_stock'])) {
        $where[] = "current_stock <= min_stock";
    }

    if (!empty($_GET['search'])) {
        $where[] = "(name LIKE :search OR code LIKE :search OR brand LIKE :search)";
        $params[':search'] = '%' . $_GET['search'] . '%';
    }

    $sqlWhere = implode(" AND ", $where);
    $stmt = $pdo->prepare("SELECT * FROM stock WHERE {$sqlWhere} ORDER BY brand ASC, name ASC");
    $stmt->execute($params);
    $items = $stmt->fetchAll();

    $totalValuation = 0;
    $lowStockCount = 0;
    foreach ($items as $it) {
        $stock = (float)$it['current_stock'];
        $rate = (float)$it['rate'];
        $min = (float)$it['min_stock'];
        $totalValuation += ($stock * $rate);
        if ($stock <= $min) {
            $lowStockCount++;
        }
    }

    jsonResponse([
        'success' => true,
        'summary' => [
            'total_skus' => count($items),
            'total_valuation' => $totalValuation,
            'low_stock_count' => $lowStockCount
        ],
        'data' => $items
    ]);
}

if ($method === 'POST') {
    $input = getJsonInput();
    if (empty($input['code']) || empty($input['name'])) {
        errorResponse('SKU code and name required', 400);
    }

    $stmt = $pdo->prepare("INSERT INTO stock (code, name, brand, category, current_stock, unit, rate, mrp, min_stock)
        VALUES (:code, :name, :brand, :cat, :stock, :unit, :rate, :mrp, :min)
        ON DUPLICATE KEY UPDATE name=VALUES(name), brand=VALUES(brand), rate=VALUES(rate), mrp=VALUES(mrp)");

    $stmt->execute([
        ':code' => $input['code'],
        ':name' => $input['name'],
        ':brand' => $input['brand'] ?? 'Generic',
        ':cat' => $input['category'] ?? 'FMCG Goods',
        ':stock' => (float)($input['current_stock'] ?? 0),
        ':unit' => $input['unit'] ?? 'Pcs',
        ':rate' => (float)($input['rate'] ?? 0.00),
        ':mrp' => (float)($input['mrp'] ?? 0.00),
        ':min' => (float)($input['min_stock'] ?? 50)
    ]);

    jsonResponse([
        'success' => true,
        'message' => 'Product SKU saved successfully'
    ], 201);
}

if ($method === 'PUT') {
    $input = getJsonInput();
    $code = $_GET['code'] ?? $input['code'] ?? '';
    if (empty($code)) {
        errorResponse('SKU code is required for stock adjustment', 400);
    }

    if (!isset($input['current_stock']) && !isset($input['rate'])) {
        errorResponse('Provide current_stock or rate to update', 400);
    }

    $updates = [];
    $params = [':code' => $code];

    if (isset($input['current_stock'])) {
        $updates[] = "current_stock = :stock";
        $params[':stock'] = max(0, (float)$input['current_stock']);
    }
    if (isset($input['rate'])) {
        $updates[] = "rate = :rate";
        $params[':rate'] = (float)$input['rate'];
    }
    if (isset($input['mrp'])) {
        $updates[] = "mrp = :mrp";
        $params[':mrp'] = (float)$input['mrp'];
    }

    $sql = "UPDATE stock SET " . implode(", ", $updates) . " WHERE code = :code";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    jsonResponse([
        'success' => true,
        'message' => 'Stock updated successfully'
    ]);
}
