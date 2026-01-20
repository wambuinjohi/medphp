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

// CORS headers - allow credentials with dynamic origin
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
    // Handle arrays by JSON encoding them
    if (is_array($val)) {
        $val = json_encode($val);
    }
    return $conn->real_escape_string((string)$val);
}

// Hash password using PHP's built-in function
function hashPassword($password) {
    return password_hash($password, PASSWORD_BCRYPT);
}

// Verify password
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

// Start session for cookie-based auth
session_start();

// Parse REST-style request from .htaccess rewrite
function parseRestRequest($request) {
    $request = trim($request, '/');
    $parts = explode('/', $request);

    return [
        'segments' => $parts,
        'method' => $_SERVER['REQUEST_METHOD'],
        'path' => $request
    ];
}

// Read JSON body once (to avoid stream exhaustion)
$json_body = null;
$request_method = $_SERVER['REQUEST_METHOD'];
$content_type = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';

if (in_array($request_method, ['POST', 'PUT', 'PATCH'])) {
    if (strpos($content_type, 'application/json') !== false) {
        $raw_input = file_get_contents('php://input');
        if ($raw_input) {
            $json_body = json_decode($raw_input, true);
        }
    }
}

// Get request parameters
$action = $_POST['action'] ?? ($_GET['action'] ?? null);
$table = $_POST['table'] ?? ($_GET['table'] ?? null);
$data = $_POST['data'] ?? ($json_body ?? []);
$where = $_POST['where'] ?? ($_GET['where'] ?? null);
$order_by = $_POST['order_by'] ?? ($_GET['order_by'] ?? null);
$schema = $_POST['schema'] ?? ($_GET['schema'] ?? null);

// Handle file uploads endpoint
$request_uri = $_SERVER['REQUEST_URI'] ?? '';
$path_info = $_SERVER['PATH_INFO'] ?? '';
$request_param_check = $_GET['request'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' &&
    (preg_match('/\/api\/uploads?(?:\?|$)/i', $request_uri) ||
     preg_match('/\/uploads?(?:\?|$)/i', $path_info) ||
     preg_match('/uploads?/i', $request_param_check)) &&
    isset($_FILES['file'])) {
    $action = 'upload_file';
    error_log('🔵 File upload detected - action set to upload_file');
}

// Debug logging for update operations
if ($action === 'update') {
    error_log("UPDATE DEBUG: Table: " . $table . " | Where: " . json_encode($where));
    error_log("UPDATE DEBUG: Data count: " . count($data) . " | Data: " . json_encode($data));
}

// Handle REST-style requests from .htaccess rewrite
$request_param = $_GET['request'] ?? null;
if ($request_param && !$action) {
    $rest = parseRestRequest($request_param);
    $segments = $rest['segments'];
    $method = $rest['method'];

    // Map REST routes to PHP API actions
    if (count($segments) >= 1) {
        // Handle /admin/* routes
        if ($segments[0] === 'admin') {
            if (count($segments) >= 2) {
                $adminAction = $segments[1];
                if ($adminAction === 'login') {
                    $action = 'login';
                    if ($method === 'POST' && $json_body) {
                        $_POST['email'] = $json_body['email'] ?? null;
                        $_POST['password'] = $json_body['password'] ?? null;
                    }
                } elseif ($adminAction === 'logout') {
                    $action = 'logout';
                } elseif ($adminAction === 'me') {
                    $action = 'check_auth';
                } elseif ($adminAction === 'users') {
                    if ($method === 'GET') {
                        $action = 'read';
                        $table = 'users';
                    } elseif ($method === 'POST') {
                        $action = 'create';
                        $table = 'users';
                        if ($json_body) {
                            $data = $json_body;
                        }
                    }
                }
                // Handle /admin/users/{id}
                if (count($segments) >= 3 && $segments[1] === 'users' && is_numeric($segments[2])) {
                    $userId = $segments[2];
                    if ($method === 'PUT') {
                        $action = 'update';
                        $table = 'users';
                        $where = ['id' => $userId];
                        if ($json_body) {
                            $data = $json_body;
                        }
                    } elseif ($method === 'DELETE') {
                        $action = 'delete';
                        $table = 'users';
                        $where = ['id' => $userId];
                    }
                }
            }
        }
        // Handle /chat endpoint
        elseif ($segments[0] === 'chat' && $method === 'POST') {
            $action = 'create';
            $table = 'chat_messages';
            if ($json_body) {
                $data = $json_body;
            }
        }
        // Handle /newsletter endpoint
        elseif ($segments[0] === 'newsletter' && $method === 'POST') {
            $action = 'create';
            $table = 'newsletter';
            if ($json_body) {
                $data = $json_body;
            }
        }
        // Handle table CRUD routes (contacts, quotations, portfolios, etc.)
        elseif (in_array($segments[0], ['contacts', 'quotations', 'portfolios', 'web_app_leads', 'web-leads', 'logs'])) {
            $table_name = $segments[0];
            if ($segments[0] === 'web-leads') $table_name = 'web_app_leads';

            $table = $table_name;

            if ($method === 'GET') {
                $action = 'read';
                // Parse query parameters for filtering
                foreach ($_GET as $key => $value) {
                    if ($key !== 'request' && $value) {
                        if (!is_array($where)) {
                            $where = [];
                        }
                        $where[$key] = $value;
                    }
                }
            } elseif ($method === 'POST' && count($segments) === 1) {
                $action = 'create';
                if ($json_body) {
                    $data = $json_body;
                }
            }
            // Handle /{table}/{id} routes
            elseif (count($segments) >= 2 && is_numeric($segments[1])) {
                $id = $segments[1];
                if ($method === 'PUT') {
                    $action = 'update';
                    $where = ['id' => $id];
                    if ($json_body) {
                        $data = $json_body;
                    }
                } elseif ($method === 'DELETE') {
                    $action = 'delete';
                    $where = ['id' => $id];
                }
            }
        }
    }
}

