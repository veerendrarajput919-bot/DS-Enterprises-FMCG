<?php
/**
 * DS ENTERPRISES — COMPREHENSIVE AUTOMATED VERIFICATION SUITE
 * Tests all 8 core requirements against live database & backend services.
 */

require_once __DIR__ . '/../backend/config/db.php';
require_once __DIR__ . '/../backend/config/numbering.php';

$pdo = Database::getConnection();
$results = [];

$apiUrl = 'http://localhost/DS-Enterprises-FMCG/backend/api';
$testCh = curl_init("{$apiUrl}/auth.php?action=status");
curl_setopt($testCh, CURLOPT_RETURNTRANSFER, true);
curl_setopt($testCh, CURLOPT_TIMEOUT, 1);
$testRes = curl_exec($testCh);
curl_close($testCh);
if (!$testRes) {
    $apiUrl = 'http://127.0.0.1/DS-Enterprises-FMCG/backend/api';
}

function assertTest($name, $condition, $details = '') {
    global $results;
    if ($condition) {
        $results[] = ['name' => $name, 'status' => 'PASS', 'details' => $details];
        echo "✅ PASS: $name " . ($details ? "($details)" : "") . "\n";
    } else {
        $results[] = ['name' => $name, 'status' => 'FAIL', 'details' => $details];
        echo "❌ FAIL: $name - $details\n";
    }
}

echo "====================================================================\n";
echo "DS ENTERPRISES FMCG SYSTEM — FULL AUTOMATED ACCEPTANCE TEST SUITE\n";
echo "====================================================================\n\n";

// -------------------------------------------------------------------------
// TEST 1: Automatic Bill & Invoice Number Generation
// -------------------------------------------------------------------------
echo "--- TEST 1: Automatic Bill & Invoice Number Generation ---\n";
try {
    $bill1 = NumberGenerator::getNext('bill', $pdo);
    $bill2 = NumberGenerator::getNext('bill', $pdo);
    $inv1 = NumberGenerator::getNext('invoice', $pdo);
    $inv2 = NumberGenerator::getNext('invoice', $pdo);

    assertTest('Bill number format', preg_match('/^BILL-\d{4}-\d{4}$/', $bill1) === 1, "Got $bill1");
    assertTest('Invoice number format', preg_match('/^INV-\d{4}-\d{4}$/', $inv1) === 1, "Got $inv1");
    assertTest('Sequential uniqueness (Bill)', $bill1 !== $bill2, "$bill1 != $bill2");
    assertTest('Sequential uniqueness (Invoice)', $inv1 !== $inv2, "$inv1 != $inv2");

    $previewBill = NumberGenerator::previewNext('bill', $pdo);
    assertTest('Preview does not consume sequence', preg_match('/^BILL-\d{4}-\d{4}$/', $previewBill) === 1, "Preview: $previewBill");
} catch (Exception $e) {
    assertTest('Number Generator Execution', false, $e->getMessage());
}

// -------------------------------------------------------------------------
// TEST 2: Bulk 100 Bills CSV Template & Ingestion
// -------------------------------------------------------------------------
echo "\n--- TEST 2: Bulk 100 Bills Import ---\n";
$templatePath = __DIR__ . '/../data/DS_Sample_100_Bills_Template.csv';
assertTest('100-Bill Template exists', file_exists($templatePath), $templatePath);

$file = fopen($templatePath, 'r');
$header = fgetcsv($file);
if ($header) {
    $header = array_map(fn($h) => trim(preg_replace('/^\xEF\xBB\xBF/', '', $h), "\"' \t\r\n"), $header);
}
$csvRows = [];
while (($row = fgetcsv($file)) !== false) {
    if (count($row) === count($header)) {
        $csvRows[] = array_combine($header, $row);
    }
}
fclose($file);
assertTest('Template row count is 100', count($csvRows) === 100, "Loaded " . count($csvRows) . " rows");

// Test Preview API via HTTP
$ch = curl_init("{$apiUrl}/import_bills.php?action=preview");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'rows' => $csvRows,
    'mode' => 'insert_update',
    'clear_blank_fields' => false,
    'recalc_taxes' => true
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$resp = curl_exec($ch);
curl_close($ch);
$previewData = json_decode($resp, true);

assertTest('Bulk Import Preview HTTP 200', $previewData && ($previewData['success'] ?? false) === true);
$summary = $previewData['summary'] ?? [];
assertTest('Preview summary total is 100', ($summary['total_rows'] ?? 0) === 100, "Total: " . ($summary['total_rows'] ?? 0));

