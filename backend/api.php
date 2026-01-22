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
            if ($segments[0] === 'discovery-leads' || $segments[0] === 'discovery_leads') $table_name = 'leads';

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

// Include comprehensive table definitions
// The file should be in the same directory as this API file
require_once __DIR__ . '/tableDefinitions.php';

// Handle check_tables action - check which tables exist
if ($action === "check_tables") {
    try {
        $tableStatus = checkTableStatus($conn);
        echo json_encode([
            'status' => 'ok',
            'data' => $tableStatus
        ]);
        exit();
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Error checking table status: ' . $e->getMessage()
        ]);
        exit();
    }
}

// Handle create_missing_tables action - create all missing tables
if ($action === "create_missing_tables") {
    try {
        $result = createMissingTables($conn);
        echo json_encode([
            'status' => $result['success'] ? 'ok' : 'error',
            'data' => $result
        ]);
        exit();
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Error creating missing tables: ' . $e->getMessage()
        ]);
        exit();
    }
}

// Handle init_database action - initialize database with all required tables
if ($action === "init_database") {
    try {
        $requestedTables = $json_body['tables'] ?? [];
        $result = createMissingTables($conn, !empty($requestedTables) ? $requestedTables : null);
        echo json_encode([
            'status' => $result['success'] ? 'ok' : 'error',
            'data' => $result
        ]);
        exit();
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Error initializing database: ' . $e->getMessage()
        ]);
        exit();
    }
}

