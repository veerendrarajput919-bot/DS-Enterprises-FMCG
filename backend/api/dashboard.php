<?php
/**
 * ==========================================================================
 * DS ENTERPRISES — EXECUTIVE DASHBOARD KPIS & ANALYTICS REST API
 * File: backend/api/dashboard.php
 * Aggregates all 14 Core Dashboard Metrics for Admin & Executive Monitoring
 * ==========================================================================
 */

require_once __DIR__ . '/../config/db.php';

$pdo = Database::getConnection();
if (!$pdo) {
    errorResponse("Database connection unavailable", 500);
}

$today = date('Y-m-d');
$monthStart = date('Y-m-01');

// 1. Total Bills count (from sales_invoices)
$stmtBills = $pdo->query("SELECT COUNT(*) FROM sales_invoices WHERE bill_no IS NOT NULL AND bill_no != ''");
$totalBills = (int)$stmtBills->fetchColumn();

// 2. Total Invoices count (from sales_invoices)
$stmtInvoices = $pdo->query("SELECT COUNT(*) FROM sales_invoices WHERE invoice_no IS NOT NULL AND invoice_no != ''");
$totalInvoices = (int)$stmtInvoices->fetchColumn();

// 3. Today's Orders count
$stmtTodayOrders = $pdo->prepare("SELECT COUNT(*) FROM orders WHERE order_date = :td");
$stmtTodayOrders->execute([':td' => $today]);
$todayOrders = (int)$stmtTodayOrders->fetchColumn();

// 4. Pending Orders (Submitted / Pending / Confirmed / Processing)
$stmtPending = $pdo->query("SELECT COUNT(*) FROM orders WHERE status IN ('Pending', 'Submitted', 'Confirmed', 'Processing')");
$pendingOrders = (int)$stmtPending->fetchColumn();

// 5. Delivered Orders
$stmtDelivered = $pdo->query("SELECT COUNT(*) FROM orders WHERE status = 'Delivered'");
$deliveredOrders = (int)$stmtDelivered->fetchColumn();

// 6. Cancelled by Customer
$stmtCancelCust = $pdo->query("SELECT COUNT(*), COALESCE(SUM(total_amount), 0) as val FROM orders WHERE status = 'Cancelled by Customer'");
$cancelCustRow = $stmtCancelCust->fetch();
$cancelledByCustomer = (int)$cancelCustRow['COUNT(*)'];
$cancelledByCustomerVal = (float)$cancelCustRow['val'];

// 7. Cancelled by Company/Admin
$stmtCancelCo = $pdo->query("SELECT COUNT(*), COALESCE(SUM(total_amount), 0) as val FROM orders WHERE status IN ('Cancelled by Company/Admin', 'Cancelled by Own')");
$cancelCoRow = $stmtCancelCo->fetch();
$cancelledByCompany = (int)$cancelCoRow['COUNT(*)'];
$cancelledByCompanyVal = (float)$cancelCoRow['val'];

// 8. Total Sales Turnover (MTD & Total)
$stmtSales = $pdo->query("SELECT COALESCE(SUM(amount), 0) FROM sales_invoices");
$totalSales = (float)$stmtSales->fetchColumn();

$stmtMtdSales = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM sales_invoices WHERE invoice_date >= :ms");
$stmtMtdSales->execute([':ms' => $monthStart]);
$mtdSales = (float)$stmtMtdSales->fetchColumn();

// 9. Pending Payments / Outstanding Receivables
$stmtPendingPay = $pdo->query("SELECT COALESCE(SUM(balance_amount), 0) FROM outstanding_invoices WHERE balance_amount > 0");
$pendingPayments = (float)$stmtPendingPay->fetchColumn();

// 10. Total Delivery Routes
$stmtRoutes = $pdo->query("SELECT COUNT(*) FROM delivery_routes WHERE is_active = 1");
$totalDeliveryRoutes = (int)$stmtRoutes->fetchColumn();

// 11. Assigned Deliveries (today or active assignments)
$stmtAssigned = $pdo->prepare("SELECT COUNT(*) FROM delivery_assignments WHERE assignment_date = :td");
$stmtAssigned->execute([':td' => $today]);
$assignedDeliveries = (int)$stmtAssigned->fetchColumn();