// Validate action
if (!$action) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Missing action']);
    exit();
}

// Ensure tables exist
function ensureTables($conn) {
    $tables = [
        'users' => 'id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) UNIQUE, password TEXT, role VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
        'profiles' => 'id INT PRIMARY KEY, email VARCHAR(255) NOT NULL, full_name VARCHAR(255), avatar_url TEXT, role VARCHAR(50) DEFAULT "user", status VARCHAR(50) DEFAULT "pending", phone VARCHAR(20), company_id INT, department VARCHAR(255), position VARCHAR(255), invited_by INT, invited_at TIMESTAMP NULL, last_login TIMESTAMP NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        'contacts' => 'id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), email VARCHAR(255), phone VARCHAR(20), subject VARCHAR(255), message TEXT, status VARCHAR(50) DEFAULT "new", reply_notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        'newsletter' => 'id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) UNIQUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
        'leads' => 'id INT AUTO_INCREMENT PRIMARY KEY, business_name VARCHAR(255), contact_person VARCHAR(255), phone VARCHAR(20), email VARCHAR(255), business_category VARCHAR(255), location VARCHAR(255), website_url VARCHAR(255), website_status VARCHAR(50), lead_source VARCHAR(50), expressed_need TEXT, notes TEXT, status VARCHAR(50), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        'quotations' => 'id INT AUTO_INCREMENT PRIMARY KEY, portfolio_id INT, customer_name VARCHAR(255), customer_email VARCHAR(255), customer_phone VARCHAR(20), project_description TEXT, budget_range VARCHAR(100), timeline VARCHAR(100), status VARCHAR(50) DEFAULT "new", notes TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        'portfolios' => 'id INT AUTO_INCREMENT PRIMARY KEY, admin_id INT, title VARCHAR(255), description TEXT, website_url VARCHAR(255) UNIQUE, screenshot_url VARCHAR(255), status VARCHAR(50) DEFAULT "pending", created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        'opportunities' => 'id INT AUTO_INCREMENT PRIMARY KEY, source VARCHAR(2048), snippet TEXT, url VARCHAR(2048), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
        'discovery_leads' => 'id INT AUTO_INCREMENT PRIMARY KEY, business_name VARCHAR(255), location VARCHAR(255), phone VARCHAR(20), email VARCHAR(255), website_url VARCHAR(255), website_status VARCHAR(50), notes TEXT, status VARCHAR(50) DEFAULT "new", created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        'logs' => 'id INT AUTO_INCREMENT PRIMARY KEY, message TEXT, level VARCHAR(50), source VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
    ];

    foreach ($tables as $table => $schema) {
        $sql = "CREATE TABLE IF NOT EXISTS `$table` ($schema)";
        $conn->query($sql);
    }
}

