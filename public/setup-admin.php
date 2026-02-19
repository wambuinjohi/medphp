<?php
/**
 * Admin Setup Script
 * Creates or updates the admin user with credentials:
 * Email: admin@mail.com
 * Password: Pass123
 */

// Database Configuration (must match api.php)
$db_host = 'localhost';
$db_user = 'hycmvsgn_healinvoices';
$db_pass = 'Sirgeorge.12';
$db_name = 'hycmvsgn_healinvoices';

// Create connection
$conn = new mysqli($db_host, $db_user, $db_pass, $db_name);

if ($conn->connect_error) {
    die(json_encode([
        'status' => 'error',
        'message' => 'Connection failed: ' . $conn->connect_error
    ]));
}

$conn->set_charset("utf8");

// Hash password
$email = 'admin@mail.com';
$password = 'Pass123';
$hashedPassword = password_hash($password, PASSWORD_BCRYPT);
$role = 'admin';

// Escape email
$email_escaped = $conn->real_escape_string($email);

// Check if admin already exists
$check = $conn->query("SELECT id FROM users WHERE email = '$email_escaped'");

if ($check && $check->num_rows > 0) {
    // Update existing admin
    $row = $check->fetch_assoc();
    $admin_id = $row['id'];
    
    $sql = "UPDATE users SET password = '$hashedPassword', role = '$role' WHERE email = '$email_escaped'";
    if (!$conn->query($sql)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to update admin user: ' . $conn->error
        ]);
        exit();
    }
    
    // Also update profile if it exists
    $profile_sql = "UPDATE profiles SET password = '$hashedPassword', role = '$role' WHERE id = $admin_id";
    $conn->query($profile_sql); // Don't fail if profile doesn't exist
    
    $status = 'updated';
} else {
    // Create new admin user
    $sql = "INSERT INTO users (email, password, role) VALUES ('$email_escaped', '$hashedPassword', '$role')";
    if (!$conn->query($sql)) {
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to create admin user: ' . $conn->error
        ]);
        exit();
    }
    
    $admin_id = $conn->insert_id;
    
    // Also create profile entry
    $profile_sql = "INSERT INTO profiles (id, email, full_name, role, status) VALUES ($admin_id, '$email_escaped', 'Administrator', '$role', 'active')";
    $conn->query($profile_sql); // Don't fail if profile creation fails
    
    $status = 'created';
}

// Output success message
echo json_encode([
    'status' => 'success',
    'message' => "Admin user successfully $status",
    'email' => $email,
    'password' => $password,
    'role' => $role,
    'user_id' => $admin_id,
    'note' => 'Admin credentials have been reset. You can now login with these credentials.'
]);

$conn->close();
?>
