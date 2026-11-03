<?php
require_once __DIR__ . '/../backend/config/db.php';

function callApi(string $urlOrPath, string $method = 'GET', mixed $data = null): array {
    static $httpAvailable = null;
    $apiUrl = 'http://localhost/ds_enterprises/backend/api';

    if ($httpAvailable === null) {
        $testCh = curl_init("{$apiUrl}/auth.php?action=status");
        curl_setopt($testCh, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($testCh, CURLOPT_TIMEOUT, 1);
        $testRes = curl_exec($testCh);
        curl_close($testCh);
        $httpAvailable = !empty($testRes);
    }

    if ($httpAvailable) {
        $ch = curl_init($urlOrPath);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, is_array($data) ? json_encode($data) : $data);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        } elseif ($method !== 'GET') {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
            if ($data !== null) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, is_array($data) ? json_encode($data) : $data);
                curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            }
        }
        $resp = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ['code' => $httpCode, 'data' => json_decode($resp, true), 'raw' => $resp];
    }

    // CLI offline fallback
    $parsed = parse_url($urlOrPath);
    $path = $parsed['path'] ?? '';
    $query = $parsed['query'] ?? '';
    $scriptName = basename($path);
    $scriptPath = __DIR__ . '/../backend/api/' . $scriptName;

    $tmpPayload = null;
    if ($data !== null) {
        $tmpPayload = tempnam(sys_get_temp_dir(), 'test_api_');
        file_put_contents($tmpPayload, is_array($data) ? json_encode($data) : $data);
    }

    $phpBin = 'C:\\xampp\\php\\php.exe';
    if (!file_exists($phpBin)) $phpBin = 'php';

    $runnerCode = '
    $_SERVER["REQUEST_METHOD"] = "' . $method . '";
    $_SERVER["QUERY_STRING"] = "' . addslashes($query) . '";
    parse_str($_SERVER["QUERY_STRING"], $_GET);
    ' . ($tmpPayload ? '$GLOBALS["MOCK_JSON_INPUT"] = json_decode(file_get_contents("' . addslashes($tmpPayload) . '"), true);' : '') . '
    require "' . addslashes($scriptPath) . '";
    ';

    $descriptors = [
        0 => ['pipe', 'r'],
        1 => ['pipe', 'w'],
        2 => ['pipe', 'w']
    ];

    $process = proc_open([$phpBin, '-r', $runnerCode], $descriptors, $pipes);
    $out = '';
    $err = '';
    if (is_resource($process)) {
        fclose($pipes[0]);
        $out = stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        $err = stream_get_contents($pipes[2]);
        fclose($pipes[2]);
        proc_close($process);
    }
    if ($tmpPayload && file_exists($tmpPayload)) @unlink($tmpPayload);

    $code = 200;
    if (str_contains($out, '"error":') && (str_contains($out, 'cancelled') || str_contains($out, 'Cannot modify'))) {
        $code = 403;
    }

    return ['code' => $code, 'data' => json_decode($out, true), 'raw' => $out];
}

$res = callApi('http://localhost/ds_enterprises/backend/api/dashboard.php');
echo "Dashboard API call status:\n";
echo "Code: " . $res['code'] . "\n";
echo "Success: " . (($res['data']['success'] ?? false) ? 'YES' : 'NO') . "\n";
echo "Total bills: " . ($res['data']['metrics']['total_bills'] ?? 'missing') . "\n";

