<?php
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['action'] = 'status';
ob_start();
require_once 'backend/api/auth.php';
$out = ob_get_clean();
echo "Auth API returned:\n" . $out;

