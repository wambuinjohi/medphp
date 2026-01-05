# Database Profiles Table Issue - Root Cause Analysis and Fix

## Executive Summary

**Issue**: Authentication fails after login with error: `Table 'wayrusc1_med.profiles' doesn't exist`

**Root Cause**: The backend database at med.wayrus.co.ke is missing the `profiles` table that the frontend requires after successful authentication.

**Fix Applied**: Added `profiles` table creation to the database initialization functions in both `public/api.php` and `backend/api.php`.

---

## Detailed Root Cause Analysis

### Authentication Flow
1. User logs in via frontend → `POST /api.php?action=login`
   - ✅ **SUCCESS**: Credentials validated, JWT token generated
   
2. Frontend validates token and fetches user profile → `GET /api.php?action=read&table=profiles&id=<userId>`
   - ❌ **FAILURE**: SQL error - `Table 'wayrusc1_med.profiles' doesn't exist`

3. Due to missing profile, user is logged out and cannot access the application

### Why the Profiles Table Was Missing

**Files Involved**:
- `public/api.php` (lines 238-256) - Main API endpoint
- `backend/api.php` (lines 238-256) - Backup API variant

Both files contain an `ensureTables()` function that automatically creates default MySQL tables when the API starts. However, this function was **missing the `profiles` table creation**.

**Default Tables Created** (before fix):
- users
- contacts
- newsletter
- leads
- quotations
- portfolios
- opportunities
- discovery_leads
- logs

**Table NOT Created** (causing the error):
- ~~profiles~~ ← **This was missing!**

### Frontend Expectations

The frontend application expects the `profiles` table with these fields:
```typescript
interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  company_id?: string;
  department?: string;
  position?: string;
  role?: string;
  status?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}
```

This is called from:
- `src/contexts/AuthContext.tsx` (line 380) - After successful login
- `src/integrations/database/external-api-adapter.ts` (line ~220) - Via `selectOne('profiles', userId)`

---

## Fix Applied

### Changes Made

**File**: `public/api.php` (lines 238-256)
**File**: `backend/api.php` (lines 238-256)

Added the `profiles` table to the `ensureTables()` function:

```php
'profiles' => 'id INT PRIMARY KEY, email VARCHAR(255) NOT NULL, full_name VARCHAR(255), avatar_url TEXT, role VARCHAR(50) DEFAULT "user", status VARCHAR(50) DEFAULT "pending", phone VARCHAR(20), company_id INT, department VARCHAR(255), position VARCHAR(255), invited_by INT, invited_at TIMESTAMP NULL, last_login TIMESTAMP NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
```

### Table Structure

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | INT PRIMARY KEY | - | User ID from auth system |
| email | VARCHAR(255) NOT NULL | - | User email address |
| full_name | VARCHAR(255) | NULL | Full name of user |
| avatar_url | TEXT | NULL | Avatar image URL |
| role | VARCHAR(50) | 'user' | User role (admin, accountant, stock_manager, user) |
| status | VARCHAR(50) | 'pending' | Account status (active, inactive, pending) |
| phone | VARCHAR(20) | NULL | Phone number |
| company_id | INT | NULL | Associated company |
| department | VARCHAR(255) | NULL | Department name |
| position | VARCHAR(255) | NULL | Job position |
| invited_by | INT | NULL | User ID who invited this user |
| invited_at | TIMESTAMP | NULL | When user was invited |
| last_login | TIMESTAMP | NULL | Last login timestamp |
| created_at | TIMESTAMP | CURRENT_TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | CURRENT_TIMESTAMP | Last update timestamp |

---

## Next Steps to Resolve

### Option A: Automatic Table Creation (Recommended)
If you're deploying the fixed code to med.wayrus.co.ke:

1. **Deploy** the updated `public/api.php` to the backend server
2. **Access** the API endpoint to trigger auto-table creation:
   ```bash
   curl "https://med.wayrus.co.ke/api.php?action=health"
   ```
3. This will automatically create the `profiles` table via `ensureTables()`
4. **Test** login - should now work without the "Table doesn't exist" error

### Option B: Manual Table Creation (If needed)
If you prefer to manually create the table on your backend MySQL database:

```sql
CREATE TABLE IF NOT EXISTS `profiles` (
    id INT PRIMARY KEY, 
    email VARCHAR(255) NOT NULL, 
    full_name VARCHAR(255), 
    avatar_url TEXT, 
    role VARCHAR(50) DEFAULT 'user', 
    status VARCHAR(50) DEFAULT 'pending', 
    phone VARCHAR(20), 
    company_id INT, 
    department VARCHAR(255), 
    position VARCHAR(255), 
    invited_by INT, 
    invited_at TIMESTAMP NULL, 
    last_login TIMESTAMP NULL, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, 
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Option C: Create Profiles for Existing Users
If you already have users in the `users` table, populate the `profiles` table:

```sql
INSERT INTO profiles (id, email, role, status, created_at, updated_at)
SELECT id, email, COALESCE(role, 'user'), 'active', created_at, created_at
FROM users
WHERE id NOT IN (SELECT id FROM profiles);
```

---

## Verification

After deploying the fix, verify the solution:

### 1. Check table exists
```bash
curl "https://med.wayrus.co.ke/api.php?action=health"
# Response should show: {"status":"success","message":"API is healthy"}
```

### 2. Test login
Use the frontend login form with test credentials - should now succeed

### 3. Check profiles table
Query the database directly (for MySQL admin access):
```sql
DESCRIBE `wayrusc1_med`.`profiles`;
```

Should show all columns listed in the table structure above

---

## Files Modified

1. **public/api.php** - Added profiles table to ensureTables() function
2. **backend/api.php** - Added profiles table to ensureTables() function

---

## Summary of Changes

- ✅ Added `profiles` table definition to database initialization
- ✅ Table structure matches frontend expectations
- ✅ Default values align with application logic
- ✅ Timestamps (created_at, updated_at) included for audit trail
- ✅ Applied to both API variants for consistency

---

## Related Files for Reference

- **Frontend Auth Flow**: `src/contexts/AuthContext.tsx` (lines 352-396)
- **Frontend API Adapter**: `src/integrations/database/external-api-adapter.ts` (lines 94-126)
- **Frontend Auth Helper**: `src/integrations/auth/external-api-auth.ts` (lines 28-56)
- **Database Schema Reference**: `COMPREHENSIVE_DATABASE_MIGRATION.sql` (lines 80-97)

---

## Additional Notes

The application supports two database models:
1. **Supabase/PostgreSQL** - Uses UUID for IDs with RLS policies
2. **External API/MySQL** - Uses INT for IDs (simpler but less flexible)

The `profiles` table was added using MySQL-compatible syntax suitable for the external API model. If you're using Supabase, refer to COMPREHENSIVE_DATABASE_MIGRATION.sql for PostgreSQL schema.

---

## Questions?

If authentication still fails after these steps:
1. Verify the backend API is running and accessible at med.wayrus.co.ke
2. Check database connection credentials (DB_HOST, DB_USER, DB_PASS, DB_NAME)
3. Confirm the health endpoint works: `https://med.wayrus.co.ke/api.php?action=health`
4. Review backend logs for any SQL errors during table creation