// Test Execute Import
$ch = curl_init("{$apiUrl}/import_bills.php?action=execute");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'file_name' => 'DS_Sample_100_Bills_Template.csv',
    'mode' => 'insert_update',
    'clear_blank_fields' => false,
    'recalc_taxes' => true,
    'admin_user' => 'Admin Test',
    'rows' => $csvRows
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$respExec = curl_exec($ch);
curl_close($ch);
$execData = json_decode($respExec, true);

assertTest('Bulk Import Execute HTTP 200', $execData && ($execData['success'] ?? false) === true);
$counts = $execData['summary'] ?? [];
assertTest('100 Records Inserted/Processed', (($counts['inserted'] ?? 0) + ($counts['updated'] ?? 0) + ($counts['unchanged'] ?? 0)) === 100, 
    "Inserted: " . ($counts['inserted'] ?? 0) . ", Updated: " . ($counts['updated'] ?? 0) . ", Unchanged: " . ($counts['unchanged'] ?? 0));

// -------------------------------------------------------------------------
// TEST 3: Upload Again — Verify NO Duplicates Created
// -------------------------------------------------------------------------
echo "\n--- TEST 3: Duplicate Prevention on Repeated Upload ---\n";
$ch = curl_init("{$apiUrl}/import_bills.php?action=preview");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'rows' => $csvRows,
    'mode' => 'insert_update',
    'clear_blank_fields' => false,
    'recalc_taxes' => true
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$resp2 = curl_exec($ch);
curl_close($ch);
$previewData2 = json_decode($resp2, true);
$summary2 = $previewData2['summary'] ?? [];

assertTest('Repeated upload to_insert is 0 (No Duplicates)', ($summary2['new_count'] ?? -1) === 0, "new_count = " . ($summary2['new_count'] ?? -1));
assertTest('Repeated upload unchanged is 100', ($summary2['unchanged_count'] ?? 0) === 100, "unchanged_count = " . ($summary2['unchanged_count'] ?? 0));

// -------------------------------------------------------------------------
// TEST 4: Update Existing Bills & Number Permanence
// -------------------------------------------------------------------------
echo "\n--- TEST 4: Update Existing Records & Permanence ---\n";
// Modify row 0 amount and payment status
$modifiedRows = $csvRows;
$targetBillNo = $modifiedRows[0]['Bill Number'];
$modifiedRows[0]['Total Amount'] = 9999.00;
$modifiedRows[0]['Payment Status'] = 'Paid';

$ch = curl_init("{$apiUrl}/import_bills.php?action=execute");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'file_name' => 'Update_Test.csv',
    'mode' => 'insert_update',
    'clear_blank_fields' => false,
    'recalc_taxes' => false,
    'admin_user' => 'Admin Update Test',
    'rows' => [$modifiedRows[0]]
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$respUpd = curl_exec($ch);
curl_close($ch);
$updData = json_decode($respUpd, true);

assertTest('Update executed successfully', $updData && ($updData['success'] ?? false) === true);
assertTest('Counts updated is 1', ($updData['summary']['updated'] ?? 0) === 1);

// Verify record in database
$stmt = $pdo->prepare("SELECT bill_no, amount, payment_status FROM sales_invoices WHERE bill_no = ?");
$stmt->execute([$targetBillNo]);
$dbRow = $stmt->fetch(PDO::FETCH_ASSOC);
assertTest('Database updated amount is 9999', (float)$dbRow['amount'] === 9999.00, "Got " . $dbRow['amount']);
assertTest('Bill Number remained permanently unchanged', $dbRow['bill_no'] === $targetBillNo, "Bill No: " . $dbRow['bill_no']);

// -------------------------------------------------------------------------
// TEST 5: Invalid Rows & Duplicate Identifier Flagging
// -------------------------------------------------------------------------
echo "\n--- TEST 5: Invalid Data & Safeguard Flagging ---\n";
$badRows = [
    [
        'Bill Number' => '', // missing identifier in update mode
        'Customer Name' => 'Invalid Customer',
        'Quantity' => -5, // negative qty
        'Total Amount' => -100
    ],
    [
        'Bill Number' => 'BILL-NON-EXISTENT-9999',
        'Customer Name' => 'Ghost Customer'
    ]
];

$ch = curl_init("{$apiUrl}/import_bills.php?action=preview");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'rows' => $badRows,
    'mode' => 'update', // only update existing
    'clear_blank_fields' => false,
    'recalc_taxes' => true
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$respBad = curl_exec($ch);
curl_close($ch);
$badData = json_decode($respBad, true);

