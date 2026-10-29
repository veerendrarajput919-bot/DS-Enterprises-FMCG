<?php
/**
 * ==========================================================================
 * DS ENTERPRISES — DATABASE MIGRATION SCRIPT (V5 ENHANCEMENT)
 * File: backend/database/migrate_v5.php
 * Adds:
 *   1. number_sequences table (for unique bill/invoice generation)
 *   2. import_batches table (for bulk Excel import tracking)
 *   3. audit_logs table (for auditing changes)
 *   4. order_history table (for status & cancellation lifecycle)
 *   5. delivery_routes & delivery_assignments tables
 *   6. New columns on orders & sales_invoices
 * ==========================================================================
 */

require_once __DIR__ . '/../config/db.php';

$pdo = Database::getConnection();
if (!$pdo) {
    if (php_sapi_name() === 'cli') {
        echo "ERROR: Failed to connect to database for migration.\n";
    } else {
        errorResponse("Database connection unavailable for migration", 500);
    }
    exit(1);
}

$driver = Database::getDriver();
$results = [];

// Helper to check if a column exists in a table
function columnExists(PDO $pdo, string $table, string $column, string $driver): bool {
    if ($driver === 'sqlite') {
        $stmt = $pdo->query("PRAGMA table_info(`{$table}`)");
        $cols = $stmt->fetchAll();
        foreach ($cols as $col) {
            if (strcasecmp($col['name'], $column) === 0) return true;
        }
        return false;
    } else {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tbl AND COLUMN_NAME = :col");
        $stmt->execute([':tbl' => $table, ':col' => $column]);
        return (int)$stmt->fetchColumn() > 0;
    }
}

// Helper to safely add column if missing
function addColumnIfNotExists(PDO $pdo, string $table, string $column, string $definition, string $driver): void {
    if (!columnExists($pdo, $table, $column, $driver)) {
        try {
            $pdo->exec("ALTER TABLE `{$table}` ADD COLUMN `{$column}` {$definition}");
        } catch (Exception $e) {
            // Column may already exist or table doesn't exist yet
        }
    }
}

