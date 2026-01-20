<?php
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

// Don't force Content-Type for file uploads (multipart/form-data)
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
$db_user = $_ENV['DB_USER'] ?? 'wayrusc1_med';
$db_pass = $_ENV['DB_PASS'] ?? 'Sirgeorge.12';
$db_name = $_ENV['DB_NAME'] ?? 'wayrusc1_med';

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

// Validate action
if (!$action) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing action']);
    exit();
}

// ============================================
// Authentication Helper Functions
// ============================================

// Hash password using PHP's built-in function
function hashPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT);
}

// Verify password
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

// Create JWT token
function createJWT($user_id, $user_email, $user_role) {
    $secret = $_ENV['JWT_SECRET'] ?? 'wayrus-secret-key-2024';
    $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $payload = base64_encode(json_encode([
        'sub' => $user_id,
        'email' => $user_email,
        'role' => $user_role,
        'iat' => time(),
        'exp' => time() + (24 * 60 * 60) // 24 hours
    ]));
    $signature = base64_encode(hash_hmac('sha256', "$header.$payload", $secret, true));
    return "$header.$payload.$signature";
}

// Verify JWT token
function verifyJWT($token) {
    if (!$token) return null;
    $secret = $_ENV['JWT_SECRET'] ?? 'wayrus-secret-key-2024';
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    list($header, $payload, $signature) = $parts;

    // Verify signature
    $expected_signature = base64_encode(hash_hmac('sha256', "$header.$payload", $secret, true));
    if ($signature !== $expected_signature) return null;

    // Decode payload
    $decoded = json_decode(base64_decode($payload), true);
    if (!$decoded) return null;

    // Check expiration
    if ($decoded['exp'] < time()) return null;

    return $decoded;
}

try {
    if ($action === "health") {
        echo json_encode(['status' => 'success', 'message' => 'API is healthy']);
    }
    elseif ($action === "login") {
        // LOGIN ENDPOINT
        $json_body = json_decode(file_get_contents('php://input'), true) ?? [];
        $email = $_POST['email'] ?? ($json_body['email'] ?? null);
        $password = $_POST['password'] ?? ($json_body['password'] ?? null);

        if (!$email || !$password) {
            http_response_code(400);
            throw new Exception("Missing email or password");
        }

        $email = escape($conn, $email);
        $sql = "SELECT id, email, password, role FROM users WHERE email = '$email' LIMIT 1";
        $result = $conn->query($sql);

        if (!$result || $result->num_rows === 0) {
            http_response_code(401);
            throw new Exception("Invalid email or password");
        }

        $user = $result->fetch_assoc();

        // Support both bcrypt and MD5 hashes for backwards compatibility
        $passwordMatch = verifyPassword($password, $user['password']) ||
                        ($user['password'] === md5($password)) ||
                        ($user['password'] === $password);

        if (!$passwordMatch) {
            http_response_code(401);
            throw new Exception("Invalid email or password");
        }

        // Create JWT token
        $token = createJWT($user['id'], $user['email'], $user['role']);

        echo json_encode([
            'status' => 'success',
            'message' => 'Login successful',
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'role' => $user['role']
            ]
        ]);
    }
    elseif ($action === "logout") {
        // LOGOUT ENDPOINT
        echo json_encode(['status' => 'success', 'message' => 'Logout successful']);
    }
    elseif ($action === "check_auth") {
        // CHECK AUTH ENDPOINT
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? null;
        $token = null;

        if ($auth_header && preg_match('/Bearer\s+(\S+)/', $auth_header, $matches)) {
            $token = $matches[1];
        }

        // Fallback to POST data for compatibility
        if (!$token) {
            $token = $_POST['token'] ?? null;
        }

        if (!$token) {
            http_response_code(401);
            throw new Exception("Not authenticated");
        }

        $decoded = verifyJWT($token);
        if (!$decoded) {
            http_response_code(401);
            throw new Exception("Not authenticated");
        }

        echo json_encode([
            'status' => 'success',
            'id' => $decoded['sub'],
            'email' => $decoded['email'],
            'role' => $decoded['role']
        ]);
    }
    elseif ($action === "upload_file") {
        // FILE UPLOAD - No authentication required
        if (!isset($_FILES['file'])) {
            http_response_code(400);
            throw new Exception("No file provided");
        }

        $file = $_FILES['file'];
        $filename = $_POST['filename'] ?? $file['name'];

        // Validate file
        if ($file['error'] !== UPLOAD_ERR_OK) {
            $error_messages = [
                UPLOAD_ERR_INI_SIZE => 'File exceeds php.ini upload_max_filesize',
                UPLOAD_ERR_FORM_SIZE => 'File exceeds form MAX_FILE_SIZE',
                UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
                UPLOAD_ERR_NO_FILE => 'No file was uploaded',
                UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
                UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
                UPLOAD_ERR_EXTENSION => 'Extension not allowed',
            ];
            $error_msg = $error_messages[$file['error']] ?? 'Unknown upload error';
            throw new Exception("File upload error: $error_msg");
        }

        // Validate file type (images only)
        $allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!in_array($file['type'], $allowed_types)) {
            throw new Exception("Invalid file type. Only images are allowed. Got: " . $file['type']);
        }

        // Validate file size (5MB limit)
        if ($file['size'] > 5 * 1024 * 1024) {
            throw new Exception("File too large. Maximum size is 5MB. Got: " . ($file['size'] / 1024 / 1024) . "MB");
        }

        // Create uploads directory if it doesn't exist
        $uploads_dir = dirname(__DIR__) . '/public/uploads';
        if (!is_dir($uploads_dir)) {
            if (!mkdir($uploads_dir, 0755, true)) {
                throw new Exception("Failed to create uploads directory at $uploads_dir");
            }
        }

        // Verify directory is writable
        if (!is_writable($uploads_dir)) {
            throw new Exception("Uploads directory is not writable. Check permissions.");
        }

        // Generate safe filename
        $file_ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $safe_filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($filename, PATHINFO_FILENAME));
        $safe_filename = $safe_filename . '-' . time() . '.' . $file_ext;

        $upload_path = $uploads_dir . '/' . $safe_filename;

        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $upload_path)) {
            throw new Exception("Failed to save uploaded file to $upload_path");
        }

        // Verify file was saved
        if (!file_exists($upload_path)) {
            throw new Exception("File was moved but cannot be found at $upload_path");
        }

        // Construct the public URL
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'];
        $file_url = "$protocol://$host/uploads/$safe_filename";

        echo json_encode([
            'status' => 'success',
            'message' => 'File uploaded successfully',
            'url' => $file_url,
            'file_url' => $file_url,
            'path' => "/uploads/$safe_filename",
            'filename' => $safe_filename
        ]);
    }
    elseif ($action === "read") {
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
        if (!$table) {
            throw new Exception("Missing table");
        }

        if (empty($data)) {
            throw new Exception("Missing data for insert");
        }

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
        if (!$table || !$where) {
            throw new Exception("Missing table or where clause");
        }

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

        echo json_encode([
            'status' => 'success',
            'message' => 'Record updated',
            'affected_rows' => $affectedRows
        ]);
    }
    elseif ($action === "delete") {
        if (!$table || !$where) {
            throw new Exception("Missing table or where clause");
        }

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
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>
