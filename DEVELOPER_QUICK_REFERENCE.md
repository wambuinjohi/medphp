# Developer Quick Reference - Remote API Integration

## Quick Links

- **User Guide**: `EXTERNAL_API_SETUP_GUIDE.md`
- **Implementation Docs**: `REMOTE_API_IMPLEMENTATION_SUMMARY.md`
- **Testing Guide**: `TESTING_GUIDE_DATABASE_ROLES.md`
- **Verification Checklist**: `IMPLEMENTATION_VERIFICATION_CHECKLIST.md`

## File Locations

### New Files
```
src/
├── server/
│   └── lib/
│       └── setupRoles.ts                    (336 lines - Role setup utilities)
└── pages/
    └── settings/
        └── DatabaseRolesSettings.tsx        (668 lines - Settings UI page)
```

### Modified Files
```
src/
├── server/
│   └── routes/
│       └── adminUsers.ts                    (Updated: Added role endpoints)
├── App.tsx                                  (Updated: Added route)
├── components/
│   └── layout/
│       └── Sidebar.tsx                      (Updated: Added navigation)
└── .env                                     (Updated: Added database provider)
```

## Configuration

### Environment Variables
```env
VITE_DATABASE_PROVIDER=external-api
VITE_EXTERNAL_API_URL=https://med.wayrus.co.ke/api.php
```

### Default API URL
```
https://med.wayrus.co.ke/api.php
```

## API Endpoints

### Backend Routes (Server-side)
```
POST /api/admin/database/check-status
POST /api/admin/database/initialize
POST /api/admin/database/stats

POST /api/admin/roles/check-status
POST /api/admin/roles/create-default
POST /api/admin/roles/setup-permissions
POST /api/admin/roles/setup-complete
```

### External API Actions
```
POST /api.php?action=check_tables
POST /api.php?action=create_missing_tables
POST /api.php?action=get_db_stats
POST /api.php?action=check_roles
POST /api.php?action=create_role
POST /api.php?action=setup_role_permissions
```

## Key Functions

### Server-side (src/server/lib/setupRoles.ts)
```typescript
// Check which roles are configured
async function checkRolesStatus(apiUrl?: string): Promise<RoleCheckResult>

// Create default roles
async function createDefaultRoles(apiUrl?: string): Promise<RoleSetupResult>

// Setup role permissions
async function setupRolePermissions(apiUrl?: string): Promise<RoleSetupResult>

// Complete setup (roles + permissions)
async function completeRoleSetup(apiUrl?: string): Promise<RoleSetupResult>
```

### Frontend Utilities (src/server/routes/adminUsers.ts)
```javascript
// Use in frontend components
import { adminUserAPI } from '@/server/routes/adminUsers';

// Call these methods
adminUserAPI.checkDatabaseStatus()      // Returns database status
adminUserAPI.initializeDatabase()       // Creates missing tables
adminUserAPI.getDatabaseStats()         // Returns database stats
adminUserAPI.checkRolesStatus()         // Returns roles status
adminUserAPI.createDefaultRoles()       // Creates default roles
adminUserAPI.setupRolePermissions()     // Setup permissions
adminUserAPI.completeRoleSetup()        // Complete setup
```

## Default Roles

```typescript
[
  { name: 'super_admin',  level: 1, permissions: ['all:*'] },
  { name: 'admin',        level: 2, permissions: [users, roles, settings, reports, audit] },
  { name: 'accountant',   level: 3, permissions: [invoices, payments, quotations, reports] },
  { name: 'stock_manager', level: 4, permissions: [inventory, stock, products, reports] },
  { name: 'user',         level: 5, permissions: [quotations, customers, invoices, notes] }
]
```

## Database Tables

Total: 33 tables

### Core Tables (4)
- companies
- profiles
- customers
- suppliers

### Products (3)
- product_categories
- products
- tax_settings

### Sales (4)
- quotations
- quotation_items
- invoices
- invoice_items

### Proforma (2)
- proforma_invoices
- proforma_items

### Credits (3)
- credit_notes
- credit_note_items
- credit_note_allocations

### Delivery (2)
- delivery_notes
- delivery_note_items

### Payments (5)
- payments
- payment_allocations
- payment_audit_log
- payment_methods
- remittance_advice

### Remittance (1)
- remittance_advice_items

### Purchasing (2)
- lpos
- lpo_items

### Web (2)
- web_categories
- web_variants

### Users (2)
- user_permissions
- user_invitations

### Audit (2)
- audit_logs
- migration_logs

## Routes

### User-facing Routes
```
/app/settings/database-roles  - Main settings page (admin only)
```

### Navigation
```
Settings → Database & Roles
```

## Component Structure

### DatabaseRolesSettings.tsx
```
Header
├── Overall Health Status
│   ├── API Status
│   ├── Database Status
│   └── Roles Status
├── Tabs
│   ├── Database Tables Tab
│   │   ├── Database Status Card
│   │   ├── Missing Tables Card (if any)
│   │   ├── Details Dialog
│   │   └── Buttons
│   └── Roles & Permissions Tab
│       ├── Roles Status Card
│       ├── Configured Roles Card
│       ├── Missing Roles Card (if any)
│       ├── Setup Progress Dialog
│       └── Buttons
└── Footer
```