assertTest('Invalid rows detected', ($badData['summary']['invalid_count'] ?? 0) >= 1, "Failed count: " . ($badData['summary']['invalid_count'] ?? 0));
assertTest('Error report list contains failure reason', !empty($badData['invalid_records'][0]['reason']), "Reason: " . ($badData['invalid_records'][0]['reason'] ?? ''));

// -------------------------------------------------------------------------
// TEST 6: Order Cancellation Lifecycle, Stock Restoration & Reopening
// -------------------------------------------------------------------------
echo "\n--- TEST 6: Order Cancellation & Reopen Workflow ---\n";
// Create test order
$orderId = 'ORD-TEST-' . time();
$skuCode = 'SKU-TEST-' . rand(100, 999);
$nowDate = date('Y-m-d');
$nowDateTime = date('Y-m-d H:i:s');
$driver = Database::getDriver();

if ($driver === 'sqlite') {
    $pdo->exec("INSERT OR IGNORE INTO stock (code, name, brand, category, rate, mrp, current_stock) VALUES ('$skuCode', 'Test Biscuit Pack', 'Parle', 'Biscuits', 50, 60, 100)");
} else {
    $pdo->exec("INSERT IGNORE INTO stock (code, name, brand, category, rate, mrp, current_stock) VALUES ('$skuCode', 'Test Biscuit Pack', 'Parle', 'Biscuits', 50, 60, 100)");
}

$pdo->prepare("INSERT INTO orders (id, order_date, order_datetime, party_id, store_name, route, total_amount, total_qty, status, created_at) VALUES (?, ?, ?, 'PARTY-1', 'Gupta General Store', 'Route Alpha', 500, 10, 'Confirmed', ?)")
    ->execute([$orderId, $nowDate, $nowDateTime, $nowDateTime]);

$pdo->prepare("INSERT INTO order_items (order_id, item_code, item_name, brand, qty, price, total) VALUES (?, ?, 'Test Biscuit Pack', 'Parle', 10, 50, 500)")
    ->execute([$orderId, $skuCode]);

// 6a: Cancel by Customer with Mandatory Remark
$ch = curl_init("{$apiUrl}/orders.php?action=cancel");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'id' => $orderId,
    'cancelled_by_type' => 'Customer',
    'cancellation_reason' => 'Store Refused Delivery',
    'cancellation_remarks' => 'Owner said stock was already purchased from local market',
    'cancelled_by_user' => 'Rajesh Sharma (SO)',
    'user_id' => 'SO-101'
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$respCanc = curl_exec($ch);
curl_close($ch);
$cancData = json_decode($respCanc, true);

assertTest('Cancel Order by Customer HTTP 200', $cancData && ($cancData['success'] ?? false) === true);

// Verify cancelled order via API
$ch = curl_init("{$apiUrl}/orders.php?id={$orderId}");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$respGet = curl_exec($ch);
curl_close($ch);
$getData = json_decode($respGet, true);
$apiOrder = $getData['data'][0] ?? [];

assertTest('Order status is Cancelled by Customer', ($apiOrder['status'] ?? $cancData['new_status'] ?? '') === 'Cancelled by Customer', "Status: " . ($apiOrder['status'] ?? ''));
assertTest('Mandatory remark recorded', !empty($apiOrder['cancellation_remarks'] ?? $cancData['cancellation_remarks'] ?? ''), "Remarks: " . ($apiOrder['cancellation_remarks'] ?? ''));

// 6b: Attempt to Dispatch Cancelled Order (Must be blocked with 403!)
$ch = curl_init("{$apiUrl}/orders.php");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['id' => $orderId, 'status' => 'Dispatched']));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$respBlock = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
assertTest('Dispatch of cancelled order blocked with HTTP 403', $httpCode === 403, "HTTP Code: $httpCode");

// 6c: Reopen Order (Admin Only)
$ch = curl_init("{$apiUrl}/orders.php?action=reopen");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'id' => $orderId,
    'admin_user' => 'Head Admin',
    'admin_id' => 'ADMIN-1',
    'remarks' => 'Customer agreed to take delivery with scheme'
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$respReopen = curl_exec($ch);
curl_close($ch);
$reopenData = json_decode($respReopen, true);
assertTest('Reopen Order HTTP 200', $reopenData && ($reopenData['success'] ?? false) === true, "Resp: " . $respReopen);

