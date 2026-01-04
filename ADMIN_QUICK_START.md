# Admin Quick Start Guide

## Setup (One Time)

```bash
# 1. Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# 2. Deploy combined migration
supabase db push

# 3. Verify setup
npm run admin:create-user -- --help
```

## Common Admin Tasks

### Create a User

```bash
npm run admin:create-user -- \
  --email newuser@example.com \
  --password SecurePass123! \
  --role admin \
  --company-id <paste-company-uuid-here>
```

**Parameters:**
- `--email` (required) - User's email
- `--password` (required) - Initial password (min 8 chars)
- `--role` (required) - admin, accountant, stock_manager, user, super_admin
- `--company-id` (required) - UUID of the company
- `--full-name` (optional) - User's full name
- `--phone` (optional) - User's phone number
- `--department` (optional) - Department name
- `--position` (optional) - Job position

### Reset a User's Password

```bash
npm run admin:reset-password -- \
  --email user@example.com \
  --user-id <user-uuid> \
  --admin-id <your-admin-uuid>
```

User will receive email with reset link.

### Fix RLS Issues

```bash
# Generate SQL
npm run admin:fix-rls

# Save to file for manual execution
npm run admin:fix-rls -- --output fix-rls.sql

# Then copy & run in Supabase SQL editor
```

## Database Deployment

### New Database

```bash
# Push all migrations at once
supabase db push
```

### Existing Database

```bash
# This will apply the new combined migration
supabase db push

# Or manually:
# 1. Go to Supabase SQL Editor
# 2. Copy content from: supabase/migrations/20250201000000_combined_complete_schema.sql
# 3. Paste and Execute
```

## Get Required IDs

```bash
# Get all companies
supabase db query <<EOF
SELECT id, name FROM companies;
EOF

# Or via Supabase Dashboard:
# Tables → companies → view data

# Get a specific user ID
supabase db query <<EOF
SELECT id, email, role FROM profiles WHERE email = 'user@example.com';
EOF
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Company not found" | Verify company_id exists: `SELECT id FROM companies;` |
| "User already exists" | User already created, use different email |
| Password reset email not received | Check Supabase email config in dashboard |
| RLS policy conflicts | Run `npm run admin:fix-rls` |
| Environment variables not found | Check: `echo $SUPABASE_URL` |

## API Endpoints (Backend)

If you have a backend server running:

```bash
# Create user
curl -X POST http://localhost:3000/api/admin/users/create \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "role": "admin",
    "company_id": "uuid-here"
  }'

# Reset password
curl -X POST http://localhost:3000/api/admin/users/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "user_id": "user-uuid",
    "admin_id": "admin-uuid"
  }'

# Fix RLS
curl -X POST http://localhost:3000/api/admin/database/fix-rls \
  -H "Content-Type: application/json" \
  -d '{}'
```

## What Changed

| Before | After |
|--------|-------|
| Edge functions in `supabase/supabase/functions/` | Node.js scripts in `src/server/lib/` |
| Manual edge function deployment | Part of app code |
| 30+ migration files | 1 combined migration |
| Complex dependency management | Single deployment file |

## File Structure

```
supabase/
  migrations/
    20250201000000_combined_complete_schema.sql  ← All schema here now

src/
  server/
    lib/
      adminCreateUser.ts        ← User creation logic
      adminResetPassword.ts     ← Password reset logic
      fixProfileRls.ts          ← RLS fixes
    routes/
      adminUsers.ts             ← API endpoint handlers

scripts/
  admin/
    create-user.ts              ← CLI tool
    reset-password.ts           ← CLI tool
    fix-rls.ts                  ← CLI tool
```

## Next Steps

1. ✅ Deploy combined migration: `supabase db push`
2. ✅ Test CLI tools
3. ✅ Update any other deployment scripts
4. 📝 Update team documentation
5. 🗑️ Optional: Archive old migration files

---

**Need help?** Check `MIGRATION_CONSOLIDATION_GUIDE.md` for detailed documentation.