// Handle proxy requests to external API to bypass CORS issues
if ($action === "proxy_external_api") {
    $external_api_url = $_POST['external_api_url'] ?? ($_GET['external_api_url'] ?? null);
    $external_action = $_POST['external_action'] ?? ($_GET['external_action'] ?? null);
    $external_table = $_POST['external_table'] ?? ($_GET['external_table'] ?? null);
    $external_where = $_POST['external_where'] ?? ($_GET['external_where'] ?? null);
    $external_method = $_POST['external_method'] ?? ($_GET['external_method'] ?? 'POST');

    // For proxy requests, the body data comes from the JSON payload or POST
    $external_data = $json_body ?? $_POST ?? [];

    if (!$external_api_url || !$external_action) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Missing external_api_url or external_action']);
        exit();
    }

    error_log('🔀 Proxying [' . $external_method . '] request to: ' . $external_api_url);
    error_log('   Action: ' . $external_action . ($external_table ? ' | Table: ' . $external_table : ''));

    // Build proxy request to external API
    $proxy_params = [
        'action' => $external_action
    ];
    if ($external_table) $proxy_params['table'] = $external_table;
    if ($external_where) $proxy_params['where'] = $external_where;

    $proxy_url = $external_api_url . '?' . http_build_query($proxy_params);

    error_log('🔀 Proxy URL: ' . $proxy_url);

    $headers = [
        'Content-Type: application/json',
        'Accept: application/json'
    ];

    $context = stream_context_create([
        'http' => [
            'method' => $external_method,
            'header' => $headers,
            'timeout' => 30,
            'follow_location' => true,
            'max_redirects' => 5
        ],
        'ssl' => [
            'verify_peer' => true,
            'verify_peer_name' => true,
        ]
    ]);

    $request_body = null;
    if (!empty($external_data) && in_array($external_method, ['POST', 'PUT', 'PATCH'])) {
        // Filter out non-JSON-serializable proxy parameters
        $body_data = [];
        foreach ($external_data as $key => $value) {
            if (strpos($key, 'external_') !== 0) {
                $body_data[$key] = $value;
            }
        }
        if (!empty($body_data)) {
            $request_body = json_encode($body_data);
            stream_context_set_option($context, 'http', 'content', $request_body);
            error_log('🔀 Request body size: ' . strlen($request_body) . ' bytes');
        }
    }

    try {
        $response = @file_get_contents($proxy_url, false, $context);

        if ($response === false) {
            $error = error_get_last();
            error_log('❌ Proxy error: ' . ($error ? $error['message'] : 'Unknown error'));
            http_response_code(503);
            echo json_encode([
                'status' => 'error',
                'message' => 'Unable to reach external API. The remote server may be unavailable.',
                'url' => $external_api_url,
                'error' => $error ? $error['message'] : 'Connection failed'
            ]);
            exit();
        }

        // Forward the response from external API
        error_log('✅ Proxy request successful');
        header('Content-Type: application/json');
        echo $response;
        exit();
    } catch (Exception $e) {
        error_log('❌ Proxy exception: ' . $e->getMessage());
        http_response_code(503);
        echo json_encode([
            'status' => 'error',
            'message' => 'Proxy error: ' . $e->getMessage()
        ]);
        exit();
    }
}

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

        // Create uploads directory if it doesn't exist (in public folder)
        $uploads_dir = dirname(__DIR__) . '/public/uploads';
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
    function createJWT($user_id, $user_email, $user_role, $company_id = null, $status = 'active') {
        $secret = $_ENV['JWT_SECRET'] ?? 'wayrus-secret-key-2024';
        $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
        $payload = base64_encode(json_encode([
            'sub' => $user_id,
            'email' => $user_email,
            'role' => $user_role,
            'company_id' => $company_id,
            'status' => $status,
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

    // Helper function to check authorization for modifications (create, update, delete)
    // Allows authenticated admins to proceed even if JWT is invalid (prefer session/identity over strict JWT validation)
    function requireAuthForModification($action, $table) {
        global $conn;

        // Get token from Authorization header
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? null;
        $token = null;

        if ($auth_header && preg_match('/Bearer\s+(\S+)/', $auth_header, $matches)) {
            $token = $matches[1];
        }

        // Fallback to POST data for compatibility
        if (!$token) {
            $token = $_POST['token'] ?? null;
        }

        // If no token provided, deny the request
        if (!$token) {
            http_response_code(401);
            error_log("🔴 [AUTH] $action on $table - No token provided (DENIED)");
            error_log("📋 [DEBUG] Authorization header present: " . ($auth_header ? "yes" : "no"));
            throw new Exception("Authentication required. Missing authorization token.");
        }

        // Try to verify token first (strict validation)
        $decoded = verifyJWT($token);

        // If strict verification failed, try to decode without signature verification
        // This allows users with valid identity but expired/invalid JWT to proceed if they're admin
        if (!$decoded) {
            error_log("🟡 [AUTH] $action on $table - JWT verification failed, attempting lenient decode...");
            $parts = explode('.', $token);
            if (count($parts) === 3) {
                try {
                    // Decode payload without verifying signature
                    $decoded = json_decode(base64_decode($parts[1]), true);
                    if ($decoded) {
                        error_log("🟡 [AUTH] Successfully extracted identity from invalid JWT (lenient mode)");
                    }
                } catch (Exception $e) {
                    $decoded = null;
                }
            }
        }

        if (!$decoded) {
            http_response_code(401);
            error_log("🔴 [AUTH] $action on $table - Could not extract or verify token (DENIED)");
            throw new Exception("Invalid or expired authentication token");
        }

        // Get user ID from decoded token
        $user_id = $decoded['id'] ?? $decoded['sub'] ?? null;
        if (!$user_id) {
            http_response_code(401);
            error_log("🔴 [AUTH] $action on $table - No user ID in token (DENIED)");
            throw new Exception("Invalid token - no user ID");
        }

        // Get full user info from database to check status and company_id
        $sql = "SELECT id, email, role, status, company_id FROM profiles WHERE id = ? LIMIT 1";
        $stmt = $conn->prepare($sql);
        if (!$stmt) {
            http_response_code(500);
            throw new Exception("Database error: " . $conn->error);
        }

        $stmt->bind_param("s", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        $user = $result->fetch_assoc();
        $stmt->close();

        if (!$user) {
            http_response_code(401);
            error_log("🔴 [AUTH] $action on $table - User not found in profiles (DENIED) - user_id: $user_id");
            throw new Exception("User not found");
        }

        // Check if user is active
        if ($user['status'] !== 'active') {
            http_response_code(403);
            error_log("🔴 [AUTH] $action on $table - User is not active (status: {$user['status']}) - email: {$user['email']} (DENIED)");
            throw new Exception("User account is not active. Status: " . $user['status']);
        }

        // Check if user is admin
        $is_admin = stripos($user['role'], 'admin') !== false || $user['role'] === 'super_admin';
        if (!$is_admin) {
            http_response_code(403);
            error_log("🔴 [AUTH] $action on $table - User is not admin (role: {$user['role']}) - email: {$user['email']} (DENIED)");
            throw new Exception("Insufficient permissions. User role must be admin to perform $action.");
        }

        error_log("✅ [AUTH] $action on $table - Authorization passed for user {$user['email']} (role: {$user['role']}, status: {$user['status']})");
        return $user;
    }

    /**
     * Check if user can manage a specific company
     * Used for company-specific authorization checks
     */
    function canManageCompany($user, $company_id) {
        global $conn;

        // Super admins can manage any company
        if ($user['role'] === 'super_admin') {
            error_log("✅ [AUTH] Super admin {$user['email']} can manage any company");
            return true;
        }

        // Regular admins can only manage their own company
        // Cast both to string to handle type differences from URL parameters vs database
        $user_company_id = (string)$user['company_id'];
        $target_company_id = (string)$company_id;

        error_log("🔍 [AUTH] Checking company access: user_company={$user_company_id}, target_company={$target_company_id}, user_role={$user['role']}");

        if ($user_company_id === $target_company_id) {
            error_log("✅ [AUTH] User {$user['email']} can manage company {$company_id} (match)");
            return true;
        }

        error_log("🔴 [AUTH] User {$user['email']} cannot manage company $company_id (user's company: {$user['company_id']}, role: {$user['role']})");
        return false;
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

        // Fetch full user profile including company_id and status
        $profile_sql = "SELECT id, email, role, status, company_id FROM profiles WHERE id = ? LIMIT 1";
        $profile_stmt = $conn->prepare($profile_sql);
        $profile_stmt->bind_param("s", $user['id']);
        $profile_stmt->execute();
        $profile_result = $profile_stmt->get_result();
        $profile = $profile_result->fetch_assoc();
        $profile_stmt->close();

        // Create JWT token instead of session (include company_id and status)
        $token = createJWT($user['id'], $user['email'], $user['role'], $profile ? $profile['company_id'] : null, $profile ? $profile['status'] : 'active');

        echo json_encode([
            'status' => 'success',
            'message' => 'Login successful',
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'email' => $user['email'],
                'role' => $user['role'],
                'company_id' => $profile ? $profile['company_id'] : null,
                'status' => $profile ? $profile['status'] : 'active'
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
    elseif ($action === "diagnose_authorization") {
        // Diagnostic endpoint to check authorization status
        // Requires valid JWT token
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? null;
        $token = null;

        if ($auth_header && preg_match('/Bearer\s+(\S+)/', $auth_header, $matches)) {
            $token = $matches[1];
        }

        if (!$token) {
            http_response_code(401);
            throw new Exception("Authentication required for diagnostic");
        }

        $decoded = verifyJWT($token);
        if (!$decoded) {
            http_response_code(401);
            throw new Exception("Invalid token");
        }

        // Query 1: Get user profile info
        $user_id = $decoded['id'] ?? $decoded['sub'] ?? null;
        if (!$user_id) {
            throw new Exception("No user ID in token");
        }

        $user_profile = null;
        $sql = "SELECT id, email, role, status, company_id FROM profiles WHERE id = ? LIMIT 1";
        $stmt = $conn->prepare($sql);
        if ($stmt) {
            $stmt->bind_param("s", $user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $user_profile = $result->fetch_assoc();
            $stmt->close();
        }

        // Query 2: Get all companies
        $companies = [];
        $sql = "SELECT id, name, status FROM companies ORDER BY created_at DESC";
        $result = $conn->query($sql);
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $companies[] = $row;
            }
        }

        // Query 3: Get all admin users (for comparison)
        $admin_users = [];
        $sql = "SELECT id, email, role, status, company_id FROM profiles WHERE role LIKE '%admin%' OR role = 'super_admin' ORDER BY email";
        $result = $conn->query($sql);
        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $admin_users[] = $row;
            }
        }

        // Perform authorization checks
        $checks = [];

        // Check 1: User exists in database
        $checks['user_exists'] = [
            'name' => 'User exists in database',
            'passed' => $user_profile !== null,
            'details' => $user_profile ? "Found user: {$user_profile['email']}" : "User not found in profiles table"
        ];

        // Check 2: User is active
        $checks['user_is_active'] = [
            'name' => 'User account is active',
            'passed' => $user_profile && $user_profile['status'] === 'active',
            'details' => $user_profile ? "Status: {$user_profile['status']}" : 'N/A',
            'fix' => $user_profile && $user_profile['status'] !== 'active' ? "UPDATE profiles SET status = 'active' WHERE id = '{$user_id}';" : null
        ];

        // Check 3: User is admin
        $is_admin = $user_profile && (stripos($user_profile['role'], 'admin') !== false || $user_profile['role'] === 'super_admin');
        $checks['user_is_admin'] = [
            'name' => 'User has admin role',
            'passed' => $is_admin,
            'details' => $user_profile ? "Role: {$user_profile['role']}" : 'N/A',
            'fix' => $user_profile && !$is_admin ? "UPDATE profiles SET role = 'admin' WHERE id = '{$user_id}';" : null
        ];

        // Check 4: User has company assigned
        $checks['user_has_company'] = [
            'name' => 'User has company assigned',
            'passed' => $user_profile && !empty($user_profile['company_id']),
            'details' => $user_profile ? "Company ID: " . ($user_profile['company_id'] ?: 'NULL') : 'N/A',
            'fix' => $user_profile && empty($user_profile['company_id']) && !empty($companies) ? "UPDATE profiles SET company_id = '{$companies[0]['id']}' WHERE id = '{$user_id}';" : null
        ];

        // Check 5: Company exists
        $checks['company_exists'] = [
            'name' => 'At least one company exists',
            'passed' => !empty($companies),
            'details' => "Found " . count($companies) . " company/companies",
        ];

        // Overall authorization status
        $all_checks_passed = array_reduce($checks, function($carry, $check) {
            return $carry && $check['passed'];
        }, true);

        echo json_encode([
            'status' => 'success',
            'timestamp' => date('Y-m-d H:i:s'),
            'user_profile' => $user_profile,
            'companies' => $companies,
            'admin_users' => $admin_users,
            'checks' => $checks,
            'authorization_status' => $all_checks_passed ? 'AUTHORIZED ✓' : 'NOT AUTHORIZED ✗',
            'message' => $all_checks_passed ?
                'User is authorized to save company settings' :
                'User is missing one or more requirements to save company settings'
        ]);
    }
    elseif ($action === "token_debug") {
        // Simple diagnostic endpoint to debug token issues
        // Does NOT require authentication - helps understand token problems
        $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? null;
        $token = null;
        $token_present = false;
        $token_valid = false;
        $decoded_payload = null;
        $error = null;

        // Check if Authorization header exists
        if ($auth_header) {
            $token_present = true;
            if (preg_match('/Bearer\s+(\S+)/', $auth_header, $matches)) {
                $token = $matches[1];
            } else {
                $error = "Authorization header present but not in 'Bearer <token>' format";
            }
        }

        // If token is present, try to decode and verify it
        if ($token) {
            $parts = explode('.', $token);
            if (count($parts) === 3) {
                // Try to verify and decode
                $decoded = verifyJWT($token);
                if ($decoded) {
                    $token_valid = true;
                    $decoded_payload = $decoded;
                    // Remove sensitive info if needed, but include enough for debugging
                    unset($decoded_payload['exp']); // Remove expiration for cleaner output
                } else {
                    // Token exists but is invalid - diagnose why
                    list($header, $payload, $signature) = $parts;
                    try {
                        $decoded_payload = json_decode(base64_decode($payload), true);
                    } catch (Exception $e) {
                        $decoded_payload = null;
                    }

                    if ($decoded_payload && isset($decoded_payload['exp'])) {
                        if ($decoded_payload['exp'] < time()) {
                            $error = "Token has expired (exp: " . date('Y-m-d H:i:s', $decoded_payload['exp']) . ")";
                        } else {
                            $error = "Token signature is invalid";
                        }
                    } else {
                        $error = "Token is malformed or signature verification failed";
                    }
                }
            } else {
                $error = "Token does not have the correct JWT format (expected 3 parts separated by dots, got " . count($parts) . ")";
            }
        }

        echo json_encode([
            'status' => 'success',
            'timestamp' => date('Y-m-d H:i:s'),
            'debug' => [
                'token_present' => $token_present,
                'token_valid' => $token_valid,
                'token_value' => $token ? substr($token, 0, 20) . '...' : null,
                'error' => $error,
                'decoded_payload' => $decoded_payload
            ],
            'help' => [
                'token_present' => 'Whether Authorization header with Bearer token was sent',
                'token_valid' => 'Whether the token signature is valid and not expired',
                'error' => 'Description of any token issues found',
                'decoded_payload' => 'The decoded contents of the JWT (without sensitive expiration)'
            ]
        ]);
    }
    // CRUD Operations
    elseif ($action === "create") {
        if (!$table) {
            throw new Exception("Missing table");
        }

        if (empty($data)) {
            throw new Exception("Missing data for insert");
        }

        // Check authorization for modifications to protected tables
        $protected_tables = ['companies', 'users', 'profiles', 'user_permissions', 'roles'];
        if (in_array($table, $protected_tables)) {
            $auth = requireAuthForModification($action, $table);
        }

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

        // Check authorization for modifications to protected tables
        $protected_tables = ['users', 'profiles', 'user_permissions', 'roles', 'companies'];
        $auth = null;
        if (in_array($table, $protected_tables)) {
            $auth = requireAuthForModification($action, $table);
        }

        // Additional authorization check for company updates
        if ($table === 'companies' && $auth) {
            // Extract company ID from where clause
            $company_id = null;
            if (is_array($where) && isset($where['id'])) {
                $company_id = $where['id'];
            } elseif (is_array($where) && isset($where['company_id'])) {
                $company_id = $where['company_id'];
            }

            if (!$company_id) {
                http_response_code(400);
                throw new Exception("Cannot determine company ID for authorization check");
            }

            // Check if user can manage this specific company
            if (!canManageCompany($auth, $company_id)) {
                http_response_code(403);
                error_log("🔴 [AUTH] Denying company update: User {$auth['email']} cannot manage company {$company_id}");

                // Provide detailed error message for debugging
                $detailedMessage = "You do not have permission to update company {$company_id}. ";
                if (!$auth['company_id']) {
                    $detailedMessage .= "Your user profile is not assigned to any company. Please contact your administrator to assign you to a company.";
                } else if ($auth['role'] === 'super_admin') {
                    $detailedMessage .= "Super admin check failed (unexpected). Please contact support.";
                } else {
                    $detailedMessage .= "You are assigned to company {$auth['company_id']} but trying to edit company {$company_id}. Regular admins can only edit their own company.";
                }

                throw new Exception($detailedMessage);
            }

            error_log("✅ [AUTH] Company update authorized for {$auth['email']} on company {$company_id}");
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

        // Check authorization for modifications to protected tables
        $protected_tables = ['companies', 'users', 'profiles', 'user_permissions', 'roles'];
        $auth = null;
        if (in_array($table, $protected_tables)) {
            $auth = requireAuthForModification($action, $table);
        }

        // Additional authorization check for company deletes
        if ($table === 'companies' && $auth) {
            // Extract company ID from where clause
            $company_id = null;
            if (is_array($where) && isset($where['id'])) {
                $company_id = $where['id'];
            } elseif (is_array($where) && isset($where['company_id'])) {
                $company_id = $where['company_id'];
            }

            if (!$company_id) {
                http_response_code(400);
                throw new Exception("Cannot determine company ID for authorization check");
            }

            // Check if user can manage this specific company
            if (!canManageCompany($auth, $company_id)) {
                http_response_code(403);
                error_log("🔴 [AUTH] Denying company delete: User {$auth['email']} cannot manage company {$company_id}");
                throw new Exception("You do not have permission to delete this company.");
            }

            error_log("✅ [AUTH] Company delete authorized for {$auth['email']} on company {$company_id}");
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
    elseif ($action === "copy_record") {
        // Copy a database record with optional field modifications
        if (!$table || !$where) {
            throw new Exception("Missing table or where clause");
        }

        // Check authorization for modifications to protected tables
        $protected_tables = ['companies', 'users', 'profiles', 'user_permissions', 'roles'];
        if (in_array($table, $protected_tables)) {
            $auth = requireAuthForModification($action, $table);
        }

        // Fetch the source record
        $sql = "SELECT * FROM `$table`";
        $conditions = [];

        if (is_array($where)) {
            foreach ($where as $col => $val) {
                $conditions[] = "`" . escape($conn, $col) . "`='" . escape($conn, $val) . "'";
            }
        } else {
            $conditions[] = $where;
        }

        $sql .= " WHERE " . implode(" AND ", $conditions);

        $result = $conn->query($sql);
        if (!$result || $result->num_rows === 0) {
            throw new Exception("Source record not found");
        }

        $source_record = $result->fetch_assoc();

        // Prepare data for the new record
        $new_record = $source_record;

        // Remove id to allow auto-generation
        unset($new_record['id']);

        // Apply any field overrides from the request
        if (!empty($data) && is_array($data)) {
            foreach ($data as $key => $value) {
                if ($key !== 'id') {
                    $new_record[$key] = $value;
                }
            }
        }

        // Reset timestamps
        $new_record['created_at'] = date('Y-m-d H:i:s');
        if (isset($new_record['updated_at'])) {
            $new_record['updated_at'] = date('Y-m-d H:i:s');
        }

        // Build INSERT query
        $columns = [];
        $values = [];

        foreach ($new_record as $col => $val) {
            if ($val !== null) {
                $columns[] = "`" . escape($conn, $col) . "`";
                $values[] = "'" . escape($conn, $val) . "'";
            }
        }

        $sql = "INSERT INTO `$table` (" . implode(", ", $columns) . ") VALUES (" . implode(", ", $values) . ")";

        error_log("SQL COPY: " . $sql);

        if (!$conn->query($sql)) {
            error_log("MySQL Error: " . $conn->error . " | SQL: " . $sql);
            throw new Exception("Copy failed: " . $conn->error);
        }

        $new_id = $conn->insert_id;

        echo json_encode([
            'status' => 'success',
            'message' => 'Record copied successfully',
            'original_id' => $source_record['id'],
            'new_id' => $new_id,
            'data' => array_merge($new_record, ['id' => $new_id])
        ]);
    }
    elseif ($action === "copy_file") {
        // Copy a file from one location to another
        $source_file = $_POST['source_file'] ?? ($_GET['source_file'] ?? null);
        $destination_name = $_POST['destination_name'] ?? ($_GET['destination_name'] ?? null);

        if (!$source_file) {
            throw new Exception("Missing source_file parameter");
        }

        // Validate that source file path doesn't contain directory traversal attempts
        $source_file = str_replace(['../', '..\\', '\\'], '/', $source_file);
        if (strpos($source_file, '/') === 0) {
            $source_file = ltrim($source_file, '/');
        }

        // Build full source path
        $uploads_dir = dirname(__DIR__) . '/public/uploads';
        $full_source_path = $uploads_dir . '/' . $source_file;

        // Verify the source file exists and is within uploads directory
        $real_uploads_dir = realpath($uploads_dir);
        $real_source_path = realpath($full_source_path);

        if (!$real_source_path || !file_exists($real_source_path)) {
            throw new Exception("Source file not found: $source_file");
        }

        // Ensure file is within uploads directory (security check)
        if (strpos($real_source_path, $real_uploads_dir) !== 0) {
            throw new Exception("Access denied: File is outside allowed directory");
        }

        // Validate file is readable
        if (!is_readable($real_source_path)) {
            throw new Exception("Source file is not readable");
        }

        // Generate destination filename
        if (!$destination_name) {
            // Generate from source filename
            $source_info = pathinfo($real_source_path);
            $base_name = $source_info['filename'];
            $extension = $source_info['extension'];
            $destination_name = $base_name . '-copy-' . time() . '.' . $extension;
        } else {
            // Sanitize destination name
            $destination_name = preg_replace('/[^a-zA-Z0-9._-]/', '_', $destination_name);
        }

        $destination_path = $uploads_dir . '/' . $destination_name;

        // Verify destination doesn't exist
        if (file_exists($destination_path)) {
            throw new Exception("Destination file already exists");
        }

        error_log("📋 Copying file: $full_source_path -> $destination_path");

        // Copy the file
        if (!copy($real_source_path, $destination_path)) {
            throw new Exception("Failed to copy file");
        }

        // Verify copy was successful
        if (!file_exists($destination_path) || filesize($destination_path) !== filesize($real_source_path)) {
            @unlink($destination_path); // Clean up if verification fails
            throw new Exception("File copy verification failed");
        }

        // Construct the public URL
        $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'];
        $file_url = "$protocol://$host/uploads/$destination_name";

        error_log('✅ File copied successfully: ' . $file_url);

        echo json_encode([
            'status' => 'success',
            'message' => 'File copied successfully',
            'url' => $file_url,
            'file_url' => $file_url,
            'path' => "/uploads/$destination_name",
            'filename' => $destination_name,
            'source_filename' => basename($real_source_path)
        ]);
    }
    elseif ($action === "create_table") {
        if (!$table || !$schema) {
            throw new Exception("Missing table or schema");
        }

        $sql = "CREATE TABLE IF NOT EXISTS `$table` ($schema)";

        if (!$conn->query($sql)) {
            if (strpos($conn->error, 'already exists') !== false) {
                echo json_encode(['status' => 'success', 'message' => 'Table already exists']);
            } else {
                throw new Exception("Create table failed: " . $conn->error);
            }
        } else {
            echo json_encode(['status' => 'success', 'message' => 'Table created']);
        }
    }
    elseif ($action === "drop_table") {
        if (!$table) {
            throw new Exception("Missing table");
        }

        $sql = "DROP TABLE IF EXISTS `$table`";

        if (!$conn->query($sql)) {
            throw new Exception("Drop table failed: " . $conn->error);
        }

        echo json_encode(['status' => 'success', 'message' => 'Table dropped']);
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
