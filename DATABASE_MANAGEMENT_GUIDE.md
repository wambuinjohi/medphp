# Database Management Feature - Implementation Guide

## Overview
This document describes the comprehensive database table management system that has been implemented to automatically check for missing tables in the MySQL database and create them as needed.

## Problem Solved
The application was experiencing issues with missing database tables (customers, invoices, payments, tax_settings, etc.), which prevented various sections of the application from loading. This implementation provides:

1. **Automatic Table Detection** - Check which tables exist in the database
2. **Missing Table Identification** - Identify which tables need to be created
3. **Bulk Table Creation** - Create all missing tables at once via the admin UI
4. **Visual Status Dashboard** - Admin dashboard to monitor database health

## Architecture

### Backend Components

#### 1. **PHP Table Definitions** (`backend/lib/tableDefinitions.php`)
- Comprehensive CREATE TABLE statements for all 30+ application tables
- Includes proper foreign keys, indexes, and constraints
- Functions for:
  - `getTableDefinitions()` - Returns all table creation SQL
  - `getAllTableNames()` - Returns list of all expected tables
  - `getRequiredTableNames()` - Returns core tables that must exist
  - `checkTableStatus($conn)` - Checks which tables exist
  - `createMissingTables($conn)` - Creates missing tables

**Tables Included:**
- Core Tables: companies, customers, suppliers, products, product_categories, tax_settings, profiles
- Sales Documents: quotations, quotation_items, proforma_invoices, proforma_items, invoices, invoice_items
- Payment Management: payments, payment_allocations, payment_methods
- Credit Management: credit_notes, credit_note_items
- Delivery Management: delivery_notes, delivery_note_items
- Procurement: lpos, lpo_items
- Operations: stock_movements, audit_logs

#### 2. **Backend API Actions** (`backend/api.php`)
Three new API actions added to the PHP backend:

**Action: `check_tables`**
- POST to `api.php?action=check_tables`
- Returns status of all tables
- Response includes:
  ```json
  {
    "status": "ok",
    "data": {
      "connected": true,
      "tablesFound": 25,
      "totalTables": 32,
      "missingTables": ["customers", "invoices", "payments"],
      "tables": [
        { "name": "companies", "exists": true },
        { "name": "customers", "exists": false }
      ]
    }
  }
  ```

**Action: `create_missing_tables`**
- POST to `api.php?action=create_missing_tables`
- Creates all missing tables automatically
- Response includes:
  ```json
  {
    "status": "ok",
    "data": {
      "success": true,
      "created": ["customers", "invoices", "payments"],
      "errors": [],
      "total_created": 3,
      "total_errors": 0
    }
  }
  ```

**Action: `init_database`**
- POST to `api.php?action=init_database`
- Alternative endpoint for database initialization
- Can create specific tables or all missing ones

### Frontend Components

#### Database Management Admin Page
**File:** `src/pages/DatabaseManagementAdmin.tsx`

Features:
- Real-time database status monitoring
- Count of existing vs. missing tables
- Visual health indicator (Healthy/Missing Tables)
- One-click button to create all missing tables
- Detailed table list in a scrollable modal
- Success/error reporting after creation
- Automatic status refresh after creation

**Access Path:** `/app/admin/database`
**Sidebar Location:** Settings > Database Management
**Role Required:** Admin only

#### Sidebar Integration
- Added "Database Management" link in Settings menu
- Icon: Database icon from lucide-react
- Only visible to admin users
- Active state highlighting

## How It Works

### Flow Diagram
```
User navigates to /app/admin/database
    ↓
Frontend loads DatabaseManagementAdmin component
    ↓
Component calls API endpoint: check_tables
    ↓
Backend PHP queries MySQL INFORMATION_SCHEMA
    ↓
Returns list of existing vs missing tables
    ↓
Frontend displays status dashboard
    ↓
User clicks "Create Missing Tables" button
    ↓
Frontend calls API endpoint: create_missing_tables
    ↓
Backend executes CREATE TABLE statements for missing tables
    ↓
Returns success/error report
    ↓
Frontend automatically refreshes status
    ↓
User sees updated database health
```

## Usage

### For End Users (Admins)

1. **Access the Database Management Dashboard:**
   - Log in with admin credentials
   - Go to Settings > Database Management in the sidebar
   - Or navigate directly to `/app/admin/database`

2. **View Database Status:**
   - See the number of tables found vs. expected
   - Check if database is healthy or has missing tables
   - Click "View Details" to see complete table list

3. **Create Missing Tables:**
   - If missing tables are detected, click "Create Missing Tables"
   - Wait for the operation to complete
   - Status will automatically refresh
   - Success notification will appear showing number of tables created

4. **Monitor Progress:**
   - See real-time updates during table creation
   - View which tables were successfully created
   - See any error messages if creation fails

