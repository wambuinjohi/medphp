# External API Setup Guide - Complete Configuration

## Overview

This system is configured to use **ONLY** the remote API at `https://med.wayrus.co.ke/api.php` for all database operations. This guide will help you complete the full setup including database tables and roles configuration.

## Quick Start

### 1. Access the System Configuration Page

After logging in as an admin user:

1. Go to **Settings** → **Database & Roles**
2. You'll see a complete overview of the system status

### 2. Check System Status

The configuration page displays:
- **API Status**: Whether the remote API is reachable
- **Database Status**: How many tables are created vs required
- **Roles Status**: Which user roles are configured

## Step-by-Step Setup

### Step 1: Verify API Connection

Before proceeding, ensure your API is accessible:

```
API Endpoint: https://med.wayrus.co.ke/api.php
```

**Check using the settings page:**
- Navigate to Settings → Database & Roles
- Look for "API Status" indicator at the top
- It should show ✓ if connected

### Step 2: Create Missing Database Tables

If your system shows missing tables:

1. Go to Settings → Database & Roles
2. Click on the **"Database Tables"** tab
3. You'll see:
   - Tables Found: X
   - Total Expected: Y
   - Missing: Z

**To create missing tables:**
1. Click **"Create Missing Tables"** button
2. Wait for the operation to complete
3. Click **"Refresh Status"** to verify

### Step 3: Setup Default Roles and Permissions

If your system shows missing roles:

1. Go to Settings → Database & Roles
2. Click on the **"Roles & Permissions"** tab
3. You'll see configured roles and missing roles
4. Click **"Setup Default Roles"** button

The system will automatically create and configure these default roles:
- **super_admin** - Full system access
- **admin** - Full application access
- **accountant** - Financial management access
- **stock_manager** - Inventory management access
- **user** - Basic user access

### Step 4: Verify Complete Setup

Once all steps are done:

1. All indicators in the configuration page should show ✓
2. Database should show "All Tables Present"
3. Roles should show "All Roles Configured"
4. API Status should show ✓

## Environment Configuration

The system uses these environment variables:

```env
# Database Provider - Set to 'external-api' to use ONLY the remote API
VITE_DATABASE_PROVIDER=external-api

# External API URL - The remote API endpoint
VITE_EXTERNAL_API_URL=https://med.wayrus.co.ke/api.php

# API Authentication Token (optional)
API_AUTH_TOKEN=your-api-token-if-required
```

**Current Configuration**: The system is already set to use `external-api` provider with the default URL.

## Required Database Tables

The system requires these tables to be created:

### Core Tables
- `companies` - Company information
- `profiles` - User profiles
- `customers` - Customer information
- `suppliers` - Supplier information

### Product & Inventory
- `product_categories` - Product categories
- `products` - Product information
- `tax_settings` - Tax configuration
- `stock_movements` - Inventory movements

### Sales & Invoicing
- `quotations` - Sales quotations
- `quotation_items` - Quotation line items
- `invoices` - Customer invoices
- `invoice_items` - Invoice line items
- `proforma_invoices` - Proforma invoices
- `proforma_items` - Proforma line items
- `credit_notes` - Credit notes
- `credit_note_items` - Credit note items
- `credit_note_allocations` - Credit note allocations

### Delivery & Logistics
- `delivery_notes` - Delivery documentation
- `delivery_note_items` - Delivery items

### Payments
- `payments` - Payment records
- `payment_allocations` - Payment allocations
- `payment_audit_log` - Payment audit trail
- `payment_methods` - Payment methods
- `remittance_advice` - Remittance advices
- `remittance_advice_items` - Remittance items

### Purchasing
- `lpos` - Local purchase orders
- `lpo_items` - LPO line items

### Web Manager
- `web_categories` - Website product categories
- `web_variants` - Product variants

### User & Permissions
- `user_permissions` - User permission assignments
- `user_invitations` - User invitation records

### Audit & Logging
- `audit_logs` - System audit logs
- `migration_logs` - Data migration logs

## Default Roles and Permissions

### 1. Super Admin
**Level**: 1 (Highest)
**Permissions**: `all:*` (Full system access)
**Use Case**: System administrator with complete control

### 2. Admin
**Level**: 2
**Permissions**:
- User management (create, read, update, delete)
- Role management
- Settings management
- View reports and audit logs

### 3. Accountant
**Level**: 3
**Permissions**:
- Create and manage invoices
- Create and manage payments
- View quotations
- View reports
- View customers

### 4. Stock Manager
**Level**: 4
**Permissions**:
- Create and manage inventory
- Create and manage stock movements
- Delete stock records
- View products
- View reports

### 5. User
**Level**: 5 (Lowest)
**Permissions**:
- Create quotations
- View basic information
- View invoices and delivery notes
- Read-only access to most features

## Troubleshooting

### Issue: "API is not reachable"

**Solution:**
1. Verify the API URL is correct: `https://med.wayrus.co.ke/api.php`
2. Check your internet connection
3. Verify the remote API server is running
4. Check if there's a firewall blocking the connection

### Issue: "Some tables failed to create"

**Solution:**
1. Check the error messages for specific table failures
2. Verify the remote API has proper permissions
3. Ensure the database has sufficient space
4. Retry the operation

### Issue: "Role setup failed"

**Solution:**
1. Ensure at least one admin user exists
2. Verify API authentication token is correct (if required)
3. Check the API logs for detailed error messages
4. Retry the operation

## API Endpoints

The system uses these API endpoints:

### Database Operations
```
POST /api.php?action=check_tables
POST /api.php?action=create_missing_tables
POST /api.php?action=get_db_stats
POST /api.php?action=health
```

### Roles Management
```
POST /api.php?action=check_roles
POST /api.php?action=create_role
POST /api.php?action=setup_role_permissions
```

### Authentication
```
POST /api.php?action=login
POST /api.php?action=logout
POST /api.php?action=check_auth
POST /api.php?action=create_user
POST /api.php?action=admin_create_user
```

## Frontend Endpoints

The system exposes these local endpoints for configuration:

```
POST /api/admin/database/check-status
POST /api/admin/database/initialize
POST /api/admin/database/stats
POST /api/admin/database/fix-rls

POST /api/admin/roles/check-status
POST /api/admin/roles/create-default
POST /api/admin/roles/setup-permissions
POST /api/admin/roles/setup-complete
```

## Important Notes

### Security
- All API calls are made over HTTPS
- Sensitive credentials should be kept in environment variables
- The API token should never be committed to version control
- Use strong passwords for all user accounts

### Performance
- Database operations may take time for large datasets
- Refresh the page if operations appear stuck
- Check browser console for detailed error messages

### Production Deployment
1. Ensure the remote API is properly secured
2. Set up proper database backups
3. Configure API rate limiting if needed
4. Monitor API logs for any issues
5. Set up proper error logging and monitoring

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review API logs for detailed error messages
3. Verify all environment variables are correctly set
4. Contact the API provider for infrastructure issues

## Next Steps

After completing the setup:

1. **Create Users**: Go to Settings → User Management to add team members
2. **Configure Company Settings**: Set up your company information
3. **Add Customers & Suppliers**: Populate your customer and supplier databases
4. **Configure Products**: Add your product catalog
5. **Start Using the System**: Begin creating quotations, invoices, etc.

---

**System Status**: Configured to use external API only
**API URL**: https://med.wayrus.co.ke/api.php
**Provider**: external-api
**Last Updated**: 2024
