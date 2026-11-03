<?php
/**
 * ==========================================================================
 * DS ENTERPRISES — DELIVERY ROUTE ASSIGNMENT & MANIFEST REST API
 * File: backend/api/route_assignment.php
 * Handles: Route Excel Ingestion, Customer/Order Matching, Delivery Personnel
 * Assignment, Sequence Ordering, Reassignment, Printable Manifest & Auditing
 * ==========================================================================
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/numbering.php';

$pdo = Database::getConnection();
if (!$pdo) {
    errorResponse("Database connection unavailable", 500);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? 'routes';

/**
 * 1. GET Requests: Routes Master, Assignments List, Print Manifest, Templates
 */
if ($method === 'GET') {
    // 1A. Delivery Routes Summary & Active Beat Statistics
    if ($action === 'routes') {
        $date = $_GET['date'] ?? date('Y-m-d');

        $stmt = $pdo->query("SELECT * FROM delivery_routes WHERE is_active = 1 ORDER BY id ASC");
        $routes = $stmt->fetchAll();

        // Get assignment stats for each route on the specified date
        $stmtStats = $pdo->prepare("SELECT 
            route_id,
            COUNT(*) as stop_count,
            COUNT(DISTINCT order_id) as order_count,
            COUNT(CASE WHEN delivery_status = 'Delivered' THEN 1 END) as delivered_count,
            COUNT(CASE WHEN delivery_status = 'Assigned' THEN 1 END) as pending_count,
            COUNT(CASE WHEN delivery_status = 'In Transit' THEN 1 END) as in_transit_count,
            COUNT(CASE WHEN delivery_status IN ('Failed', 'Returned') THEN 1 END) as failed_count
            FROM delivery_assignments 
            WHERE assignment_date = :dt
            GROUP BY route_id");
        $stmtStats->execute([':dt' => $date]);
        $statsRows = $stmtStats->fetchAll();

        $statsMap = [];
        foreach ($statsRows as $sr) {
            $statsMap[$sr['route_id']] = $sr;
        }

        // Get total amount for each route by joining orders
        $stmtAmt = $pdo->prepare("SELECT 
            da.route_id,
            COALESCE(SUM(o.total_amount), 0) as total_val,
            COALESCE(SUM(o.total_qty), 0) as total_units
            FROM delivery_assignments da
            LEFT JOIN orders o ON da.order_id = o.id
            WHERE da.assignment_date = :dt
            GROUP BY da.route_id");
        $stmtAmt->execute([':dt' => $date]);
        $amtRows = $stmtAmt->fetchAll();
        $amtMap = [];
        foreach ($amtRows as $ar) {
            $amtMap[$ar['route_id']] = $ar;
        }

        foreach ($routes as &$r) {
            $st = $statsMap[$r['id']] ?? null;
            $amt = $amtMap[$r['id']] ?? null;
            $r['stops_count'] = (int)($st['stop_count'] ?? 0);
            $r['orders_count'] = (int)($st['order_count'] ?? 0);
            $r['delivered_count'] = (int)($st['delivered_count'] ?? 0);
            $r['pending_count'] = (int)($st['pending_count'] ?? 0);
            $r['in_transit_count'] = (int)($st['in_transit_count'] ?? 0);
            $r['failed_count'] = (int)($st['failed_count'] ?? 0);
            $r['total_amount'] = (float)($amt['total_val'] ?? 0);
            $r['total_qty'] = (float)($amt['total_units'] ?? 0);
        }

        jsonResponse([
            'success' => true,
            'date' => $date,
            'count' => count($routes),
            'routes' => $routes
        ]);
    }

    // 1B. Delivery Assignments List with Multi-Filters
    if ($action === 'assignments') {
        $where = ["1=1"];
        $params = [];

        if (!empty($_GET['route_id'])) {
            $where[] = "da.route_id = :route_id";
            $params[':route_id'] = $_GET['route_id'];
        }

        if (!empty($_GET['delivery_person'])) {
            $where[] = "da.delivery_person LIKE :dp";
            $params[':dp'] = '%' . $_GET['delivery_person'] . '%';
        }

        if (!empty($_GET['status']) || !empty($_GET['delivery_status'])) {
            $st = $_GET['status'] ?? $_GET['delivery_status'];
            $where[] = "da.delivery_status = :deliv_st";
            $params[':deliv_st'] = $st;
        }

        if (!empty($_GET['date'])) {
            $where[] = "da.assignment_date = :dt";
            $params[':dt'] = $_GET['date'];
        } elseif (!empty($_GET['from']) || !empty($_GET['to'])) {
            if (!empty($_GET['from'])) {
                $where[] = "da.assignment_date >= :from";
                $params[':from'] = $_GET['from'];
            }
            if (!empty($_GET['to'])) {
                $where[] = "da.assignment_date <= :to";
                $params[':to'] = $_GET['to'];
            }
        }

        if (!empty($_GET['city'])) {
            $where[] = "(da.address LIKE :city OR da.area LIKE :city)";
            $params[':city'] = '%' . trim($_GET['city']) . '%';
        }

        if (!empty($_GET['city1'])) {
            $where[] = "(da.address LIKE :city1 OR da.area LIKE :city1)";
            $params[':city1'] = '%' . trim($_GET['city1']) . '%';
        }

        if (!empty($_GET['area'])) {
            $where[] = "da.area LIKE :area";
            $params[':area'] = '%' . $_GET['area'] . '%';
        }

        if (!empty($_GET['customer'])) {
            $where[] = "(da.customer_name LIKE :cust OR da.customer_id LIKE :cust)";
            $params[':cust'] = '%' . $_GET['customer'] . '%';
        }

        if (!empty($_GET['search'])) {
            $where[] = "(da.customer_name LIKE :search OR da.order_id LIKE :search OR da.delivery_person LIKE :search OR da.address LIKE :search)";
            $params[':search'] = '%' . trim($_GET['search']) . '%';
        }

        $sqlWhere = implode(" AND ", $where);
        $limit = isset($_GET['limit']) ? max(1, (int)$_GET['limit']) : 100;
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $offset = ($page - 1) * $limit;

        $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM delivery_assignments da WHERE {$sqlWhere}");
        $stmtCount->execute($params);
        $total = (int)$stmtCount->fetchColumn();

        $sql = "SELECT 
                    da.*,
                    dr.name as route_name,
                    o.total_amount as order_amount,
                    o.total_qty as order_qty,
                    o.status as order_status,
                    o.contact_phone as customer_phone
                FROM delivery_assignments da
                LEFT JOIN delivery_routes dr ON da.route_id = dr.id
                LEFT JOIN orders o ON da.order_id = o.id
                WHERE {$sqlWhere}
                ORDER BY da.route_id ASC, da.sequence ASC, da.id ASC
                LIMIT {$limit} OFFSET {$offset}";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $assignments = $stmt->fetchAll();

        jsonResponse([
            'success' => true,
            'total' => $total,
            'page' => $page,
            'assignments' => $assignments
        ]);
    }

    // 1C. Printable Delivery Route Manifest (Delivery Sheet)
    if ($action === 'manifest') {
        $routeId = $_GET['route_id'] ?? '';
        $date = $_GET['date'] ?? date('Y-m-d');

        if (empty($routeId)) {
            errorResponse('route_id is required for printable delivery sheet', 400);
        }

        $stmtRoute = $pdo->prepare("SELECT * FROM delivery_routes WHERE id = :id");
        $stmtRoute->execute([':id' => $routeId]);
        $route = $stmtRoute->fetch();

        if (!$route) {
            errorResponse("Route {$routeId} not found", 404);
        }

        $sql = "SELECT 
                    da.*,
                    o.total_amount,
                    o.total_qty,
                    o.payment_status,
                    o.contact_phone,
                    o.order_date
                FROM delivery_assignments da
                LEFT JOIN orders o ON da.order_id = o.id
                WHERE da.route_id = :rid AND da.assignment_date = :dt
                ORDER BY da.sequence ASC, da.id ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([':rid' => $routeId, ':dt' => $date]);
        $stops = $stmt->fetchAll();

        // Fetch line items for each stop's order
        $orderIds = array_filter(array_column($stops, 'order_id'));
        $itemsMap = [];
        if (!empty($orderIds)) {
            $inClause = implode(',', array_fill(0, count($orderIds), '?'));
            $stmtItems = $pdo->prepare("SELECT * FROM order_items WHERE order_id IN ({$inClause})");
            $stmtItems->execute(array_values($orderIds));
            foreach ($stmtItems->fetchAll() as $it) {
                $itemsMap[$it['order_id']][] = $it;
            }
        }

        $totalCashToCollect = 0;
        $totalUnits = 0;
        foreach ($stops as &$s) {
            $s['items'] = $itemsMap[$s['order_id']] ?? [];
            if (($s['payment_status'] ?? 'Unpaid') !== 'Paid') {
                $totalCashToCollect += (float)($s['total_amount'] ?? 0);
            }
            $totalUnits += (float)($s['total_qty'] ?? 0);
        }

        jsonResponse([
            'success' => true,
            'route' => $route,
            'assignment_date' => $date,
            'delivery_person' => $stops[0]['delivery_person'] ?? $route['default_delivery_person'],
            'summary' => [
                'total_stops' => count($stops),
                'total_units' => $totalUnits,
                'total_cod_amount' => $totalCashToCollect
            ],
            'stops' => $stops
        ]);
    }

    // 1D. Template Columns Reference
    if ($action === 'template_columns') {
        jsonResponse([
            'success' => true,
            'columns' => [
                'Route ID',
                'Route Name',
                'Sequence',
                'Customer ID',
                'Customer Name',
                'Address',
                'Area',
                'Order Number',
                'Delivery Person'
            ],
            'sample_row' => [
                'Route ID' => 'RT-NORTH',
                'Route Name' => 'Civil Lines & Swaroop Nagar Beat',
                'Sequence' => 1,
                'Customer ID' => 'P001',
                'Customer Name' => 'Shri Ram Kirana Store',
                'Address' => '14/12 Civil Lines, Near Green Park',
                'Area' => 'Civil Lines',
                'Order Number' => 'ORD-2026-5001',
                'Delivery Person' => 'Rahul Sharma (SO-101)'
            ]
        ]);
    }

    errorResponse("Unsupported GET action: {$action}", 400);
}

/**
 * Helper: Normalize field keys from Route Excel rows
 */
function normalizeRouteRow(array $raw): array {
    $map = [];
    foreach ($raw as $k => $v) {
        $cleanKey = preg_replace('/[^a-z0-9]/', '', strtolower(trim((string)$k)));
        $map[$cleanKey] = is_string($v) ? trim($v) : $v;
    }

    $routeId = $map['routeid'] ?? $map['routecode'] ?? '';
    $routeName = $map['routename'] ?? $map['route'] ?? $map['beat'] ?? '';
    $seq = max(1, (int)($map['sequence'] ?? $map['seq'] ?? $map['stop'] ?? $map['stopno'] ?? 1));
    $custId = $map['customerid'] ?? $map['partyid'] ?? '';
    $custName = $map['customername'] ?? $map['partyname'] ?? $map['party'] ?? $map['customer'] ?? '';
    $address = $map['address'] ?? $map['location'] ?? '';
    $area = $map['area'] ?? $map['locality'] ?? '';
    $orderNo = $map['ordernumber'] ?? $map['orderno'] ?? $map['orderid'] ?? $map['order'] ?? '';
    $delivPerson = $map['deliveryperson'] ?? $map['deliveryboy'] ?? $map['deliveryagent'] ?? $map['assignedto'] ?? '';

    return [
        'route_id' => $routeId,
        'route_name' => $routeName,
        'sequence' => $seq,
        'customer_id' => $custId,
        'customer_name' => $custName,
        'address' => $address,
        'area' => $area,
        'order_number' => $orderNo,
        'delivery_person' => $delivPerson,
        'raw' => $raw
    ];
}

/**
 * 2. POST Requests: Preview, Execute Import, Reassign, Reorder, Update Status
 */
if ($method === 'POST') {
    $input = getJsonInput();
    $subAction = $_GET['action'] ?? $input['action'] ?? 'preview';

    // 2A. PREVIEW ROUTE ASSIGNMENTS
    if ($subAction === 'preview') {
        $rows = $input['rows'] ?? [];
        $allowNewRoutes = !empty($input['allow_new_routes']);
        $assignDate = $input['date'] ?? date('Y-m-d');

        if (!is_array($rows) || empty($rows)) {
            errorResponse('No rows supplied in route assignment payload', 400);
        }

        // Cache existing parties, orders, and delivery routes
        $parties = $pdo->query("SELECT id, name, address, route, phone FROM parties")->fetchAll();
        $partyById = [];
        $partyByName = [];
        foreach ($parties as $p) {
            $partyById[strtoupper($p['id'])] = $p;
            $partyByName[strtolower(trim($p['name']))] = $p;
        }

        $orders = $pdo->query("SELECT id, store_name, status, total_amount, route FROM orders")->fetchAll();
        $orderById = [];
        foreach ($orders as $o) {
            $orderById[strtoupper($o['id'])] = $o;
        }

        $routes = $pdo->query("SELECT * FROM delivery_routes")->fetchAll();
        $routeById = [];
        $routeByName = [];
        foreach ($routes as $r) {
            $routeById[strtoupper($r['id'])] = $r;
            $routeByName[strtolower(trim($r['name']))] = $r;
        }

        // Check already assigned orders for this date
        $stmtExistingAssigned = $pdo->prepare("SELECT order_id, route_id FROM delivery_assignments WHERE assignment_date = :dt AND order_id IS NOT NULL");
        $stmtExistingAssigned->execute([':dt' => $assignDate]);
        $alreadyAssigned = [];
        foreach ($stmtExistingAssigned->fetchAll() as $ea) {
            $alreadyAssigned[strtoupper($ea['order_id'])] = $ea['route_id'];
        }

        $matched = [];
        $unmatched = [];
        $seenOrdersInBatch = [];

        foreach ($rows as $idx => $r) {
            $rowNum = $idx + 2;
            $norm = normalizeRouteRow($r);

            // 1. Validate Customer
            $matchedParty = null;
            if (!empty($norm['customer_id']) && isset($partyById[strtoupper($norm['customer_id'])])) {
                $matchedParty = $partyById[strtoupper($norm['customer_id'])];
            } elseif (!empty($norm['customer_name']) && isset($partyByName[strtolower($norm['customer_name'])])) {
                $matchedParty = $partyByName[strtolower($norm['customer_name'])];
            }

            if (!$matchedParty && empty($norm['customer_name'])) {
                $unmatched[] = [
                    'row' => $rowNum,
                    'reason' => 'Customer could not be matched by ID or Name',
                    'data' => $norm
                ];
                continue;
            }

            // Fill address/name from matched party if missing in excel
            if ($matchedParty) {
                if (empty($norm['customer_name'])) $norm['customer_name'] = $matchedParty['name'];
                if (empty($norm['customer_id'])) $norm['customer_id'] = $matchedParty['id'];
                if (empty($norm['address'])) $norm['address'] = $matchedParty['address'];
            }

            // 2. Validate Order
            $matchedOrder = null;
            if (!empty($norm['order_number'])) {
                $orderKey = strtoupper($norm['order_number']);
                if (isset($orderById[$orderKey])) {
                    $matchedOrder = $orderById[$orderKey];

                    // Data protection rule: Validate order is eligible for delivery (NOT Cancelled)
                    if (in_array($matchedOrder['status'], ['Cancelled by Customer', 'Cancelled by Company/Admin', 'Cancelled'])) {
                        $unmatched[] = [
                            'row' => $rowNum,
                            'reason' => "Order {$norm['order_number']} is CANCELLED ({$matchedOrder['status']}) and ineligible for delivery assignment",
                            'data' => $norm
                        ];
                        continue;
                    }

                    // Data protection rule: Do not assign same order to multiple active delivery routes
                    if (isset($alreadyAssigned[$orderKey])) {
                        $unmatched[] = [
                            'row' => $rowNum,
                            'reason' => "Order {$norm['order_number']} is already assigned to active route '{$alreadyAssigned[$orderKey]}' on {$assignDate}",
                            'data' => $norm
                        ];
                        continue;
                    }

                    if (isset($seenOrdersInBatch[$orderKey])) {
                        $unmatched[] = [
                            'row' => $rowNum,
                            'reason' => "Duplicate assignment in uploaded Excel: Order {$norm['order_number']} appears on multiple rows (Row {$seenOrdersInBatch[$orderKey]} and Row {$rowNum})",
                            'data' => $norm
                        ];
                        continue;
                    }
                    $seenOrdersInBatch[$orderKey] = $rowNum;

                } else {
                    $unmatched[] = [
                        'row' => $rowNum,
                        'reason' => "Order Number '{$norm['order_number']}' not found in database",
                        'data' => $norm
                    ];
                    continue;
                }
            }

            // 3. Validate Route
            $matchedRoute = null;
            if (!empty($norm['route_id']) && isset($routeById[strtoupper($norm['route_id'])])) {
                $matchedRoute = $routeById[strtoupper($norm['route_id'])];
            } elseif (!empty($norm['route_name']) && isset($routeByName[strtolower($norm['route_name'])])) {
                $matchedRoute = $routeByName[strtolower($norm['route_name'])];
            }

            if (!$matchedRoute) {
                if (!$allowNewRoutes) {
                    $unmatched[] = [
                        'row' => $rowNum,
                        'reason' => "Route '{$norm['route_id']}' / '{$norm['route_name']}' does not exist. (Enable 'Allow creating new routes' to auto-register)",
                        'data' => $norm
                    ];
                    continue;
                }
                // Allowed to create new route
                $newRouteId = !empty($norm['route_id']) ? strtoupper($norm['route_id']) : ('RT-' . strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $norm['route_name']), 0, 6)));
                $matchedRoute = [
                    'id' => $newRouteId,
                    'name' => $norm['route_name'] ?: 'New Beat Route',
                    'area' => $norm['area'],
                    'is_new' => true
                ];
            }

            // 4. Validate Delivery Person
            $dp = $norm['delivery_person'] ?: ($matchedRoute['default_delivery_person'] ?? 'Delivery Executive');

            $matched[] = [
                'row' => $rowNum,
                'route_id' => $matchedRoute['id'],
                'route_name' => $matchedRoute['name'],
                'sequence' => $norm['sequence'],
                'customer_id' => $norm['customer_id'],
                'customer_name' => $norm['customer_name'],
                'address' => $norm['address'],
                'area' => $norm['area'],
                'order_number' => $norm['order_number'],
                'delivery_person' => $dp,
                'order_amount' => $matchedOrder['total_amount'] ?? 0,
                'is_new_route' => !empty($matchedRoute['is_new'])
            ];
        }

        jsonResponse([
            'success' => true,
            'summary' => [
                'total_rows' => count($rows),
                'valid_count' => count($matched),
                'invalid_count' => count($unmatched),
                'routes_affected' => count(array_unique(array_column($matched, 'route_id'))),
                'delivery_personnel' => array_values(array_unique(array_column($matched, 'delivery_person')))
            ],
            'matched_records' => $matched,
            'unmatched_records' => $unmatched
        ]);
    }

    // 2B. EXECUTE ROUTE ASSIGNMENTS TRANSACTION
    if ($subAction === 'execute') {
        $assignments = $input['assignments'] ?? [];
        $assignDate = $input['date'] ?? date('Y-m-d');
        $adminUser = $input['admin_user'] ?? 'Administrator';
        $fileName = $input['file_name'] ?? 'route_assignment_' . date('Ymd_His') . '.xlsx';

        if (!is_array($assignments) || empty($assignments)) {
            errorResponse('No valid assignments supplied to execute', 400);
        }

        $pdo->beginTransaction();
        $batchId = 'ROUTE-BATCH-' . date('Ymd-His') . '-' . substr(uniqid(), -4);

        try {
            // Prepared statements
            if (Database::getDriver() === 'sqlite') {
                $stmtNewRoute = $pdo->prepare("INSERT OR IGNORE INTO delivery_routes (id, name, area, default_delivery_person) VALUES (:id, :name, :area, :dp)");
            } else {
                $stmtNewRoute = $pdo->prepare("INSERT INTO delivery_routes (id, name, area, default_delivery_person) VALUES (:id, :name, :area, :dp) ON DUPLICATE KEY UPDATE default_delivery_person=VALUES(default_delivery_person)");
            }

            $stmtAssign = $pdo->prepare("INSERT INTO delivery_assignments (
                route_id, sequence, order_id, customer_id, customer_name, address, area, 
                delivery_person, assignment_date, delivery_status, import_batch_id
            ) VALUES (
                :rid, :seq, :oid, :cid, :cname, :addr, :area, 
                :dp, :dt, 'Assigned', :batch_id
            )");

            // Update order status to 'Ready for Delivery' or 'Dispatched'
            $stmtUpdateOrder = $pdo->prepare("UPDATE orders SET status = 'Ready for Delivery' WHERE id = :oid AND status IN ('Pending', 'Submitted', 'Confirmed', 'Processing')");

            $savedCount = 0;
            foreach ($assignments as $a) {
                // Ensure route exists
                $stmtNewRoute->execute([
                    ':id' => $a['route_id'],
                    ':name' => $a['route_name'] ?? $a['route_id'],
                    ':area' => $a['area'] ?? '',
                    ':dp' => $a['delivery_person']
                ]);

                // Insert assignment stop
                $stmtAssign->execute([
                    ':rid' => $a['route_id'],
                    ':seq' => (int)($a['sequence'] ?? 1),
                    ':oid' => $a['order_number'] ?: null,
                    ':cid' => $a['customer_id'] ?: null,
                    ':cname' => $a['customer_name'],
                    ':addr' => $a['address'] ?? '',
                    ':area' => $a['area'] ?? '',
                    ':dp' => $a['delivery_person'],
                    ':dt' => $assignDate,
                    ':batch_id' => $batchId
                ]);

                // Advance order status
                if (!empty($a['order_number'])) {
                    $stmtUpdateOrder->execute([':oid' => $a['order_number']]);
                }

                $savedCount++;
            }

            // Record in import_batches
            $stmtBatch = $pdo->prepare("INSERT INTO import_batches (
                id, batch_type, file_name, uploaded_by, mode, total_rows, inserted_rows, status
            ) VALUES (
                :id, 'delivery_routes', :file, :user, 'insert_route', :tot, :ins, 'Success'
            )");
            $stmtBatch->execute([
                ':id' => $batchId,
                ':file' => $fileName,
                ':user' => $adminUser,
                ':tot' => count($assignments),
                ':ins' => $savedCount
            ]);

            // Audit log
            $stmtAudit = $pdo->prepare("INSERT INTO audit_logs (action, entity_type, entity_id, new_values, performed_by, batch_id) VALUES ('bulk_route_assignment', 'delivery_assignments', :id, :vals, :by, :batch)");
            $stmtAudit->execute([
                ':id' => $batchId,
                ':vals' => json_encode(['count' => $savedCount, 'date' => $assignDate]),
                ':by' => $adminUser,
                ':batch' => $batchId
            ]);

            $pdo->commit();

            jsonResponse([
                'success' => true,
                'batch_id' => $batchId,
                'assigned_count' => $savedCount,
                'assignment_date' => $assignDate,
                'message' => "Successfully created {$savedCount} delivery assignments across routes for {$assignDate}"
            ], 201);

        } catch (Exception $e) {
            $pdo->rollBack();
            errorResponse("Route assignment transaction failed: " . $e->getMessage(), 500);
        }
    }

    // 2C. REASSIGN DELIVERY PERSON OR REORDER SEQUENCE
    if ($subAction === 'reassign') {
        $routeId = $input['route_id'] ?? '';
        $assignmentId = $input['assignment_id'] ?? $input['id'] ?? '';
        $newPerson = trim($input['delivery_person'] ?? '');
        $date = $input['date'] ?? date('Y-m-d');
        $adminUser = $input['admin_user'] ?? 'Admin';

        if (empty($newPerson)) {
            errorResponse('New delivery person name is required', 400);
        }

        if ($assignmentId) {
            $stmt = $pdo->prepare("UPDATE delivery_assignments SET delivery_person = :dp, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
            $stmt->execute([':dp' => $newPerson, ':id' => $assignmentId]);
        } elseif ($routeId) {
            $stmt = $pdo->prepare("UPDATE delivery_assignments SET delivery_person = :dp, updated_at = CURRENT_TIMESTAMP WHERE route_id = :rid AND assignment_date = :dt");
            $stmt->execute([':dp' => $newPerson, ':rid' => $routeId, ':dt' => $date]);

            // Also update default delivery person in route
            $stmtR = $pdo->prepare("UPDATE delivery_routes SET default_delivery_person = :dp WHERE id = :rid");
            $stmtR->execute([':dp' => $newPerson, ':rid' => $routeId]);
        } else {
            errorResponse('assignment_id or route_id required', 400);
        }

        // Audit log
        try {
            $stmtAudit = $pdo->prepare("INSERT INTO audit_logs (action, entity_type, entity_id, new_values, performed_by) VALUES ('reassign_delivery_person', 'delivery_routes', :id, :vals, :by)");
            $stmtAudit->execute([
                ':id' => $routeId ?: (string)$assignmentId,
                ':vals' => json_encode(['new_person' => $newPerson]),
                ':by' => $adminUser
            ]);
        } catch (Exception $e) {}

        jsonResponse([
            'success' => true,
            'message' => "Delivery person updated to {$newPerson}"
        ]);
    }

    // 2D. REORDER STOPS SEQUENCE
    if ($subAction === 'reorder') {
        $stops = $input['stops'] ?? []; // [{ id: 1, sequence: 1 }, { id: 2, sequence: 2 }]
        if (!is_array($stops) || empty($stops)) {
            errorResponse('Stops array with id and sequence required', 400);
        }

        $stmt = $pdo->prepare("UPDATE delivery_assignments SET sequence = :seq, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
        $pdo->beginTransaction();
        try {
            foreach ($stops as $s) {
                if (!empty($s['id']) && isset($s['sequence'])) {
                    $stmt->execute([':seq' => (int)$s['sequence'], ':id' => $s['id']]);
                }
            }
            $pdo->commit();
            jsonResponse(['success' => true, 'message' => 'Stop sequence updated successfully']);
        } catch (Exception $e) {
            $pdo->rollBack();
            errorResponse("Failed to update sequence: " . $e->getMessage(), 500);
        }
    }

    // 2E. UPDATE DELIVERY STATUS (Assigned -> In Transit -> Delivered / Failed)
    if ($subAction === 'update_status') {
        $assignmentId = $input['assignment_id'] ?? $input['id'] ?? '';
        $newStatus = $input['status'] ?? '';
        $adminUser = $input['admin_user'] ?? 'Admin';

        $allowedStatuses = ['Assigned', 'In Transit', 'Delivered', 'Failed', 'Returned'];
        if (!in_array($newStatus, $allowedStatuses)) {
            errorResponse('Invalid status. Allowed: ' . implode(', ', $allowedStatuses), 400);
        }

        $stmt = $pdo->prepare("SELECT * FROM delivery_assignments WHERE id = :id");
        $stmt->execute([':id' => $assignmentId]);
        $assign = $stmt->fetch();

        if (!$assign) {
            errorResponse('Delivery assignment not found', 404);
        }

        $pdo->beginTransaction();
        try {
            $stmtUpd = $pdo->prepare("UPDATE delivery_assignments SET delivery_status = :st, updated_at = CURRENT_TIMESTAMP WHERE id = :id");
            $stmtUpd->execute([':st' => $newStatus, ':id' => $assignmentId]);

            // If order attached, sync order status
            if (!empty($assign['order_id'])) {
                if ($newStatus === 'Delivered') {
                    $stmtOrd = $pdo->prepare("UPDATE orders SET status = 'Delivered', payment_status = 'Paid' WHERE id = :oid");
                    $stmtOrd->execute([':oid' => $assign['order_id']]);
                } elseif ($newStatus === 'In Transit') {
                    $stmtOrd = $pdo->prepare("UPDATE orders SET status = 'Dispatched' WHERE id = :oid");
                    $stmtOrd->execute([':oid' => $assign['order_id']]);
                }
            }

            $pdo->commit();
            jsonResponse([
                'success' => true,
                'assignment_id' => $assignmentId,
                'new_status' => $newStatus,
                'message' => "Delivery stop status updated to {$newStatus}"
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            errorResponse("Failed to update status: " . $e->getMessage(), 500);
        }
    }

    errorResponse("Unsupported POST action: {$subAction}", 400);
}

errorResponse("Method {$method} not allowed", 405);

