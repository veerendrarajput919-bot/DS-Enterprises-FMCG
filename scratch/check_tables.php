<?php
require_once 'backend/config/db.php';
$pdo = Database::getConnection();
$tables = $pdo->query("SELECT name FROM sqlite_master WHERE type='table'")->fetchAll(PDO::FETCH_COLUMN);
echo "Tables in SQLite: " . implode(', ', $tables) . "\n";