### For Developers

**Adding a New Table:**
1. Add table definition to `backend/lib/tableDefinitions.php`
2. The table will automatically be detected in the check
3. Will be included in bulk creation operations

**Calling the API Directly:**
```bash
# Check tables
curl -X POST https://med.wayrus.co.ke/api.php?action=check_tables \
  -H "Content-Type: application/json" \
  -d '{}'

# Create missing tables
curl -X POST https://med.wayrus.co.ke/api.php?action=create_missing_tables \
  -H "Content-Type: application/json" \
  -d '{}'
```

**From Frontend Code:**
```typescript
// Check database status
const response = await fetch(`${API_URL}?action=check_tables`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});

// Create missing tables
const response = await fetch(`${API_URL}?action=create_missing_tables`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});
```

## Files Created/Modified

### New Files
1. **`backend/lib/tableDefinitions.php`** (618 lines)
   - Comprehensive table definitions
   - Utility functions for table checking and creation

2. **`src/pages/DatabaseManagementAdmin.tsx`** (413 lines)
   - Admin dashboard component
   - Status monitoring and table creation UI

### Modified Files
1. **`backend/api.php`**
   - Added include for tableDefinitions.php
   - Added 3 new API actions (check_tables, create_missing_tables, init_database)
   - ~60 lines added

2. **`src/App.tsx`**
   - Added import for DatabaseManagementAdmin
   - Added route: `/app/admin/database`
   - ~10 lines added

3. **`src/components/layout/Sidebar.tsx`**
   - Added Database icon import
   - Added "Database Management" to Settings menu
   - ~5 lines modified

## Database Tables Created

The system can create and manage the following 32 tables:

### Core Business Tables
- **companies** - Multi-company support
- **customers** - Customer master list
- **suppliers** - Supplier master list
- **profiles** - User profiles
- **product_categories** - Product category hierarchy
- **products** - Product inventory
- **tax_settings** - Tax rate configuration

### Sales Documents
- **quotations** - Sales quotations
- **quotation_items** - Quotation line items
- **proforma_invoices** - Proforma invoice documents
- **proforma_items** - Proforma line items
- **invoices** - Final invoices
- **invoice_items** - Invoice line items

### Payment Management
- **payments** - Payment records
- **payment_allocations** - Payment to invoice allocations
- **payment_methods** - Payment method definitions
- **credit_notes** - Credit note documents
- **credit_note_items** - Credit note line items

### Operations
- **delivery_notes** - Delivery documentation
- **delivery_note_items** - Delivery line items
- **lpos** - Local Purchase Orders
- **lpo_items** - LPO line items
- **stock_movements** - Inventory movement tracking
- **audit_logs** - System audit trail

## Troubleshooting

### Issue: Database not connecting
**Solution:** 
- Check API_URL configuration (VITE_EXTERNAL_API_URL)
- Verify MySQL credentials in backend/.env
- Check if backend/api.php is accessible

### Issue: Tables still showing as missing after creation
**Solution:**
- Click "Refresh Status" button to reload table list
- Check backend error logs
- Verify MySQL user has CREATE TABLE permissions

### Issue: Foreign key constraint errors during creation
**Solution:**
- Tables are created with proper FK constraints
- Ensure tables are created in correct order (parent tables first)
- The implementation handles this automatically

## Performance Considerations

- **Table Check:** Uses MySQL INFORMATION_SCHEMA for efficient detection
- **Bulk Creation:** Creates all tables in single operation
- **Error Handling:** Continues creation even if one table fails
- **Caching:** No caching - always checks current database state

## Security

- **Access Control:** Database Management only visible to admin users
- **Protected Routes:** All admin endpoints require authentication
- **Input Validation:** API parameters validated
- **Error Messages:** Generic error messages to prevent info leakage

## Future Enhancements

Potential improvements for future versions:
1. Add table backup functionality
2. Add selective table deletion
3. Add table structure comparison
4. Add data migration tools
5. Add automated daily health checks
6. Add email alerts for database issues
7. Add export/import functionality
8. Add table optimization tools

## Testing Checklist

- [x] Backend API endpoints respond correctly
- [x] Table detection works for all expected tables
- [x] Frontend page loads correctly
- [x] Database creation executes without errors
- [x] Status refreshes after creation
- [x] Admin-only access enforcement
- [x] Error handling for API failures
- [x] Responsive design on mobile/tablet
- [x] Toast notifications display correctly
- [x] Dialog modals work properly

## Support & Maintenance

For issues or questions:
1. Check the Database Management dashboard status
2. Review error messages in the details modal
3. Check MySQL error logs
4. Verify API connectivity
5. Review this guide for troubleshooting steps

---

**Last Updated:** January 2025
**Version:** 1.0
**Status:** Production Ready
