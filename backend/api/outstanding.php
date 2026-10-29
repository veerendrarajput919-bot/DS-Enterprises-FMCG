<?php
/**
 * ==========================================================================
 * DS ENTERPRISES — OUTSTANDING RECEIVABLES & AGING REST API
 * File: backend/api/outstanding.php
 * ==========================================================================
 */

require_once __DIR__ . '/../config/db.php';

$pdo = Database::getConnection();
if (!$pdo) {
    errorResponse("Database connection unavailable", 500);
}

$where = ["1=1"];
$params = [];

if (!empty($_GET['route'])) {
    $where[] = "route = :route";
    $params[':route'] = $_GET['route'];
}

if (!empty($_GET['bucket'])) {
    $where[] = "age_bucket = :bucket";
    $params[':bucket'] = $_GET['bucket'];
}

if (!empty($_GET['search'])) {
    $where[] = "(party_name LIKE :search OR bill_no LIKE :search)";
    $params[':search'] = '%' . $_GET['search'] . '%';
}

$sqlWhere = implode(" AND ", $where);
$stmt = $pdo->prepare("SELECT * FROM outstanding_invoices WHERE {$sqlWhere} ORDER BY due_days DESC, id DESC");
$stmt->execute($params);
$invoices = $stmt->fetchAll();

// Aging calculations
$totalDue = 0;
$b0_15 = 0;
$b16_30 = 0;
$b31_60 = 0;
$b60plus = 0;

foreach ($invoices as $inv) {
    $bal = (float)$inv['balance_amount'];
    $totalDue += $bal;
    $bucket = $inv['age_bucket'];
    if ($bucket === '0-15 Days') $b0_15 += $bal;
    elseif ($bucket === '16-30 Days') $b16_30 += $bal;
    elseif ($bucket === '31-60 Days') $b31_60 += $bal;
    elseif ($bucket === '60+ Days') $b60plus += $bal;
}

// Brand-wise outstanding estimation based on sales proportion
$stmtSales = $pdo->query("SELECT brand, SUM(amount) as brand_sales FROM sales_invoices GROUP BY brand");
$brandSales = $stmtSales->fetchAll(PDO::FETCH_KEY_PAIR);
$allSales = array_sum($brandSales) ?: 1;

$brandOutstanding = [];
foreach ($brandSales as $brand => $salesAmt) {
    $ratio = $salesAmt / $allSales;
    $brandDue = round($totalDue * $ratio, 2);
    $brandOutstanding[] = [
        'brand' => $brand ?: 'Generic',
        'due' => $brandDue,
        'percentage' => round($ratio * 100, 1)
    ];
}
usort($brandOutstanding, fn($a, $b) => $b['due'] <=> $a['due']);

jsonResponse([
    'success' => true,
    'summary' => [
        'total_due' => $totalDue,
        'bucket_0_15' => $b0_15,
        'bucket_16_30' => $b16_30,
        'bucket_31_60' => $b31_60,
        'bucket_60_plus' => $b60plus,
        'count' => count($invoices)
    ],
    'brand_breakdown' => $brandOutstanding,
    'data' => $invoices
]);
