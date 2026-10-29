<?php
/**
 * ==========================================================================
 * DS ENTERPRISES — AUTOMATIC BILL & INVOICE NUMBER GENERATION ENGINE
 * File: backend/config/numbering.php
 * Architecture: Atomic Sequence Generator with Year/FY Rollover & Concurrency Lock
 * ==========================================================================
 */

require_once __DIR__ . '/db.php';

class NumberGenerator {

    /**
     * Calculate current year or financial year string
     * @param string $format 'calendar' (e.g. 2026) or 'fy' (e.g. 2026-27)
     */
    public static function getPeriodString(string $format = 'calendar', ?string $customDate = null): string {
        $timestamp = $customDate ? strtotime($customDate) : time();
        $year = (int)date('Y', $timestamp);
        $month = (int)date('n', $timestamp);

        if ($format === 'fy') {
            // Financial year starts April 1 (India standard FMCG FY)
            if ($month >= 4) {
                $startYear = $year;
                $endYearShort = substr((string)($year + 1), -2);
            } else {
                $startYear = $year - 1;
                $endYearShort = substr((string)$year, -2);
            }
            return "{$startYear}-{$endYearShort}";
        }

        return (string)$year;
    }

    public static function getNext(string $type, PDO $pdo, ?string $date = null): string
    {
        return self::generateNextNumber($type, $pdo, $date);
    }

