<?php
/**
 * ==========================================================================
 * DS ENTERPRISES — PARTIES & RETAIL OUTLETS REST API
 * File: backend/api/parties.php
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

    if (!empty($_GET['route'])) {
        $where[] = "route = :route";
        $params[':route'] = $_GET['route'];
    }

    if (!empty($_GET['search'])) {
        $where[] = "(name LIKE :search OR contact_person LIKE :search OR phone LIKE :search)";
        $params[':search'] = '%' . $_GET['search'] . '%';
    }

    $sqlWhere = implode(" AND ", $where);
    $stmt = $pdo->prepare("SELECT * FROM parties WHERE {$sqlWhere} ORDER BY route ASC, name ASC");
    $stmt->execute($params);
    $parties = $stmt->fetchAll();

    jsonResponse([
        'success' => true,
        'count' => count($parties),
        'data' => $parties
    ]);
}

if ($method === 'POST') {
    $input = getJsonInput();
    if (empty($input['name'])) {
        errorResponse('Store name is required', 400);
    }

    $id = $input['id'] ?? ('P' . str_pad((string)rand(1, 9999), 4, '0', STR_PAD_LEFT));
    $stmt = $pdo->prepare("INSERT INTO parties (id, name, contact_person, phone, route, address, city, category, credit_limit, outstanding)
        VALUES (:id, :name, :contact, :phone, :route, :address, :city, :cat, :credit, :out)
        ON DUPLICATE KEY UPDATE name=VALUES(name), contact_person=VALUES(contact_person), phone=VALUES(phone), route=VALUES(route)");

    $stmt->execute([
        ':id' => $id,
        ':name' => $input['name'],
        ':contact' => $input['contact_person'] ?? '',
        ':phone' => $input['phone'] ?? '',
        ':route' => $input['route'] ?? 'General Route',
        ':address' => $input['address'] ?? '',
        ':city' => $input['city'] ?? 'Kanpur',
        ':cat' => $input['category'] ?? 'Retail Kirana',
        ':credit' => (float)($input['credit_limit'] ?? 50000.00),
        ':out' => (float)($input['outstanding'] ?? 0.00)
    ]);

    jsonResponse([
        'success' => true,
        'id' => $id,
        'message' => 'Store registered successfully'
    ], 201);
}

if ($method === 'PUT') {
    $input = getJsonInput();
    $id = $_GET['id'] ?? $input['id'] ?? '';
    if (empty($id)) {
        errorResponse('Party ID required', 400);
    }

    $updates = [];
    $params = [':id' => $id];

    if (isset($input['outstanding'])) {
        $updates[] = "outstanding = :out";
        $params[':out'] = (float)$input['outstanding'];
    }
    if (isset($input['credit_limit'])) {
        $updates[] = "credit_limit = :credit";
        $params[':credit'] = (float)$input['credit_limit'];
    }
    if (isset($input['phone'])) {
        $updates[] = "phone = :phone";
        $params[':phone'] = $input['phone'];
    }

    if (empty($updates)) {
        errorResponse('No fields provided to update', 400);
    }

    $sql = "UPDATE parties SET " . implode(", ", $updates) . " WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    jsonResponse([
        'success' => true,
        'message' => 'Party record updated'
    ]);
}
