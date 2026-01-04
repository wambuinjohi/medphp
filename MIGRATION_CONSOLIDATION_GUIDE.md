# Migration Consolidation & Edge Function Refactoring Guide

## Overview

This guide documents the consolidation of all database migrations into a single comprehensive migration file and the refactoring of edge functions into Node.js scripts with API endpoints.

## What Was Done

### 1. Combined Database Migration

**File**: `supabase/migrations/20250201000000_combined_complete_schema.sql`

All individual migrations have been consolidated into a single, comprehensive migration file that includes:

- All table definitions (companies, customers, products, invoices, etc.)
- All indexes for performance optimization
- All functions and triggers
- All RLS (Row Level Security) policies
- Complete schema setup with proper ordering

**Benefits**:
- Single deployment point instead of managing 30+ migration files
- Guaranteed consistency in dependency ordering
- Easier to understand complete schema at a glance
- Simplified migration management

**Usage**:
```bash
# Deploy using Supabase CLI
supabase db push

# Or apply manually in Supabase SQL editor
# Copy the entire content and execute
```

### 2. Refactored Edge Functions to Node.js Scripts

#### Created Files:

**Server-side utility libraries:**
- `src/server/lib/adminCreateUser.ts` - User creation logic
- `src/server/lib/adminResetPassword.ts` - Password reset logic
- `src/server/lib/fixProfileRls.ts` - RLS policy fixes

**Backend API routes:**
- `src/server/routes/adminUsers.ts` - Express-style route handlers

**CLI admin tools:**
- `scripts/admin/create-user.ts` - CLI for creating users
- `scripts/admin/reset-password.ts` - CLI for password resets
- `scripts/admin/fix-rls.ts` - CLI for fixing RLS issues

#### Why This Approach?

1. **Better Control**: Node.js runs in your application environment
2. **Easier Debugging**: Standard Node.js debugging tools work
3. **Offline Capable**: Can work if Supabase edge runtime has issues
4. **Environment Variables**: Access to full app configuration
5. **Type Safety**: Full TypeScript support with proper types
6. **Testing**: Easier to unit test functions
7. **Flexibility**: Can be called from API, CLI, or programmatically

### 3. Updated Frontend Code

**Changed files:**
- `src/hooks/useUserManagement.ts` - Now uses `/api/admin/users/create` and `/api/admin/users/reset-password` instead of edge functions
- `src/utils/databaseTableChecker.ts` - Updated to use API endpoints

**Changes**:
- Edge function calls via `supabase.functions.invoke()` → API calls via `fetch()`
- No need for Bearer token authentication (handled by your backend)
- Better error handling with HTTP status codes

## How to Use

### Option 1: CLI Admin Tools

#### Create a User
```bash
# With all parameters
npx ts-node scripts/admin/create-user.ts \
  --email john@example.com \
  --password SecurePass123! \
  --role admin \
  --company-id <uuid> \
  --full-name "John Doe" \
  --phone "+1234567890" \
  --department "Sales"

# Or use npm script
npm run admin:create-user -- \
  --email john@example.com \
  --password SecurePass123! \
  --role admin \
  --company-id <uuid>

# Set environment variables first
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
npm run admin:create-user -- --email ... --password ... --role ... --company-id ...
```

#### Reset User Password
```bash
npm run admin:reset-password -- \
  --email user@example.com \
  --user-id <user-uuid> \
  --admin-id <admin-user-id>
```

#### Fix RLS Issues
```bash
# Generate SQL and save to file
npm run admin:fix-rls -- --output fix-rls.sql

# Or just display the SQL
npm run admin:fix-rls
```

### Option 2: Programmatic Use (Node.js)

```typescript
import { adminCreateUser } from './src/server/lib/adminCreateUser';
import { adminResetPassword } from './src/server/lib/adminResetPassword';

const result = await adminCreateUser({
  email: 'user@example.com',
  password: 'SecurePass123!',
  role: 'admin',
  company_id: 'uuid-here',
  full_name: 'John Doe'
}, supabaseUrl, supabaseKey);

if (result.success) {
  console.log('User created:', result.user_id);
} else {
  console.error('Error:', result.error);
}
```

### Option 3: API Endpoints (from Frontend/Browser)

The functions are callable via HTTP endpoints:

```typescript
// Create user
const response = await fetch('/api/admin/users/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    role: 'admin',
    company_id: 'uuid',
    full_name: 'John Doe'
  })
});

// Reset password
const response = await fetch('/api/admin/users/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    user_id: 'user-uuid',
    admin_id: 'admin-uuid'
  })
});

// Fix RLS
const response = await fetch('/api/admin/database/fix-rls', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{}'
});
```

## Environment Variables Required

Make sure these are set:

```bash
# For Vite frontend
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# For backend scripts and API endpoints
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Migration Checklist

When deploying to a new environment:

- [ ] Run the combined migration: `supabase db push`
- [ ] Verify all tables exist in Supabase
- [ ] Verify all functions exist
- [ ] Verify all RLS policies are in place
- [ ] Test user creation via CLI: `npm run admin:create-user`
- [ ] Test password reset via CLI: `npm run admin:reset-password`
- [ ] Test API endpoint: `curl -X POST http://localhost:5173/api/admin/users/create`

## Keeping Edge Functions as Fallback

The original edge functions are still available in `supabase/supabase/functions/`. They can serve as a fallback if needed:

```typescript
// Original edge function still available
const { data, error } = await supabase.functions.invoke('admin-create-user', {
  body: { ... }
});
```

However, the frontend code has been updated to use the new API endpoints instead.

## Benefits of This Approach

| Aspect | Before (Edge Functions) | After (Node.js + API) |
|--------|------------------------|----------------------|
| Deployment | Via Supabase CLI | Part of your app |
| Debugging | Limited to Supabase logs | Full Node.js debugging |
| Type Safety | Partial (Deno) | Full TypeScript |
| Offline Testing | Difficult | Easy with local server |
| CLI Access | Not available | Available |
| Version Control | Separate | Same as app code |
| Environment Access | Limited | Full |
| Testing | Limited | Full unit test support |

## Troubleshooting

### User Creation Fails

1. Check company_id exists: `SELECT id FROM companies;`
2. Verify service role key has correct permissions
3. Check audit logs for error details

### Password Reset Not Working

1. Verify admin user has admin role
2. Check email is correct
3. Verify redirect URL is valid
4. Check Supabase email templates are configured

### RLS Issues

1. Run the fix-rls script
2. Execute the generated SQL in Supabase SQL editor
3. Verify policies reference the correct functions

## Next Steps

1. **Deploy the combined migration**
   ```bash
   supabase db push
   ```

2. **Test CLI tools**
   ```bash
   npm run admin:create-user -- --help
   ```

3. **Update production deployments** to use the new API endpoints

4. **Monitor logs** for any issues with the new approach

5. **Consider removing** the old edge functions once fully tested

## Files to Keep/Archive

### Keep:
- `supabase/migrations/20250201000000_combined_complete_schema.sql` - Your new combined migration
- `src/server/lib/*.ts` - Node.js script libraries
- `src/server/routes/adminUsers.ts` - API route handlers
- `scripts/admin/*.ts` - CLI admin tools
- `package.json` - Updated with new scripts

### Can Archive (optional fallback):
- Individual migration files (before 20250201)
- Edge function files in `supabase/supabase/functions/`

## Questions?

Refer to:
- Individual script files for usage examples
- API route file for endpoint documentation
- Supabase documentation for RLS and authentication details
