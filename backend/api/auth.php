<?php
/**
 * ==========================================================================
 * DS ENTERPRISES — AUTHENTICATION REST API
 * File: backend/api/auth.php
 * ==========================================================================
 */

require_once __DIR__ . '/../config/db.php';

$pdo = Database::getConnection();
if (!$pdo) {
    errorResponse("Database connection unavailable", 500);
}

$method = $_SERVER['REQUEST_METHOD'];
$input = getJsonInput();
$action = $_GET['action'] ?? $input['action'] ?? 'status';

if ($method === 'POST') {
    if ($action === 'verify_pin') {
        $pin = trim($input['pin'] ?? '');
        $stmt = $pdo->prepare("SELECT setting_value FROM settings WHERE setting_key = 'admin_pin'");
        $stmt->execute();
        $storedPin = $stmt->fetchColumn() ?: 'Admin@919';

        if ($pin === $storedPin) {
            jsonResponse([
                'success' => true,
                'role' => 'admin',
                'message' => 'Admin authentication successful',
                'token' => bin2hex(random_bytes(16))
            ]);
        } else {
            errorResponse('Invalid Admin Password. Default is Admin@919.', 401);
        }
    }

    if ($action === 'set_pin') {
        $newPin = trim($input['new_pin'] ?? '');
        if (strlen($newPin) < 4) {
            errorResponse('Password must be at least 4 characters', 400);
        }
        $stmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES ('admin_pin', :pin) 
            ON DUPLICATE KEY UPDATE setting_value = :pin2");
        $stmt->execute([':pin' => $newPin, ':pin2' => $newPin]);

        jsonResponse([
            'success' => true,
            'message' => 'Admin PIN successfully updated'
        ]);
    }

    if ($action === 'login_so' || $action === 'login_staff') {
        $userId = trim($input['user_id'] ?? $input['so_id'] ?? $input['username'] ?? '');
        $password = trim($input['password'] ?? '1234');

        $stmt = $pdo->prepare("SELECT * FROM sales_officers WHERE (LOWER(id) = LOWER(:uid1) OR LOWER(user_id) = LOWER(:uid2) OR phone = :uid3) AND is_active = 1");
        $stmt->execute([':uid1' => $userId, ':uid2' => $userId, ':uid3' => $userId]);
        $officer = $stmt->fetch();

        if ($officer) {
            $expectedPass = trim($officer['password'] ?? '1234');
            if ($password !== '' && $password !== $expectedPass) {
                errorResponse('Invalid Password for this User ID', 401);
            }

            $permissions = [];
            if (!empty($officer['permissions'])) {
                $decoded = json_decode($officer['permissions'], true);
                if (is_array($decoded)) $permissions = $decoded;
            }

            $role = $officer['role'] ?? 'so';

            jsonResponse([
                'success' => true,
                'role' => $role,
                'officer' => [
                    'id' => $officer['id'],
                    'name' => $officer['name'],
                    'userId' => $officer['user_id'] ?? strtolower($officer['id']),
                    'role' => $role,
                    'route' => $officer['route'],
                    'phone' => $officer['phone'],
                    'target' => (float)$officer['target'],
                    'permissions' => $permissions
                ],
                'message' => "Welcome, {$officer['name']}! Logged in as " . strtoupper($role),
                'token' => bin2hex(random_bytes(16))
            ]);
        } else {
            errorResponse('User ID not found or account deactivated', 404);
        }
    }

    if ($action === 'logout') {
        jsonResponse([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);
    }
}

// GET status
$stmt = $pdo->query("SELECT setting_key, setting_value FROM settings");
$settings = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
unset($settings['admin_pin']); // Do not expose PIN directly

jsonResponse([
    'success' => true,
    'status' => 'online',
    'system' => 'DS Enterprises FMCG Backend API',
    'version' => '4.0.0',
    'settings' => $settings
]);
