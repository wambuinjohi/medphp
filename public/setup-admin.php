<?php
/**
 * Admin Setup Script
 * Creates or updates the admin user with credentials and permissions:
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

// Admin permissions - full access to all features
$adminPermissions = [
    'create_quotation', 'view_quotation', 'edit_quotation', 'delete_quotation', 'export_quotation',
    'create_invoice', 'view_invoice', 'edit_invoice', 'delete_invoice', 'export_invoice',
    'create_credit_note', 'view_credit_note', 'edit_credit_note', 'delete_credit_note', 'export_credit_note',
    'create_proforma', 'view_proforma', 'edit_proforma', 'delete_proforma', 'export_proforma',
    'create_payment', 'view_payment', 'edit_payment', 'delete_payment',
    'create_inventory', 'view_inventory', 'edit_inventory', 'delete_inventory', 'manage_inventory',
    'view_reports', 'export_reports', 'view_customer_reports', 'view_inventory_reports', 'view_sales_reports',
    'create_customer', 'view_customer', 'edit_customer', 'delete_customer',
    'create_delivery_note', 'view_delivery_note', 'edit_delivery_note', 'delete_delivery_note',
    'create_lpo', 'view_lpo', 'edit_lpo', 'delete_lpo',
    'create_remittance', 'view_remittance', 'edit_remittance', 'delete_remittance',
    'create_supplier', 'view_supplier', 'edit_supplier', 'delete_supplier',
    'create_user', 'edit_user', 'delete_user', 'manage_users', 'approve_users', 'invite_users',
    'manage_transport', 'view_transport',
    'view_audit_logs', 'manage_roles', 'manage_permissions', 'access_settings',
];

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
    
    // Also update profile if it exists (profiles table doesn't have password)
    $profile_sql = "UPDATE profiles SET role = '$role', status = 'active' WHERE id = $admin_id";
    @$conn->query($profile_sql); // Use @ to suppress error if profile doesn't exist
    
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
    $conn->query($profile_sql);
    
    $status = 'created';
}

// Clear existing permissions for this user
$conn->query("DELETE FROM user_permissions WHERE user_id = $admin_id");

// Assign all admin permissions
$permissionsAssigned = 0;
$permissionsFailed = 0;

foreach ($adminPermissions as $permission) {
    $permission_escaped = $conn->real_escape_string($permission);
    $insert_sql = "INSERT INTO user_permissions (user_id, permission_name, granted) 
                   VALUES ($admin_id, '$permission_escaped', 1)";
    if ($conn->query($insert_sql)) {
        $permissionsAssigned++;
    } else {
        $permissionsFailed++;
    }
}

// Output success message
echo json_encode([
    'status' => 'success',
    'message' => "Admin user successfully $status with full permissions",
    'email' => $email,
    'password' => $password,
    'role' => $role,
    'user_id' => $admin_id,
    'permissions_assigned' => $permissionsAssigned,
    'permissions_failed' => $permissionsFailed,
    'note' => 'Admin now has full access to all features including inventory management.'
]);

$conn->close();
?>
