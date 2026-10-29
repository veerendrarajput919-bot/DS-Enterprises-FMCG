<?php
/**
 * ==========================================================================
 * DS ENTERPRISES — SALES OFFICERS MASTER REST API
 * File: backend/api/sales_officers.php
 * ==========================================================================
 */

require_once __DIR__ . '/../config/db.php';

$pdo = Database::getConnection();
if (!$pdo) {
    errorResponse("Database connection unavailable", 500);
}

$method = $_SERVER['REQUEST_METHOD'];

$driver = Database::getDriver();

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM sales_officers ORDER BY id ASC");
    $officers = $stmt->fetchAll();

    // Calculate MTD sales for each officer (compatible with both MySQL & SQLite)
    $firstDayOfMonth = date('Y-m-01');
    $stmtSales = $pdo->prepare("SELECT so_id, sales_person, SUM(amount) as mtd_sales 
        FROM sales_invoices 
        WHERE invoice_date >= :fdom 
        GROUP BY so_id, sales_person");
    $stmtSales->execute([':fdom' => $firstDayOfMonth]);
    $salesMap = [];
    foreach ($stmtSales->fetchAll() as $row) {
        if ($row['so_id']) $salesMap[$row['so_id']] = (float)$row['mtd_sales'];
        if ($row['sales_person']) $salesMap[$row['sales_person']] = (float)$row['mtd_sales'];
    }

    foreach ($officers as &$so) {
        $achieved = $salesMap[$so['id']] ?? $salesMap[$so['name']] ?? 0.00;
        $target = (float)$so['target'];
        $so['achieved'] = $achieved;
        $so['percentage'] = $target > 0 ? min(100, round(($achieved / $target) * 100, 1)) : 0;
        if (!empty($so['permissions']) && is_string($so['permissions'])) {
            $so['permissions'] = json_decode($so['permissions'], true);
        }
    }

    jsonResponse([
        'success' => true,
        'count' => count($officers),
        'data' => $officers
    ]);
}

if ($method === 'POST') {
    $input = getJsonInput();
    if (empty($input['name']) || empty($input['phone'])) {
        errorResponse('Staff name and phone number required', 400);
    }

    $stmtCount = $pdo->query("SELECT COUNT(*) FROM sales_officers");
    $count = (int)$stmtCount->fetchColumn();
    $role = $input['role'] ?? 'so';
    $prefixes = [
        'admin' => 'ADM-',
        'ims_manager' => 'IMS-',
        'dispatcher' => 'DISP-',
        'so' => 'SO-',
        'accounts' => 'ACC-',
        'billing_operator' => 'BILL-',
        'viewer' => 'AUD-'
    ];
    $p = $prefixes[$role] ?? 'SO-';
    $id = $input['id'] ?? ($p . (101 + $count));
    $userId = strtolower(trim($input['userId'] ?? $input['user_id'] ?? $id));
    $password = $input['password'] ?? '1234';
    $permissionsJson = isset($input['permissions']) ? (is_string($input['permissions']) ? $input['permissions'] : json_encode($input['permissions'])) : null;

    if ($driver === 'sqlite') {
        $stmt = $pdo->prepare("INSERT OR REPLACE INTO sales_officers (id, name, user_id, password, phone, route, target, role, permissions, is_active)
            VALUES (:id, :name, :uid, :pass, :phone, :route, :target, :role, :perms, :active)");
    } else {
        $stmt = $pdo->prepare("INSERT INTO sales_officers (id, name, user_id, password, phone, route, target, role, permissions, is_active)
            VALUES (:id, :name, :uid, :pass, :phone, :route, :target, :role, :perms, :active)
            ON DUPLICATE KEY UPDATE name=VALUES(name), user_id=VALUES(user_id), password=VALUES(password), phone=VALUES(phone), route=VALUES(route), target=VALUES(target), role=VALUES(role), permissions=VALUES(permissions)");
    }

    $stmt->execute([
        ':id' => $id,
        ':name' => $input['name'],
        ':uid' => $userId,
        ':pass' => $password,
        ':phone' => $input['phone'],
        ':route' => $input['route'] ?? 'General Beat',
        ':target' => (float)($input['target'] ?? 300000.00),
        ':role' => $role,
        ':perms' => $permissionsJson,
        ':active' => isset($input['is_active']) ? (int)$input['is_active'] : 1
    ]);

    jsonResponse([
        'success' => true,
        'id' => $id,
        'userId' => $userId,
        'role' => $role,
        'message' => 'Staff account registered successfully'
    ], 201);
}

if ($method === 'PUT') {
    $input = getJsonInput();
    $id = $_GET['id'] ?? $input['id'] ?? '';
    if (empty($id)) {
        errorResponse('Staff ID required', 400);
    }

    $updates = [];
    $params = [':id' => $id];

    if (isset($input['name'])) {
        $updates[] = "name = :name";
        $params[':name'] = $input['name'];
    }
    if (isset($input['userId']) || isset($input['user_id'])) {
        $updates[] = "user_id = :uid";
        $params[':uid'] = $input['userId'] ?? $input['user_id'];
    }
    if (isset($input['password'])) {
        $updates[] = "password = :pass";
        $params[':pass'] = $input['password'];
    }
    if (isset($input['role'])) {
        $updates[] = "role = :role";
        $params[':role'] = $input['role'];
    }
    if (isset($input['permissions'])) {
        $updates[] = "permissions = :perms";
        $params[':perms'] = is_string($input['permissions']) ? $input['permissions'] : json_encode($input['permissions']);
    }
    if (isset($input['target'])) {
        $updates[] = "target = :target";
        $params[':target'] = (float)$input['target'];
    }
    if (isset($input['route'])) {
        $updates[] = "route = :route";
        $params[':route'] = $input['route'];
    }
    if (isset($input['phone'])) {
        $updates[] = "phone = :phone";
        $params[':phone'] = $input['phone'];
    }
    if (isset($input['is_active'])) {
        $updates[] = "is_active = :active";
        $params[':active'] = (int)$input['is_active'];
    }

    if (empty($updates)) {
        errorResponse('No fields provided to update', 400);
    }

    $sql = "UPDATE sales_officers SET " . implode(", ", $updates) . " WHERE id = :id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    jsonResponse([
        'success' => true,
        'message' => 'Staff account updated'
    ]);
}

if ($method === 'DELETE') {
    $id = $_GET['id'] ?? '';
    if (empty($id)) {
        $input = getJsonInput();
        $id = $input['id'] ?? '';
    }
    if (empty($id)) {
        errorResponse('Staff ID required to delete', 400);
    }
    $stmt = $pdo->prepare("DELETE FROM sales_officers WHERE id = :id");
    $stmt->execute([':id' => $id]);
    jsonResponse(['success' => true, 'message' => 'Staff account removed successfully']);
}
