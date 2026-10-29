<?php
/**
 * ==========================================================================
 * DS ENTERPRISES — PAYMENT COLLECTIONS & RECEIPTS REST API
 * File: backend/api/payments.php
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

    if (!empty($_GET['party'])) {
        $where[] = "party_name = :party";
        $params[':party'] = $_GET['party'];
    }

    $sqlWhere = implode(" AND ", $where);
    $stmt = $pdo->prepare("SELECT * FROM payment_collections WHERE {$sqlWhere} ORDER BY collection_date DESC, id DESC");
    $stmt->execute($params);
    $colls = $stmt->fetchAll();

    jsonResponse([
        'success' => true,
        'count' => count($colls),
        'data' => $colls
    ]);
}

if ($method === 'POST') {
    $input = getJsonInput();
    if (empty($input['party_name']) || empty($input['amount'])) {
        errorResponse('Party name and collection amount required', 400);
    }

    $amount = (float)$input['amount'];
    if ($amount <= 0) {
        errorResponse('Collection amount must be greater than zero', 400);
    }

    $pdo->beginTransaction();
    try {
        $receiptId = $input['id'] ?? ('REC-' . date('Y') . '-' . rand(3000, 9999));
        $date = $input['collection_date'] ?? date('Y-m-d');
        $time = $input['collection_time'] ?? date('H:i');
        $partyName = $input['party_name'];
        $mode = $input['payment_mode'] ?? 'Cash';
        $ref = $input['reference_no'] ?? ($mode === 'Cash' ? 'CASH-REC' : '');

        $stmt = $pdo->prepare("INSERT INTO payment_collections (id, collection_date, collection_time, party_name, phone, route, amount, payment_mode, reference_no, collected_by, remarks)
            VALUES (:id, :date, :time, :party, :phone, :route, :amt, :mode, :ref, :by, :remarks)");

        $stmt->execute([
            ':id' => $receiptId,
            ':date' => $date,
            ':time' => $time,
            ':party' => $partyName,
            ':phone' => $input['phone'] ?? '',
            ':route' => $input['route'] ?? '',
            ':amt' => $amount,
            ':mode' => $mode,
            ':ref' => $ref,
            ':by' => $input['collected_by'] ?? 'Field Executive',
            ':remarks' => $input['remarks'] ?? 'Weekly collection recovery'
        ]);

        // Reduce outstanding balance in parties table
        $stmtParty = $pdo->prepare("UPDATE parties SET outstanding = GREATEST(0, outstanding - :amt) WHERE name = :name");
        $stmtParty->execute([':amt' => $amount, ':name' => $partyName]);

        // Also reduce balance in outstanding_invoices
        $stmtOut = $pdo->prepare("SELECT id, balance_amount FROM outstanding_invoices WHERE party_name = :name AND balance_amount > 0 ORDER BY invoice_date ASC");
        $stmtOut->execute([':name' => $partyName]);
        $unpaidInvoices = $stmtOut->fetchAll();

        $remCredit = $amount;
        $stmtUpdateInv = $pdo->prepare("UPDATE outstanding_invoices SET balance_amount = :bal WHERE id = :id");

        foreach ($unpaidInvoices as $uInv) {
            if ($remCredit <= 0) break;
            $curBal = (float)$uInv['balance_amount'];
            if ($remCredit >= $curBal) {
                $remCredit -= $curBal;
                $stmtUpdateInv->execute([':bal' => 0, ':id' => $uInv['id']]);
            } else {
                $newBal = $curBal - $remCredit;
                $remCredit = 0;
                $stmtUpdateInv->execute([':bal' => $newBal, ':id' => $uInv['id']]);
            }
        }

        $pdo->commit();

        jsonResponse([
            'success' => true,
            'receipt_id' => $receiptId,
            'message' => "Payment of ₹ {$amount} recorded successfully"
        ], 201);

    } catch (Exception $e) {
        $pdo->rollBack();
        errorResponse("Failed to record collection: " . $e->getMessage(), 500);
    }
}
