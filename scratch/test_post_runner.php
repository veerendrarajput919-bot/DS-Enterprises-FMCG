<?php
$phpBin = 'C:\\xampp\\php\\php.exe';
$script = __DIR__ . '/../backend/api/import_bills.php';
$postData = [
    'rows' => [
        [
            'Bill Number' => 'BILL-2026-0001',
            'Date' => '2026-10-10',
            'Customer Name' => 'Shri Ram Kirana Store',
            'Customer Mobile' => '9839011221',
            'Item Name' => 'Parle-G Gold Biscuits 100g (Pkt)',
            'Brand' => 'Parle',
            'Category' => 'Biscuits & Bakery',
            'Route / Beat' => 'Civil Lines Beat',
            'City' => 'Kanpur',
            'Quantity' => 10,
            'Rate' => 12.5,
            'Total Amount' => 125,
            'Payment Status' => 'Paid'
        ]
    ],
    'mode' => 'insert_update',
    'clear_blank_fields' => false,
    'recalc_taxes' => true
];

$tmpPayload = tempnam(sys_get_temp_dir(), 'test_api_');
file_put_contents($tmpPayload, json_encode($postData));

$runnerCode = '
$_SERVER["REQUEST_METHOD"] = "POST";
$_SERVER["QUERY_STRING"] = "action=preview";
$_GET["action"] = "preview";
$GLOBALS["MOCK_JSON_INPUT"] = json_decode(file_get_contents("' . addslashes($tmpPayload) . '"), true);
require_once "' . addslashes($script) . '";
';

$descriptors = [
    0 => ['pipe', 'r'],
    1 => ['pipe', 'w'],
    2 => ['pipe', 'w']
];

$process = proc_open([$phpBin, '-r', $runnerCode], $descriptors, $pipes);
if (is_resource($process)) {
    fclose($pipes[0]);
    $out = stream_get_contents($pipes[1]);
    fclose($pipes[1]);
    $err = stream_get_contents($pipes[2]);
    fclose($pipes[2]);
    proc_close($process);
    echo "API output:\n" . $out . "\n";
    if ($err) echo "Err: " . $err . "\n";
}
@unlink($tmpPayload);