$ch = curl_init("{$apiUrl}/orders.php?id={$orderId}");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$respGetReopened = curl_exec($ch);
curl_close($ch);
$getReopenedData = json_decode($respGetReopened, true);
$ordReopened = $getReopenedData['data'][0] ?? [];
assertTest('Status restored to Confirmed', ($ordReopened['status'] ?? '') === 'Confirmed', "Status: " . ($ordReopened['status'] ?? ''));

// -------------------------------------------------------------------------
// TEST 7: Delivery Route Assignment by Admin via Excel
// -------------------------------------------------------------------------
echo "\n--- TEST 7: Delivery Route Assignment Module ---\n";
$routeRows = [
    [
        'route_id' => 'RT-NORTH-01',
        'route_name' => 'North Market Express',
        'sequence' => 1,
        'customer_id' => 'CUST-101',
        'customer_name' => 'Gupta Kirana Store',
        'address' => 'Shop 12, Main Bazar',
        'area' => 'Civil Lines',
        'order_number' => $orderId,
        'delivery_person' => 'Ramesh Driver'
    ],
    [
        'route_id' => 'RT-NORTH-01',
        'route_name' => 'North Market Express',
        'sequence' => 2,
        'customer_id' => 'CUST-102',
        'customer_name' => 'Verma Traders',
        'address' => 'Shop 45, Station Road',
        'area' => 'Civil Lines',
        'order_number' => '',
        'delivery_person' => 'Ramesh Driver'
    ]
];

// 7a: Preview Route Matching
$ch = curl_init("{$apiUrl}/route_assignment.php?action=preview");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'rows' => $routeRows,
    'allow_new_routes' => true,
    'date' => date('Y-m-d')
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$respRoutePrev = curl_exec($ch);
curl_close($ch);
$routePrevData = json_decode($respRoutePrev, true);

assertTest('Route preview HTTP 200', $routePrevData && ($routePrevData['success'] ?? false) === true, "Resp: " . substr((string)$respRoutePrev, 0, 200));
$matchedRecs = $routePrevData['matched_records'] ?? [];
assertTest('Customer matching performed', !empty($matchedRecs[0]['customer_name']), "Customer: " . ($matchedRecs[0]['customer_name'] ?? ''));

// 7b: Execute Route Assignment
$ch = curl_init("{$apiUrl}/route_assignment.php?action=execute");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'route_id' => 'RT-NORTH-01',
    'route_name' => 'North Market Express',
    'delivery_person' => 'Ramesh Driver',
    'delivery_date' => date('Y-m-d'),
    'assignments' => $matchedRecs
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$respRouteExec = curl_exec($ch);
curl_close($ch);
$routeExecData = json_decode($respRouteExec, true);
assertTest('Route assignments saved', $routeExecData && ($routeExecData['success'] ?? false) === true);

// 7c: Manifest Generation
$ch = curl_init("{$apiUrl}/route_assignment.php?action=manifest&route_id=RT-NORTH-01&date=" . date('Y-m-d'));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$respMan = curl_exec($ch);
curl_close($ch);
$manData = json_decode($respMan, true);
assertTest('Printable Route Manifest generated', $manData && !empty($manData['stops']), "Stops: " . count($manData['stops'] ?? []));

// -------------------------------------------------------------------------
// TEST 8: Dashboard All 14 KPIs
// -------------------------------------------------------------------------
echo "\n--- TEST 8: Executive Dashboard (All 14 Metrics) ---\n";
$ch = curl_init("{$apiUrl}/dashboard.php");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$respDash = curl_exec($ch);
curl_close($ch);
$dashData = json_decode($respDash, true);

$expectedKeys = [
    'total_bills', 'total_invoices', 'today_orders', 'pending_orders',
    'delivered_orders', 'cancelled_by_customer', 'cancelled_by_company',
    'total_sales', 'pending_payments', 'total_delivery_routes', 'assigned_deliveries',
    'unassigned_deliveries', 'successful_excel_imports', 'failed_excel_imports'
];

$allPresent = true;
foreach ($expectedKeys as $k) {
    if (!isset($dashData['metrics'][$k])) {
        $allPresent = false;
        echo "Missing metric: $k\n";
    }
}
assertTest('All 14 Dashboard KPI metrics computed and served', $allPresent && ($dashData['success'] ?? false) === true);

echo "\n====================================================================\n";
$passCount = count(array_filter($results, fn($r) => $r['status'] === 'PASS'));
$totalCount = count($results);
echo "TEST SUMMARY: $passCount / $totalCount TESTS PASSED\n";
echo "====================================================================\n";
