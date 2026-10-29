<?php
$dir = __DIR__ . '/..';
$files = array_merge(glob("$dir/*.html"), glob("$dir/pages/*.html"));
$errs = 0;
$checked = 0;

foreach ($files as $f) {
    $content = file_get_contents($f);
    preg_match_all('/(?:href|src)="([^"]+)"/', $content, $m);
    foreach ($m[1] as $ref) {
        if (str_starts_with($ref, 'http') || str_starts_with($ref, '#') || str_starts_with($ref, 'data:') || str_starts_with($ref, 'javascript:')) continue;
        $clean = explode('?', explode('#', $ref)[0])[0];
        $target = dirname($f) . '/' . $clean;
        $checked++;
        if (!file_exists($target)) {
            echo "BROKEN LINK in " . basename($f) . " -> " . $ref . PHP_EOL;
            $errs++;
        }
    }
}

echo "Audited $checked local asset and page references across " . count($files) . " HTML files." . PHP_EOL;
if ($errs === 0) {
    echo "SUCCESS: 100% of all links, stylesheets, and scripts are valid!" . PHP_EOL;
} else {
    echo "WARNING: Found $errs broken link(s)." . PHP_EOL;
}
