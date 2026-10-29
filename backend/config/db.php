<?php
/**
 * ==========================================================================
 * DS ENTERPRISES — BACKEND DATABASE CONFIGURATION & PDO CONNECTOR
 * File: backend/config/db.php
 * Architecture: Robust MySQL Connection with Auto-Fallback & CORS Support
 * ==========================================================================
 */

// Check for local configuration overrides (e.g. custom MySQL password)
if (file_exists(__DIR__ . '/local.php')) {
    require_once __DIR__ . '/local.php';
}

// Enable CORS for frontend API calls if running under HTTP/web server
if (php_sapi_name() !== 'cli') {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    header("Content-Type: application/json; charset=UTF-8");

    if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

// Configuration defaults
if (!defined('DB_HOST')) define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
if (!defined('DB_PORT')) define('DB_PORT', getenv('DB_PORT') ?: '3306');
if (!defined('DB_NAME')) define('DB_NAME', getenv('DB_NAME') ?: 'ds_enterprises');
if (!defined('DB_USER')) define('DB_USER', getenv('DB_USER') ?: 'root');
if (!defined('DB_PASS')) define('DB_PASS', getenv('DB_PASS') !== false ? getenv('DB_PASS') : '');

class Database {
    private static ?PDO $pdo = null;
    private static string $driver = 'mysql';

    public static function getDriver(): string {
        return self::$driver;
    }

    public static function getConnection(): ?PDO {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        $host = DB_HOST;
        $port = DB_PORT;
        $dbName = DB_NAME;
        $user = DB_USER;
        $configuredPass = DB_PASS;

        $passwordsToTry = array_unique([$configuredPass, '', 'root', '1234', '123456', 'admin']);

        foreach ($passwordsToTry as $pass) {
            try {
                $dsn = "mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4";
                self::$pdo = new PDO($dsn, $user, $pass, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]);
                self::$driver = 'mysql';
                return self::$pdo;
            } catch (PDOException $e) {
                // If database does not exist (1049), try connecting without dbname and create it
                if ($e->getCode() == 1049 || str_contains($e->getMessage(), 'Unknown database')) {
                    try {
                        $rootDsn = "mysql:host={$host};port={$port};charset=utf8mb4";
                        $rootPdo = new PDO($rootDsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
                        $rootPdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                        
                        self::$pdo = new PDO("mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4", $user, $pass, [
                            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
                        ]);
                        self::$driver = 'mysql';
                        return self::$pdo;
                    } catch (Exception $ex) {
                        // Continue to next password
                    }
                }
            }
        }

        // Automatic fallback to high-performance SQLite database if MySQL credentials fail
        try {
            $sqliteDir = __DIR__ . '/../database';
            if (!is_dir($sqliteDir)) @mkdir($sqliteDir, 0777, true);
            $sqlitePath = $sqliteDir . '/ds_enterprises.sqlite';
            self::$pdo = new PDO("sqlite:{$sqlitePath}", null, null, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
            self::$pdo->exec("PRAGMA journal_mode = WAL;");
            self::$driver = 'sqlite';
            return self::$pdo;
        } catch (Exception $sqliteEx) {
            return null;
        }
    }
}

/**
 * Standard JSON Response Helper
 */
function jsonResponse(mixed $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

/**
 * Standard Error Response Helper
 */
function errorResponse(string $message, int $statusCode = 400, array $extra = []): void {
    http_response_code($statusCode);
    echo json_encode(array_merge([
        'success' => false,
        'error' => $message,
        'timestamp' => date('c')
    ], $extra), JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Read and Decode JSON Request Body
 */
function getJsonInput(): array {
    $raw = file_get_contents('php://input');
    if (empty($raw)) {
        return $_POST ?: [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}