ensureTables($conn);

try {
    // File upload endpoint - supports logo and branding uploads
    if ($action === "upload_file") {
        error_log('🎯 Processing file upload...');

        if (!isset($_FILES['file'])) {
            http_response_code(400);
            throw new Exception("No file provided");
        }

        $file = $_FILES['file'];
        $filename = $_POST['filename'] ?? $file['name'];

        error_log('📁 File info - Name: ' . $file['name'] . ' | Size: ' . $file['size'] . ' | Type: ' . $file['type']);

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

        // Validate file type
        $allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!in_array($file['type'], $allowed_types)) {
            throw new Exception("Invalid file type. Only images are allowed. Got: " . $file['type']);
        }

        // Validate file size (5MB limit)
        if ($file['size'] > 5 * 1024 * 1024) {
            throw new Exception("File too large. Maximum size is 5MB. Got: " . ($file['size'] / 1024 / 1024) . "MB");
        }

        // Create uploads directory if it doesn't exist
        $uploads_dir = __DIR__ . '/uploads';
        if (!is_dir($uploads_dir)) {
            error_log('📂 Creating uploads directory at: ' . $uploads_dir);
            if (!mkdir($uploads_dir, 0755, true)) {
                throw new Exception("Failed to create uploads directory at $uploads_dir");
            }
            error_log('✅ Uploads directory created');
        } else {
            error_log('✅ Uploads directory exists at: ' . $uploads_dir);
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

        error_log('📝 Saving file to: ' . $upload_path);

        // Move uploaded file
        if (!move_uploaded_file($file['tmp_name'], $upload_path)) {
            throw new Exception("Failed to save uploaded file to $upload_path");
        }

        error_log('✅ File saved successfully');

        // Verify file was saved
        if (!file_exists($upload_path)) {
            throw new Exception("File was moved but cannot be found at $upload_path");
        }

        // Construct the public URL
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'];
        $file_url = "$protocol://$host/uploads/$safe_filename";

        error_log('🔗 File URL: ' . $file_url);

        echo json_encode([
            'status' => 'success',
            'message' => 'File uploaded successfully',
            'url' => $file_url,
            'file_url' => $file_url,
            'path' => "/uploads/$safe_filename",
            'filename' => $safe_filename
        ]);
        exit();
    }

    // Setup endpoint - create admin user
    if ($action === "setup") {
        $email = $_POST['email'] ?? $_GET['email'] ?? ($json_body['email'] ?? null);
        $password = $_POST['password'] ?? $_GET['password'] ?? ($json_body['password'] ?? null);

        if (!$email || !$password) {
            throw new Exception("Missing email or password");
        }

        $email = escape($conn, $email);
        $hashedPassword = hashPassword($password);

        // Check if user exists
        $check = $conn->query("SELECT id FROM users WHERE email = '$email'");

        if ($check->num_rows > 0) {
            // Update existing user
            $sql = "UPDATE users SET password = '$hashedPassword', role = 'admin' WHERE email = '$email'";
            if (!$conn->query($sql)) {
                throw new Exception("Update failed: " . $conn->error);
            }
            echo json_encode([
                'status' => 'success',
                'message' => 'Admin user updated',
                'email' => $email
            ]);
        } else {
            // Create new user
            $sql = "INSERT INTO users (email, password, role) VALUES ('$email', '$hashedPassword', 'admin')";
            if (!$conn->query($sql)) {
                throw new Exception("Insert failed: " . $conn->error);
            }
            echo json_encode([
                'status' => 'success',
                'message' => 'Admin user created',
                'id' => $conn->insert_id,
                'email' => $email
            ]);
        }
        exit();
    }

    // Helper function to create JWT token
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

    // Helper function to verify JWT token
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

    // Authentication
    if ($action === "login") {
        $email = $_POST['email'] ?? ($json_body['email'] ?? null);
        $password = $_POST['password'] ?? ($json_body['password'] ?? null);

        if (!$email || !$password) {
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
                        ($user['password'] === $password); // Raw password fallback

        if (!$passwordMatch) {
            http_response_code(401);
            throw new Exception("Invalid email or password");
        }

        // Create JWT token instead of session
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
        echo json_encode(['status' => 'success', 'message' => 'Logout successful']);
    }
    elseif ($action === "check_auth") {
        // Check for JWT token in Authorization header
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
    // CRUD Operations - All operations are now auth-optional (no permission checks required)
    elseif ($action === "create") {
        if (!$table) {
            throw new Exception("Missing table");
        }

        if (empty($data)) {
            throw new Exception("Missing data for insert");
        }

        // NOTE: Authentication is OPTIONAL for all operations in this remote PHP API
        // No requireAuthForModification check is performed

        $columns = [];
        $values = [];

        foreach ($data as $col => $val) {
            $columns[] = "`" . escape($conn, $col) . "`";
            $values[] = "'" . escape($conn, $val) . "'";
        }

        $sql = "INSERT INTO `$table` (" . implode(", ", $columns) . ") VALUES (" . implode(", ", $values) . ")";

        error_log("SQL INSERT: " . $sql);

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
    elseif ($action === "update") {
        if (!$table || !$where) {
            throw new Exception("Missing table or where clause");
        }

        // NOTE: Authentication is OPTIONAL for all operations in this remote PHP API
        // No permission checks required - anyone can update any table

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

        error_log("SQL UPDATE: " . $sql);

        if (!$conn->query($sql)) {
            error_log("MySQL Error: " . $conn->error . " | SQL: " . $sql);
            throw new Exception("Update failed: " . $conn->error);
        }

        $affectedRows = $conn->affected_rows;
        error_log("Update completed - Affected rows: " . $affectedRows . " | Table: " . $table);

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
    elseif ($action === "health") {
        echo json_encode([
            'status' => 'success',
            'message' => 'API is healthy'
        ]);
    }
    elseif ($action === "proxy_external_api") {
        // Forward requests to external API (e.g., https://med.wayrus.co.ke/api.php)
        $external_api_url = $_POST['external_api_url'] ?? ($_GET['external_api_url'] ?? null);
        $external_action = $_POST['external_action'] ?? ($_GET['external_action'] ?? null);
        $external_method = $_POST['external_method'] ?? ($_GET['external_method'] ?? 'POST');
        $external_table = $_POST['external_table'] ?? ($_GET['external_table'] ?? null);
        $external_where = $_POST['external_where'] ?? ($_GET['external_where'] ?? null);

        if (!$external_api_url || !$external_action) {
            throw new Exception("Missing required proxy parameters: external_api_url and external_action");
        }

        // Build the external API URL
        $external_params = [
            'action' => $external_action
        ];

        if ($external_table) {
            $external_params['table'] = $external_table;
        }

        if ($external_where) {
            $external_params['where'] = $external_where;
        }

        $external_url = $external_api_url . '?' . http_build_query($external_params);

        // Prepare headers for the external API call
        $headers = [
            'Content-Type: application/json',
            'Accept: application/json'
        ];

        // Include authorization header if available
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? null;
        if ($auth_header) {
            $headers[] = 'Authorization: ' . $auth_header;
        }

        // Prepare request body (data)
        $request_body = null;
        if ($json_body && is_array($json_body)) {
            $request_body = json_encode($json_body);
        }

        // Initialize cURL for external API call
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $external_url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_CUSTOMREQUEST => strtoupper($external_method),
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_FOLLOWLOCATION => true,
        ]);

        // Add body if present
        if ($request_body) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $request_body);
        }

        // Execute the request
        $external_response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        curl_close($ch);

        // Check for cURL errors
        if ($curl_error) {
            http_response_code(502);
            echo json_encode([
                'status' => 'error',
                'message' => "Failed to reach external API: $curl_error"
            ]);
            exit();
        }

        // Ensure we have a valid response
        if (!$external_response) {
            http_response_code(502);
            echo json_encode([
                'status' => 'error',
                'message' => 'Empty response from external API'
            ]);
            exit();
        }

        // Try to decode the external API response
        $decoded_response = json_decode($external_response, true);
        if ($decoded_response === null && json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(502);
            echo json_encode([
                'status' => 'error',
                'message' => 'Invalid JSON response from external API'
            ]);
            exit();
        }

        // Pass through the HTTP status code from external API
        http_response_code($http_code);

        // Return the external API response as-is
        echo is_string($external_response) ? $external_response : json_encode($decoded_response);
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
