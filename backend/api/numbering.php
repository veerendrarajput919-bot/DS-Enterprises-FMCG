<?php
/**
 * ==========================================================================
 * DS ENTERPRISES — NUMBERING SETTINGS & PREVIEW REST API
 * File: backend/api/numbering.php
 * ==========================================================================
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/numbering.php';

$pdo = Database::getConnection();
if (!$pdo) {
    errorResponse("Database connection unavailable", 500);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'settings';

if ($method === 'GET') {
    if ($action === 'preview') {
        $type = $_GET['type'] ?? 'bill';
        $date = $_GET['date'] ?? null;
        $next = NumberGenerator::previewNext($type, $pdo, $date);
        jsonResponse([
            'success' => true,
            'type' => $type,
            'preview' => $next
        ]);
    }

    if ($action === 'settings') {
        $settings = NumberGenerator::getAllSettings($pdo);
        jsonResponse([
            'success' => true,
            'settings' => $settings
        ]);
    }

    if ($action === 'generate') {
        $type = $_GET['type'] ?? 'bill';
        $date = $_GET['date'] ?? null;
        $generated = NumberGenerator::getNext($type, $pdo, $date);
        jsonResponse([
            'success' => true,
            'type' => $type,
            'number' => $generated
        ]);
    }
}

if ($method === 'POST') {
    $input = getJsonInput();
    $type = $input['type'] ?? '';

    if (empty($type)) {
        errorResponse("Sequence type is required (e.g. 'bill', 'invoice', 'order')", 400);
    }

    $updated = NumberGenerator::updateSettings($type, $input, $pdo);
    if ($updated) {
        // Log to audit_logs
        try {
            $stmtAudit = $pdo->prepare("INSERT INTO audit_logs (action, entity_type, entity_id, new_values, performed_by) VALUES ('update_numbering_rule', 'number_sequences', :id, :vals, :by)");
            $stmtAudit->execute([
                ':id' => $type,
                ':vals' => json_encode($input),
                ':by' => $input['performed_by'] ?? 'Admin'
            ]);
        } catch (Exception $e) {}

        jsonResponse([
            'success' => true,
            'message' => "Numbering configuration for '{$type}' updated successfully",
            'preview_next' => NumberGenerator::previewNext($type, $pdo)
        ]);
    } else {
        errorResponse("Failed to update numbering configuration", 500);
    }
}
