# Audit Users Setup Guide

This guide explains how to set up and manage Sales and Accounts audit users in the system.

## Overview

Two new audit roles have been created with limited access and no delete permissions:

1. **Sales Audit Role** - For sales team members
2. **Accounts Audit Role** - For accounting/finance team members

Both roles are designed with read-only access to sensitive operations and no permission to delete records.

## Setting Up Audit Roles

### Step 1: Initialize Audit Roles

1. Navigate to **Settings → User Management → Roles & Permissions**
2. Look for the **Audit Roles Configuration** card at the top
3. Click the **Setup Audit Roles** button to create the roles
4. The system will automatically create both roles if they don't exist

### Step 2: Verify Setup

After creating the roles, you should see:
- ✅ Sales Audit Role - Exists with correct permissions
- ✅ Accounts Audit Role - Exists with correct permissions

If any issues appear, click "Refresh Status" to re-verify.

## Sales Audit Role

**Use Case:** Sales representatives and team leads

### Permissions Included:
- ✅ Create quotations
- ✅ View and edit quotations
- ✅ View invoices and proforma invoices
- ✅ View customers and create new customers (edit only)
- ✅ View reports (Sales & Customer reports)
- ✅ View delivery notes
- ✅ View payment records
- ✅ View LPOs

### Permissions Excluded:
- ❌ Delete any records (quotations, invoices, etc.)
- ❌ Access to Payments section
- ❌ Access to Inventory management
- ❌ Access to Settings
- ❌ Access to User Management
- ❌ Cannot create or edit credit notes

### Menu Access:
- Dashboard ✅
- Sales (Quotations, Invoices, Proforma, Credit Notes) ✅
- Customers ✅
- Reports (Sales, Customer Statements) ✅
- Payments ❌ (Hidden)
- Inventory ❌ (Hidden)
- Settings ❌ (Hidden)

---

## Accounts Audit Role

**Use Case:** Accounting staff and financial officers

### Permissions Included:
- ✅ Create and edit invoices
- ✅ Create and edit payments
- ✅ Create and edit credit notes
- ✅ Create and edit remittance advice
- ✅ View quotations and proforma invoices
- ✅ View customers and reports
- ✅ View audit logs
- ✅ Full financial reporting access

### Permissions Excluded:
- ❌ Delete any financial records (invoices, payments, credit notes)
- ❌ Edit quotations (view only)
- ❌ Access to Inventory management
- ❌ Access to User Management
- ❌ Access to Settings
- ❌ Cannot manage system roles

### Menu Access:
- Dashboard ✅
- Sales (View only) ✅
- Payments ✅
- Customers (View only) ✅
- Reports (Full access) ✅
- Inventory ❌ (Hidden)
- Purchase Orders (View only) ✅
- Settings ❌ (Hidden)

---

## Creating Audit Users

### Step 1: Add a New User

1. Go to **Settings → User Management**
2. Click the **Add User** button
3. Fill in the user details:
   - **Full Name:** Enter the user's full name
   - **Email:** Enter valid email address
   - **Position:** e.g., "Sales Manager" or "Senior Accountant"
   - **Department:** e.g., "Sales" or "Finance"
   - **Role:** Select either:
     - "Sales Audit" for sales team
     - "Accounts Audit" for accounting team

### Step 2: User Account Creation

1. The system will create the user account
2. A confirmation email will be sent
3. The user will need to verify their email and set their password
4. Once activated, they can log in with their role's permissions

### Example Setup

#### For Sales Team:
- **User:** John Smith
- **Email:** john.smith@company.com
- **Position:** Sales Manager
- **Department:** Sales
- **Role:** Sales Audit

#### For Accounting Team:
- **User:** Sarah Johnson
- **Email:** sarah.johnson@company.com
- **Position:** Senior Accountant
- **Department:** Finance
- **Role:** Accounts Audit

---

## Verifying User Permissions

To verify that users have the correct permissions:

1. Have the user log in with their account
2. Check the sidebar menu - they should only see allowed items
3. Try accessing restricted pages - they should see "Access Denied"
4. Try performing restricted actions (like delete) - they should see permission denied messages

## Audit Logging

All actions by audit users are logged in the audit trail:
- What records they view, create, or edit
- When they performed these actions
- User and timestamp information

You can view audit logs in **Settings → User Management → User Audit Log**

## Security Notes

1. **No Delete Capability:** These roles cannot delete records, ensuring data integrity
2. **Limited Settings Access:** Audit users cannot modify system settings or user permissions
3. **Action Tracking:** All their actions are automatically logged
4. **Role-Based Menu Filtering:** The sidebar automatically hides restricted menu items

## Troubleshooting

### Audit roles not appearing?
- Go to Role Management and click "Setup Audit Roles"
- Wait for the success message
- Refresh the page

### User can't see their role options?
- Make sure you're signed in as an admin
- Go to Settings → User Management
- The role dropdown should show Sales Audit and Accounts Audit

### User seeing menu items they shouldn't?
- Clear browser cache
- Have user log out and log back in
- The sidebar filters are role-based and update automatically

### User reporting access denied?
- Check their role assignment in User Management
- Verify the role has been properly saved
- Have them log out and back in

## Best Practices

1. **Create audit roles first** before adding audit users
2. **Document who has which role** for your records
3. **Review permissions regularly** in the audit logs
4. **Use descriptive positions and departments** for identification
5. **Separate concerns:** Sales staff get Sales Audit, Accounting staff get Accounts Audit

## Support

For issues setting up audit users:
1. Check the error messages in the UI
2. Review this guide's troubleshooting section
3. Contact system support if problems persist
