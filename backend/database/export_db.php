<?php
/**
 * DS ENTERPRISES — DATABASE EXPORT & EXTRACTOR
 * Exports SQLite / MySQL DB into complete SQL dump (.sql) and JSON (.json)
 */
require_once __DIR__ . '/../config/db.php';

$pdo = Database::getConnection();
if (!$pdo) {
    echo "ERROR: Failed to connect to database.\n";
    exit(1);
}

$driver = Database::getDriver();
echo "Connected driver: {$driver}\n";

// Get list of tables
$tables = [];
if ($driver === 'sqlite') {
    $stmt = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $tables[] = $row['name'];
    }
} else {
    $stmt = $pdo->query("SHOW TABLES");
    while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
        $tables[] = $row[0];
    }
}

echo "Found " . count($tables) . " tables: " . implode(', ', $tables) . "\n";

$sqlDump = "-- ==========================================================================\n";
$sqlDump .= "-- DS ENTERPRISES — COMPLETE DATABASE DUMP (EXTRACT)\n";
$sqlDump .= "-- Generated on: " . date('Y-m-d H:i:s') . "\n";
$sqlDump .= "-- Driver: " . $driver . "\n";
$sqlDump .= "-- ==========================================================================\n\n";

if ($driver === 'mysql') {
    $sqlDump .= "SET FOREIGN_KEY_CHECKS=0;\n\n";
}

$allData = [];

foreach ($tables as $table) {
    echo "Exporting table: {$table}... ";
    
    // Schema
    if ($driver === 'sqlite') {
        $sStmt = $pdo->query("SELECT sql FROM sqlite_master WHERE type='table' AND name='{$table}'");
        $sRow = $sStmt->fetch(PDO::FETCH_ASSOC);
        $createSql = $sRow['sql'] ?? '';
        $sqlDump .= "-- Table structure for `{$table}`\n";
        $sqlDump .= "DROP TABLE IF EXISTS `{$table}`;\n";
        $sqlDump .= $createSql . ";\n\n";
    } else {
        $sStmt = $pdo->query("SHOW CREATE TABLE `{$table}`");
        $sRow = $sStmt->fetch(PDO::FETCH_ASSOC);
        $createSql = $sRow['Create Table'] ?? '';
        $sqlDump .= "-- Table structure for `{$table}`\n";
        $sqlDump .= "DROP TABLE IF EXISTS `{$table}`;\n";
        $sqlDump .= $createSql . ";\n\n";
    }

    // Rows
    $dStmt = $pdo->query("SELECT * FROM `{$table}`");
    $rows = $dStmt->fetchAll(PDO::FETCH_ASSOC);
    $allData[$table] = $rows;
    echo "(" . count($rows) . " rows)\n";

    if (!empty($rows)) {
        $sqlDump .= "-- Dumping data for `{$table}`\n";
        foreach ($rows as $row) {
            $cols = array_map(function($c) { return "`" . addslashes($c) . "`"; }, array_keys($row));
            $vals = array_map(function($v) use ($pdo) {
                if ($v === null) return 'NULL';
                return $pdo->quote($v);
            }, array_values($row));
            
            $sqlDump .= "INSERT INTO `{$table}` (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $vals) . ");\n";
        }
        $sqlDump .= "\n";
    }
}

if ($driver === 'mysql') {
    $sqlDump .= "SET FOREIGN_KEY_CHECKS=1;\n";
}

// 1. Save SQL dump in backend/database/ds_enterprises_dump.sql
$sqlPath = __DIR__ . '/ds_enterprises_dump.sql';
file_put_contents($sqlPath, $sqlDump);
echo "✓ Saved SQL dump: {$sqlPath} (" . strlen($sqlDump) . " bytes)\n";

// 2. Also save in root directory
$rootSqlPath = dirname(__DIR__, 2) . '/ds_enterprises_dump.sql';
file_put_contents($rootSqlPath, $sqlDump);
echo "✓ Saved Root SQL dump: {$rootSqlPath}\n";

// 3. Save JSON export
$jsonPath = __DIR__ . '/ds_enterprises_data.json';
$jsonStr = json_encode($allData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
file_put_contents($jsonPath, $jsonStr);
echo "✓ Saved JSON export: {$jsonPath} (" . strlen($jsonStr) . " bytes)\n";

$rootJsonPath = dirname(__DIR__, 2) . '/ds_enterprises_data.json';
file_put_contents($rootJsonPath, $jsonStr);
echo "✓ Saved Root JSON export: {$rootJsonPath}\n";

echo "Database extract completed successfully!\n";

