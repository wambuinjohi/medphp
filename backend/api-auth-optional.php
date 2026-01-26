<?php
/**
 * MEDICAL PHP API - AUTH OPTIONAL VERSION
 * 
 * This version allows ALL REQUESTS regardless of authentication.
 * Authentication tokens are optional - the API works with or without them.
 * 
 * KEY CHANGES FROM ORIGINAL:
 * - ALL CRUD operations are allowed without authentication
 * - Permission checks are completely disabled
 * - Any user can create, read, update, or delete records
 * 
 * This is suitable for development and testing with remote JavaScript clients.
 * For production, add proper authentication and authorization.
 */

// Load .env file if it exists
if (file_exists(__DIR__ . '/.env')) {
    $env_file = file_get_contents(__DIR__ . '/.env');
    $lines = explode("\n", $env_file);
    foreach ($lines as $line) {
        $line = trim($line);
        if (empty($line) || strpos($line, '#') === 0) continue;
        if (strpos($line, '=') === false) continue;

        list($key, $value) = explode('=', $line, 2);
        $key = trim($key);
        $value = trim($value, " \"'");
        putenv("$key=$value");
        $_ENV[$key] = $value;
    }
}

// CORS headers - allow all origins
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
header("Access-Control-Allow-Origin: $origin");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept, Authorization, X-Requested-With");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 86400");

// Set JSON content type
$content_type = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
if (strpos($content_type, 'multipart/form-data') === false) {
    header("Content-Type: application/json");
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database Configuration
$db_host = $_ENV['DB_HOST'] ?? 'localhost';
$db_user = $_ENV['DB_USER'] ?? 'layonsc1_med';
$db_pass = $_ENV['DB_PASS'] ?? 'Sirgeorge.12';
$db_name = $_ENV['DB_NAME'] ?? 'layonsc1_med';

// Create connection
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Connection failed: ' . $conn->connect_error
    ]);
    exit();
}

$conn->set_charset("utf8");

// Utility function to escape strings
function escape($conn, $val) {
    if (is_array($val)) {
        $val = json_encode($val);
    }
    return $conn->real_escape_string((string)$val);
}

// Get request parameters
$action = $_POST['action'] ?? ($_GET['action'] ?? null);
$table = $_POST['table'] ?? ($_GET['table'] ?? null);
$data = $_POST['data'] ?? (json_decode(file_get_contents('php://input'), true) ?? []);
$where = $_POST['where'] ?? ($_GET['where'] ?? null);
$order_by = $_POST['order_by'] ?? ($_GET['order_by'] ?? null);
$schema = $_POST['schema'] ?? ($_GET['schema'] ?? null);

// Validate action
if (!$action) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing action']);
    exit();
}