// 12. Unassigned Deliveries (orders in 'Ready for Delivery', 'Approved', 'Confirmed' not yet in assignments today)
$stmtUnassigned = $pdo->prepare("SELECT COUNT(*) FROM orders WHERE status IN ('Ready for Delivery', 'Approved', 'Confirmed') AND id NOT IN (SELECT order_id FROM delivery_assignments WHERE assignment_date = :td AND order_id IS NOT NULL)");
$stmtUnassigned->execute([':td' => $today]);
$unassignedDeliveries = (int)$stmtUnassigned->fetchColumn();

// 13. Successful Excel Imports
$stmtImportSuccess = $pdo->query("SELECT COUNT(*) FROM import_batches WHERE status = 'Success'");
$successfulImports = (int)$stmtImportSuccess->fetchColumn();

// 14. Failed Excel Imports
$stmtImportFailed = $pdo->query("SELECT COUNT(*) FROM import_batches WHERE status IN ('Failed', 'Partial')");
$failedImports = (int)$stmtImportFailed->fetchColumn();

jsonResponse([
    'success' => true,
    'timestamp' => date('c'),
    'metrics' => [
        'total_bills' => [
            'value' => $totalBills,
            'label' => 'Total Bills',
            'subtext' => 'Generated & Ingested Bills',
            'link' => 'sales-analysis.html',
            'color' => 'indigo'
        ],
        'total_invoices' => [
            'value' => $totalInvoices,
            'label' => 'Total Invoices',
            'subtext' => 'Sales Ledger Invoices',
            'link' => 'sales-analysis.html',
            'color' => 'blue'
        ],
        'today_orders' => [
            'value' => $todayOrders,
            'label' => "Today's Orders",
            'subtext' => 'Field booked today',
            'link' => 'order-report.html?date_preset=today',
            'color' => 'emerald'
        ],
        'pending_orders' => [
            'value' => $pendingOrders,
            'label' => 'Pending Orders',
            'subtext' => 'Awaiting fulfillment/dispatch',
            'link' => 'order-report.html?status=Pending',
            'color' => 'amber'
        ],
        'delivered_orders' => [
            'value' => $deliveredOrders,
            'label' => 'Delivered Orders',
            'subtext' => 'Completed deliveries',
            'link' => 'order-report.html?status=Delivered',
            'color' => 'green'
        ],
        'cancelled_by_customer' => [
            'value' => $cancelledByCustomer,
            'amount' => $cancelledByCustomerVal,
            'label' => 'Cancelled by Customer',
            'subtext' => 'Retailer denied orders',
            'link' => 'order-report.html?status=Cancelled%20by%20Customer',
            'color' => 'rose'
        ],
        'cancelled_by_company' => [
            'value' => $cancelledByCompany,
            'amount' => $cancelledByCompanyVal,
            'label' => 'Cancelled by Company/Admin',
            'subtext' => 'Internal stock/route issues',
            'link' => 'order-report.html?status=Cancelled%20by%20Company/Admin',
            'color' => 'purple'
        ],
        'total_sales' => [
            'value' => $totalSales,
            'mtd' => $mtdSales,
            'label' => 'Total Sales',
            'subtext' => 'Total gross turnover',
            'link' => 'sales-analysis.html',
            'color' => 'emerald'
        ],
        'pending_payments' => [
            'value' => $pendingPayments,
            'label' => 'Pending Payments',
            'subtext' => 'Market receivables due',
            'link' => 'outstanding-party-wise.html',
            'color' => 'red'
        ],
        'total_delivery_routes' => [
            'value' => $totalDeliveryRoutes,
            'label' => 'Total Delivery Routes',
            'subtext' => 'Active beat networks',
            'link' => 'route-assignment.html',
            'color' => 'cyan'
        ],
        'assigned_deliveries' => [
            'value' => $assignedDeliveries,
            'label' => 'Assigned Deliveries',
            'subtext' => "Today's allocated stops",
            'link' => 'route-assignment.html?date=today',
            'color' => 'teal'
        ],
        'unassigned_deliveries' => [
            'value' => $unassignedDeliveries,
            'label' => 'Unassigned Deliveries',
            'subtext' => 'Orders pending van allocation',
            'link' => 'order-approval.html',
            'color' => 'orange'
        ],
        'successful_excel_imports' => [
            'value' => $successfulImports,
            'label' => 'Successful Excel Imports',
            'subtext' => 'Completed batches',
            'link' => 'upload-update.html?tab=history&status=Success',
            'color' => 'emerald'
        ],
        'failed_excel_imports' => [
            'value' => $failedImports,
            'label' => 'Failed Excel Imports',
            'subtext' => 'Batches with errors/partial',
            'link' => 'upload-update.html?tab=history&status=Failed',
            'color' => 'rose'
        ]
    ]
]);