// 1. Create number_sequences table
if ($driver === 'sqlite') {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS number_sequences (
            type TEXT PRIMARY KEY,
            prefix TEXT NOT NULL,
            year_format TEXT DEFAULT 'calendar',
            current_year TEXT,
            current_number INTEGER NOT NULL DEFAULT 0,
            padding INTEGER NOT NULL DEFAULT 4,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    ");
} else {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `number_sequences` (
            `type` VARCHAR(32) PRIMARY KEY,
            `prefix` VARCHAR(32) NOT NULL,
            `year_format` VARCHAR(16) DEFAULT 'calendar',
            `current_year` VARCHAR(16) DEFAULT NULL,
            `current_number` INT NOT NULL DEFAULT 0,
            `padding` INT NOT NULL DEFAULT 4,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
}

// Seed default sequence types if missing
$defaultSequences = [
    ['type' => 'bill', 'prefix' => 'BILL-', 'year_format' => 'calendar', 'padding' => 4],
    ['type' => 'invoice', 'prefix' => 'INV-', 'year_format' => 'calendar', 'padding' => 4],
    ['type' => 'order', 'prefix' => 'ORD-', 'year_format' => 'calendar', 'padding' => 4]
];

$stmtSeqCheck = $pdo->prepare("SELECT COUNT(*) FROM number_sequences WHERE type = :type");
$stmtSeqInsert = $pdo->prepare("INSERT INTO number_sequences (type, prefix, year_format, current_year, current_number, padding) VALUES (:type, :prefix, :yf, :yr, 0, :pad)");

$currYear = date('Y');
foreach ($defaultSequences as $ds) {
    $stmtSeqCheck->execute([':type' => $ds['type']]);
    if ((int)$stmtSeqCheck->fetchColumn() === 0) {
        $stmtSeqInsert->execute([
            ':type' => $ds['type'],
            ':prefix' => $ds['prefix'],
            ':yf' => $ds['year_format'],
            ':yr' => $currYear,
            ':pad' => $ds['padding']
        ]);
    }
}
$results['number_sequences'] = 'ready';

// 2. Enhance sales_invoices table with bill_no and additional fields
addColumnIfNotExists($pdo, 'sales_invoices', 'bill_no', 'VARCHAR(64) DEFAULT NULL', $driver);
addColumnIfNotExists($pdo, 'sales_invoices', 'tax_amount', 'DECIMAL(12,2) DEFAULT 0.00', $driver);
addColumnIfNotExists($pdo, 'sales_invoices', 'subtotal', 'DECIMAL(12,2) DEFAULT 0.00', $driver);
addColumnIfNotExists($pdo, 'sales_invoices', 'payment_status', "VARCHAR(32) DEFAULT 'Paid'", $driver);
addColumnIfNotExists($pdo, 'sales_invoices', 'import_batch_id', 'VARCHAR(64) DEFAULT NULL', $driver);
addColumnIfNotExists($pdo, 'sales_invoices', 'notes', 'TEXT DEFAULT NULL', $driver);

// Ensure index on bill_no and invoice_no
try {
    if ($driver === 'sqlite') {
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_sales_bill_no ON sales_invoices(bill_no);");
        $pdo->exec("CREATE INDEX IF NOT EXISTS idx_sales_inv_no ON sales_invoices(invoice_no);");
    } else {
        $pdo->exec("ALTER TABLE `sales_invoices` ADD INDEX `idx_sales_bill_no` (`bill_no`);");
    }
} catch (Exception $e) {}
$results['sales_invoices'] = 'columns_enhanced';

// 3. Enhance orders table with cancellation & remarks fields
addColumnIfNotExists($pdo, 'orders', 'cancelled_by_type', 'VARCHAR(32) DEFAULT NULL', $driver);
addColumnIfNotExists($pdo, 'orders', 'cancelled_by_user', 'VARCHAR(128) DEFAULT NULL', $driver);
addColumnIfNotExists($pdo, 'orders', 'cancelled_at', 'DATETIME DEFAULT NULL', $driver);
addColumnIfNotExists($pdo, 'orders', 'cancellation_reason', 'VARCHAR(255) DEFAULT NULL', $driver);
addColumnIfNotExists($pdo, 'orders', 'cancellation_remarks', 'TEXT DEFAULT NULL', $driver);
addColumnIfNotExists($pdo, 'orders', 'admin_notes', 'TEXT DEFAULT NULL', $driver);
addColumnIfNotExists($pdo, 'orders', 'previous_status', 'VARCHAR(64) DEFAULT NULL', $driver);
addColumnIfNotExists($pdo, 'orders', 'reopened_by', 'VARCHAR(128) DEFAULT NULL', $driver);
addColumnIfNotExists($pdo, 'orders', 'reopened_at', 'DATETIME DEFAULT NULL', $driver);
$results['orders'] = 'cancellation_fields_enhanced';

// 4. Create order_history table
if ($driver === 'sqlite') {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS order_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT NOT NULL,
            from_status TEXT,
            to_status TEXT NOT NULL,
            changed_by TEXT,
            user_id TEXT,
            action_type TEXT DEFAULT 'status_change',
            reason TEXT,
            remarks TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_order_hist_oid ON order_history(order_id);
    ");
} else {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `order_history` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `order_id` VARCHAR(64) NOT NULL,
            `from_status` VARCHAR(64) DEFAULT NULL,
            `to_status` VARCHAR(64) NOT NULL,
            `changed_by` VARCHAR(128) DEFAULT NULL,
            `user_id` VARCHAR(64) DEFAULT NULL,
            `action_type` VARCHAR(32) DEFAULT 'status_change',
            `reason` VARCHAR(255) DEFAULT NULL,
            `remarks` TEXT DEFAULT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX `idx_order_hist_oid` (`order_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
}
$results['order_history'] = 'ready';

// 5. Create import_batches table
if ($driver === 'sqlite') {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS import_batches (
            id TEXT PRIMARY KEY,
            batch_type TEXT DEFAULT 'bills',
            file_name TEXT NOT NULL,
            uploaded_by TEXT DEFAULT 'Admin',
            mode TEXT DEFAULT 'insert_update',
            total_rows INTEGER DEFAULT 0,
            inserted_rows INTEGER DEFAULT 0,
            updated_rows INTEGER DEFAULT 0,
            unchanged_rows INTEGER DEFAULT 0,
            failed_rows INTEGER DEFAULT 0,
            status TEXT DEFAULT 'Success',
            error_summary TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    ");
} else {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `import_batches` (
            `id` VARCHAR(64) PRIMARY KEY,
            `batch_type` VARCHAR(32) DEFAULT 'bills',
            `file_name` VARCHAR(255) NOT NULL,
            `uploaded_by` VARCHAR(128) DEFAULT 'Admin',
            `mode` VARCHAR(32) DEFAULT 'insert_update',
            `total_rows` INT DEFAULT 0,
            `inserted_rows` INT DEFAULT 0,
            `updated_rows` INT DEFAULT 0,
            `unchanged_rows` INT DEFAULT 0,
            `failed_rows` INT DEFAULT 0,
            `status` VARCHAR(32) DEFAULT 'Success',
            `error_summary` TEXT DEFAULT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
}
$results['import_batches'] = 'ready';

// 6. Create audit_logs table
if ($driver === 'sqlite') {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            old_values TEXT,
            new_values TEXT,
            performed_by TEXT DEFAULT 'Admin',
            batch_id TEXT,
            ip_address TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
    ");
} else {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `audit_logs` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `action` VARCHAR(64) NOT NULL,
            `entity_type` VARCHAR(64) NOT NULL,
            `entity_id` VARCHAR(128) NOT NULL,
            `old_values` LONGTEXT DEFAULT NULL,
            `new_values` LONGTEXT DEFAULT NULL,
            `performed_by` VARCHAR(128) DEFAULT 'Admin',
            `batch_id` VARCHAR(64) DEFAULT NULL,
            `ip_address` VARCHAR(64) DEFAULT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX `idx_audit_entity` (`entity_type`, `entity_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
}
$results['audit_logs'] = 'ready';

// 7. Create delivery_routes and delivery_assignments tables
if ($driver === 'sqlite') {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS delivery_routes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            area TEXT,
            default_delivery_person TEXT,
            delivery_person_id TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS delivery_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            route_id TEXT NOT NULL,
            sequence INTEGER DEFAULT 1,
            order_id TEXT,
            customer_id TEXT,
            customer_name TEXT NOT NULL,
            address TEXT,
            area TEXT,
            delivery_person TEXT NOT NULL,
            delivery_person_id TEXT,
            assignment_date TEXT DEFAULT CURRENT_DATE,
            delivery_status TEXT DEFAULT 'Assigned',
            import_batch_id TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_deliv_route ON delivery_assignments(route_id);
        CREATE INDEX IF NOT EXISTS idx_deliv_order ON delivery_assignments(order_id);
        CREATE INDEX IF NOT EXISTS idx_deliv_date ON delivery_assignments(assignment_date);
    ");
} else {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `delivery_routes` (
            `id` VARCHAR(64) PRIMARY KEY,
            `name` VARCHAR(128) NOT NULL,
            `area` VARCHAR(128) DEFAULT NULL,
            `default_delivery_person` VARCHAR(128) DEFAULT NULL,
            `delivery_person_id` VARCHAR(32) DEFAULT NULL,
            `is_active` TINYINT(1) DEFAULT 1,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS `delivery_assignments` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `route_id` VARCHAR(64) NOT NULL,
            `sequence` INT DEFAULT 1,
            `order_id` VARCHAR(64) DEFAULT NULL,
            `customer_id` VARCHAR(32) DEFAULT NULL,
            `customer_name` VARCHAR(191) NOT NULL,
            `address` TEXT DEFAULT NULL,
            `area` VARCHAR(128) DEFAULT NULL,
            `delivery_person` VARCHAR(128) NOT NULL,
            `delivery_person_id` VARCHAR(32) DEFAULT NULL,
            `assignment_date` DATE DEFAULT (CURRENT_DATE),
            `delivery_status` VARCHAR(32) DEFAULT 'Assigned',
            `import_batch_id` VARCHAR(64) DEFAULT NULL,
            `notes` TEXT DEFAULT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX `idx_deliv_route` (`route_id`),
            INDEX `idx_deliv_order` (`order_id`),
            INDEX `idx_deliv_date` (`assignment_date`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
}
$results['delivery_tables'] = 'ready';

// Seed initial delivery routes if empty
$stmtRouteCount = $pdo->query("SELECT COUNT(*) FROM delivery_routes");
if ((int)$stmtRouteCount->fetchColumn() === 0) {
    $seedRoutes = [
        ['id' => 'RT-NORTH', 'name' => 'Civil Lines & Swaroop Nagar Beat', 'area' => 'North Kanpur', 'person' => 'Rahul Sharma (SO-101)'],
        ['id' => 'RT-SOUTH', 'name' => 'Govind Nagar & Kidwai Nagar Beat', 'area' => 'South Kanpur', 'person' => 'Amit Verma (SO-102)'],
        ['id' => 'RT-WEST', 'name' => 'Kalyanpur & IIT Beat', 'area' => 'West Kanpur', 'person' => 'Suresh Kumar (SO-103)'],
        ['id' => 'RT-COMM', 'name' => 'Birhana Road Wholesale Market', 'area' => 'Commercial Hub', 'person' => 'Vikas Pandey (SO-104)'],
        ['id' => 'RT-IND', 'name' => 'Panki Industrial & Retail Beat', 'area' => 'Panki Outer', 'person' => 'Manoj Singh (SO-105)']
    ];
    $stmtRInsert = $pdo->prepare("INSERT INTO delivery_routes (id, name, area, default_delivery_person) VALUES (:id, :name, :area, :person)");
    foreach ($seedRoutes as $sr) {
        $stmtRInsert->execute([
            ':id' => $sr['id'],
            ':name' => $sr['name'],
            ':area' => $sr['area'],
            ':person' => $sr['person']
        ]);
    }
}

// 8. Add bill_no, invoice_no and cancellation columns to orders and sales_invoices if missing
addColumnIfNotExists($pdo, 'orders', 'bill_no', 'VARCHAR(64) DEFAULT NULL', $driver);
addColumnIfNotExists($pdo, 'orders', 'invoice_no', 'VARCHAR(64) DEFAULT NULL', $driver);
addColumnIfNotExists($pdo, 'orders', 'cancelled_by_type', 'VARCHAR(32) DEFAULT NULL', $driver);
addColumnIfNotExists($pdo, 'orders', 'cancellation_reason', 'VARCHAR(255) DEFAULT NULL', $driver);
addColumnIfNotExists($pdo, 'orders', 'cancellation_remarks', 'TEXT DEFAULT NULL', $driver);
addColumnIfNotExists($pdo, 'orders', 'cancelled_by_user', 'VARCHAR(128) DEFAULT NULL', $driver);
addColumnIfNotExists($pdo, 'orders', 'cancelled_at', 'DATETIME DEFAULT NULL', $driver);
addColumnIfNotExists($pdo, 'orders', 'previous_status', 'VARCHAR(64) DEFAULT NULL', $driver);

addColumnIfNotExists($pdo, 'sales_invoices', 'bill_no', 'VARCHAR(64) DEFAULT NULL', $driver);
addColumnIfNotExists($pdo, 'sales_invoices', 'import_batch_id', 'VARCHAR(64) DEFAULT NULL', $driver);
$results['columns_added'] = 'ready';

// 9. Populate bill_no for existing sales_invoices if null
$stmtMissingBill = $pdo->query("SELECT id, invoice_no FROM sales_invoices WHERE bill_no IS NULL OR bill_no = '' LIMIT 200");
$missingRows = $stmtMissingBill->fetchAll();
if (!empty($missingRows)) {
    $stmtUpdateBill = $pdo->prepare("UPDATE sales_invoices SET bill_no = :bno WHERE id = :id");
    $seq = 1;
    foreach ($missingRows as $r) {
        $bno = 'BILL-2026-' . str_pad($seq++, 4, '0', STR_PAD_LEFT);
        $stmtUpdateBill->execute([':bno' => $bno, ':id' => $r['id']]);
    }
}

if (php_sapi_name() === 'cli') {
    echo "Migration completed successfully:\n" . json_encode($results, JSON_PRETTY_PRINT) . "\n";
} else {
    jsonResponse([
        'success' => true,
        'message' => 'Database migration v5 executed successfully',
        'driver' => $driver,
        'results' => $results
    ]);
}