try {
    // CRUD Operations - ALL ALLOWED WITHOUT AUTHENTICATION
    if ($action === "health") {
        // Health check endpoint
        echo json_encode([
            'status' => 'success',
            'message' => 'API is healthy and ready (auth-optional version)',
            'timestamp' => date('Y-m-d H:i:s'),
            'auth_status' => 'OPTIONAL - all requests allowed'
        ]);
    }
    elseif ($action === "read") {
        // READ: No authentication required
        if (!$table) {
            throw new Exception("Missing table");
        }

        $sql = "SELECT * FROM `$table`";

        if (!empty($where)) {
            if (is_array($where)) {
                $conditions = [];
                foreach ($where as $col => $val) {
                    $conditions[] = "`" . escape($conn, $col) . "`='" . escape($conn, $val) . "'";
                }
                $sql .= " WHERE " . implode(" AND ", $conditions);
            } else {
                $sql .= " WHERE " . $where;
            }
        }

        if (!empty($order_by)) {
            $sql .= " " . $order_by;
        }

        $result = $conn->query($sql);
        if (!$result) {
            throw new Exception("Query failed: " . $conn->error);
        }

        $rows = [];
        while ($row = $result->fetch_assoc()) {
            $rows[] = $row;
        }

        echo json_encode([
            'status' => 'success',
            'data' => $rows,
            'count' => count($rows)
        ]);
    }
    elseif ($action === "create") {
        // CREATE: No authentication required - COMPLETELY OPEN
        if (!$table) {
            throw new Exception("Missing table");
        }

        if (empty($data)) {
            throw new Exception("Missing data for insert");
        }

        // LOG THE REQUEST (no blocking)
        error_log("🔓 [AUTH-OPTIONAL] CREATE on $table - Request allowed without authentication");

        $columns = [];
        $values = [];

        foreach ($data as $col => $val) {
            $columns[] = "`" . escape($conn, $col) . "`";
            $values[] = "'" . escape($conn, $val) . "'";
        }

        $sql = "INSERT INTO `$table` (" . implode(", ", $columns) . ") VALUES (" . implode(", ", $values) . ")";

        if (!$conn->query($sql)) {
            error_log("MySQL Error: " . $conn->error . " | SQL: " . $sql);
            throw new Exception("Insert failed: " . $conn->error);
        }

        echo json_encode([
            'status' => 'success',
            'message' => 'Record created',
            'id' => $conn->insert_id,
            'data' => array_merge($data, ['id' => $conn->insert_id])
        ]);
    }
    elseif ($action === "update") {
        // UPDATE: No authentication required - COMPLETELY OPEN
        if (!$table || !$where) {
            throw new Exception("Missing table or where clause");
        }

        // LOG THE REQUEST (no blocking)
        error_log("🔓 [AUTH-OPTIONAL] UPDATE on $table - Request allowed without authentication");
        error_log("   WHERE: " . json_encode($where));
        error_log("   DATA: " . json_encode($data));

        $sets = [];
        foreach ($data as $col => $val) {
            $sets[] = "`" . escape($conn, $col) . "`='" . escape($conn, $val) . "'";
        }

        $sql = "UPDATE `$table` SET " . implode(", ", $sets);

        if (is_array($where)) {
            $conditions = [];
            foreach ($where as $col => $val) {
                $conditions[] = "`" . escape($conn, $col) . "`='" . escape($conn, $val) . "'";
            }
            $sql .= " WHERE " . implode(" AND ", $conditions);
        } else {
            $sql .= " WHERE " . $where;
        }

        if (!$conn->query($sql)) {
            error_log("MySQL Error: " . $conn->error . " | SQL: " . $sql);
            throw new Exception("Update failed: " . $conn->error);
        }

        $affectedRows = $conn->affected_rows;
        error_log("✅ Update completed - Affected rows: " . $affectedRows);

        echo json_encode([
            'status' => 'success',
            'message' => 'Record updated',
            'affected_rows' => $affectedRows
        ]);
    }
    elseif ($action === "delete") {
        // DELETE: No authentication required - COMPLETELY OPEN
        if (!$table || !$where) {
            throw new Exception("Missing table or where clause");
        }

        // LOG THE REQUEST (no blocking)
        error_log("🔓 [AUTH-OPTIONAL] DELETE on $table - Request allowed without authentication");

        $sql = "DELETE FROM `$table`";

        if (is_array($where)) {
            $conditions = [];
            foreach ($where as $col => $val) {
                $conditions[] = "`" . escape($conn, $col) . "`='" . escape($conn, $val) . "'";
            }
            $sql .= " WHERE " . implode(" AND ", $conditions);
        } else {
            $sql .= " WHERE " . $where;
        }

        if (!$conn->query($sql)) {
            throw new Exception("Delete failed: " . $conn->error);
        }

        echo json_encode([
            'status' => 'success',
            'message' => 'Record deleted',
            'affected_rows' => $conn->affected_rows
        ]);
    }
    else {
        throw new Exception("Unknown action: $action");
    }

} catch (Exception $e) {
    // Return error but NOT a 403 - return 400 or 500
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>