## Type Definitions

```typescript
// Database
interface TableStatus {
  name: string;
  exists: boolean;
}

interface DatabaseStatus {
  connected: boolean;
  tablesFound: number;
  totalTables: number;
  missingTables: string[];
  tables: TableStatus[];
  error?: string;
}

// Roles
interface RolesCheckResult {
  success: boolean;
  rolesExist: string[];
  rolesMissing: string[];
  totalRoles: number;
  error?: string;
}

interface RoleSetupResult {
  success: boolean;
  message: string;
  rolesCreated: string[];
  rolesFailed: string[];
  errors: string[];
}
```

## Common Tasks

### 1. Check if Tables are Missing
```typescript
const response = await adminUserAPI.checkDatabaseStatus();
if (response.missingTables.length > 0) {
  // Show "Create Tables" button
}
```

### 2. Create Missing Tables
```typescript
const response = await adminUserAPI.initializeDatabase();
if (response.success) {
  toast.success('Tables created successfully');
}
```

### 3. Setup Default Roles
```typescript
const response = await adminUserAPI.completeRoleSetup();
if (response.success) {
  toast.success('Roles configured successfully');
}
```

### 4. Check Database Health
```typescript
const status = await adminUserAPI.checkDatabaseStatus();
const rolesStatus = await adminUserAPI.checkRolesStatus();
const isHealthy = status.missingTables.length === 0 && 
                  rolesStatus.rolesMissing.length === 0;
```

## Debugging

### Enable Debugging
```javascript
// In browser console
// Check API calls in Network tab
// Look for POST requests to /api/admin/* and /api.php

// Check console for errors
console.log('Current status:', databaseStatus);
console.log('Current roles:', rolesStatus);
```

### Common Issues

1. **API Not Reachable**
   - Check VITE_EXTERNAL_API_URL in .env
   - Verify network connectivity
   - Check if API server is running

2. **Tables Not Creating**
   - Check API response in Network tab
   - Verify database permissions
   - Check API server logs

3. **Roles Not Configuring**
   - Ensure API supports role endpoints
   - Check authentication token (if required)
   - Verify API error messages

## Testing

### Run Tests
```bash
# Follow TESTING_GUIDE_DATABASE_ROLES.md
# 23 test cases provided
```

### Manual Testing
```
1. Navigate to Settings → Database & Roles
2. Check API health (should show ✓)
3. Check database status
4. Check roles status
5. Create missing tables (if needed)
6. Setup default roles (if needed)
7. Verify all indicators show ✓
```

## Deployment

### Pre-deployment Checklist
- [ ] All tests passed
- [ ] Database tables created
- [ ] Default roles configured
- [ ] No console errors
- [ ] API endpoint verified
- [ ] Admin access restricted
- [ ] Documentation reviewed

### Production Setup
```bash
# 1. Ensure correct environment variables
VITE_DATABASE_PROVIDER=external-api
VITE_EXTERNAL_API_URL=https://med.wayrus.co.ke/api.php

# 2. Access settings page
https://your-domain.com/app/settings/database-roles

# 3. Verify system status
# 4. Create missing tables if needed
# 5. Setup default roles if needed
```

## API Response Format

### Success Response
```json
{
  "success": true,
  "status": 200,
  "data": {
    "connected": true,
    "tablesFound": 33,
    "totalTables": 33,
    "missingTables": [],
    "tables": [...]
  }
}
```

### Error Response
```json
{
  "success": false,
  "status": 500,
  "error": "Error message here",
  "errors": ["Error 1", "Error 2"]
}
```

## Performance Tips

1. **Caching**: API checks are made on page load and on refresh
2. **Async Operations**: All operations are non-blocking
3. **Loading States**: Show spinners during operations
4. **Error Recovery**: Allow retry on failures
5. **Pagination**: Dialog shows scrollable list for large datasets

## Security Notes

1. **Authentication**: All endpoints require admin login
2. **HTTPS**: Always use HTTPS for API calls
3. **Token Handling**: API token stored in env variables
4. **Data Protection**: No sensitive data in error messages
5. **Access Control**: Non-admin users cannot access settings

## Related Documentation

| Document | Purpose |
|----------|---------|
| EXTERNAL_API_SETUP_GUIDE.md | User guide with setup instructions |
| REMOTE_API_IMPLEMENTATION_SUMMARY.md | Technical implementation details |
| TESTING_GUIDE_DATABASE_ROLES.md | Comprehensive test cases |
| IMPLEMENTATION_VERIFICATION_CHECKLIST.md | Verification checklist |
| DEVELOPER_QUICK_REFERENCE.md | This file |

## Version Info

- **Version**: 1.0
- **Release Date**: 2024
- **API Endpoint**: https://med.wayrus.co.ke/api.php
- **Database Provider**: external-api

## Support

For issues or questions:
1. Check documentation files listed above
2. Review console error messages
3. Check Network tab for API responses
4. Contact system administrator

---

**Quick Help**: Press `Ctrl+F` to search this document
**Last Updated**: 2024