    /**
     * Atomically generate next unique number
     * @param string $type 'bill' | 'invoice' | 'order'
     * @param PDO $pdo Active PDO connection
     * @param string|null $date Optional transaction date
     * @return string Generated unique identifier, e.g. "BILL-2026-0001" or "INV-2026-0001"
     */
    public static function generateNextNumber(string $type, PDO $pdo, ?string $date = null): string
    {
        $driver = Database::getDriver();
        $isOwnTx = !$pdo->inTransaction();
        if ($isOwnTx) {
            $pdo->beginTransaction();
        }

        try {
            // Lock row for update
            $lockClause = ($driver === 'sqlite') ? "" : " FOR UPDATE";
            $stmt = $pdo->prepare("SELECT * FROM number_sequences WHERE type = :type{$lockClause}");
            $stmt->execute([':type' => $type]);
            $row = $stmt->fetch();

            if (!$row) {
                // Initialize if missing
                $defaultPrefix = strtoupper($type) . '-';
                $defaultYf = 'calendar';
                $defaultPad = 4;
                $currPeriod = self::getPeriodString($defaultYf, $date);

                $stmtInit = $pdo->prepare("INSERT INTO number_sequences (type, prefix, year_format, current_year, current_number, padding) VALUES (:type, :pfx, :yf, :yr, 0, :pad)");
                $stmtInit->execute([
                    ':type' => $type,
                    ':pfx' => $defaultPrefix,
                    ':yf' => $defaultYf,
                    ':yr' => $currPeriod,
                    ':pad' => $defaultPad
                ]);

                $prefix = $defaultPrefix;
                $yearFormat = $defaultYf;
                $lastYear = $currPeriod;
                $currentNum = 0;
                $padding = $defaultPad;
            } else {
                $prefix = $row['prefix'] ?? (strtoupper($type) . '-');
                $yearFormat = $row['year_format'] ?? 'calendar';
                $lastYear = $row['current_year'];
                $currentNum = (int)($row['current_number'] ?? 0);
                $padding = max(3, (int)($row['padding'] ?? 4));
            }

            $currentPeriod = self::getPeriodString($yearFormat, $date);

            // Handle year/financial year change (rollover)
            if ($lastYear !== $currentPeriod) {
                $currentNum = 0;
                $lastYear = $currentPeriod;
            }

            // Loop until a guaranteed non-duplicate number is found
            $attempts = 0;
            $candidate = '';
            do {
                $currentNum++;
                $attempts++;
                $formattedNum = str_pad((string)$currentNum, $padding, '0', STR_PAD_LEFT);
                $candidate = "{$prefix}{$currentPeriod}-{$formattedNum}";

                // Double check table level uniqueness
                $exists = false;
                if ($type === 'bill' || $type === 'invoice') {
                    $chk = $pdo->prepare("SELECT COUNT(*) FROM sales_invoices WHERE invoice_no = :v1 OR bill_no = :v2");
                    $chk->execute([':v1' => $candidate, ':v2' => $candidate]);
                    $exists = ((int)$chk->fetchColumn() > 0);
                } elseif ($type === 'order') {
                    $chk = $pdo->prepare("SELECT COUNT(*) FROM orders WHERE id = :val");
                    $chk->execute([':val' => $candidate]);
                    $exists = ((int)$chk->fetchColumn() > 0);
                }
            } while ($exists && $attempts < 1000);

            // Update database sequence state
            $stmtUpd = $pdo->prepare("UPDATE number_sequences SET current_year = :yr, current_number = :num, updated_at = CURRENT_TIMESTAMP WHERE type = :type");
            $stmtUpd->execute([
                ':yr' => $lastYear,
                ':num' => $currentNum,
                ':type' => $type
            ]);

            if ($isOwnTx) {
                $pdo->commit();
            }

            return $candidate;

        } catch (Exception $e) {
            if ($isOwnTx && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            // Fallback safe unique string if sequence table fails
            $period = self::getPeriodString('calendar');
            return strtoupper($type) . "-{$period}-" . substr(str_shuffle("0123456789"), 0, 4);
        }
    }

    /**
     * Preview next number without committing an increment
     */
    public static function previewNext(string $type, PDO $pdo, ?string $date = null): string {
        $stmt = $pdo->prepare("SELECT * FROM number_sequences WHERE type = :type");
        $stmt->execute([':type' => $type]);
        $row = $stmt->fetch();

        $prefix = $row['prefix'] ?? (strtoupper($type) . '-');
        $yearFormat = $row['year_format'] ?? 'calendar';
        $currentPeriod = self::getPeriodString($yearFormat, $date);
        $padding = max(3, (int)($row['padding'] ?? 4));

        $num = (int)($row['current_number'] ?? 0);
        if (($row['current_year'] ?? '') !== $currentPeriod) {
            $num = 0;
        }
        $next = $num + 1;
        $formatted = str_pad((string)$next, $padding, '0', STR_PAD_LEFT);
        return "{$prefix}{$currentPeriod}-{$formatted}";
    }

    /**
     * Retrieve all numbering configurations
     */
    public static function getAllSettings(PDO $pdo): array {
        $stmt = $pdo->query("SELECT * FROM number_sequences ORDER BY type ASC");
        $rows = $stmt->fetchAll();
        $result = [];
        foreach ($rows as $r) {
            $result[$r['type']] = [
                'type' => $r['type'],
                'prefix' => $r['prefix'],
                'year_format' => $r['year_format'],
                'current_year' => $r['current_year'],
                'current_number' => (int)$r['current_number'],
                'padding' => (int)$r['padding'],
                'preview_next' => self::previewNext($r['type'], $pdo)
            ];
        }
        return $result;
    }

    /**
     * Update prefix, year format or padding for a sequence type
     */
    public static function updateSettings(string $type, array $data, PDO $pdo): bool {
        $stmt = $pdo->prepare("
            UPDATE number_sequences 
            SET prefix = :pfx, 
                year_format = :yf, 
                padding = :pad,
                updated_at = CURRENT_TIMESTAMP
            WHERE type = :type
        ");

        return $stmt->execute([
            ':pfx' => trim($data['prefix'] ?? (strtoupper($type) . '-')),
            ':yf' => in_array($data['year_format'] ?? '', ['calendar', 'fy']) ? $data['year_format'] : 'calendar',
            ':pad' => max(3, min(8, (int)($data['padding'] ?? 4))),
            ':type' => $type
        ]);
    }
}
