<?php
$files = glob(__DIR__ . '/../backend/api/*.php');
$found = 0;
foreach ($files as $f) {
    $code = file_get_contents($f);
    // Find all prepare statements
    preg_match_all('/(?:prepare|query)\s*\(\s*(?:"([^"]+)"|\'([^\']+)\')/s', $code, $matches);
    $allSql = array_merge($matches[1], $matches[2]);
    foreach ($allSql as $sql) {
        if (!$sql) continue;
        preg_match_all('/:[a-zA-Z0-9_]+/', $sql, $params);
        $counts = array_count_values($params[0]);
        foreach ($counts as $param => $count) {
            if ($count > 1) {
                echo "DUPLICATE PARAM $param ($count x) in " . basename($f) . ": " . trim(preg_replace('/\s+/', ' ', substr($sql, 0, 100))) . "..." . PHP_EOL;
                $found++;
            }
        }
    }
}
if ($found === 0) {
    echo "AUDIT PASSED: ZERO duplicate named parameters found across all backend SQL queries!" . PHP_EOL;
}
