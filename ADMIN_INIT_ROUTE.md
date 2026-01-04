# Admin Initialization Route

## Overview

A one-time initialization route has been created to set up the first admin user for the system.

**Route:** `/admin-init`

## Quick Start

1. Navigate to: `http://localhost:5173/admin-init` (development)
2. Click "Initialize Admin User" button
3. Admin user will be created with:
   - **Email:** `admin@mail.com`
   - **Password:** `Admin.12`
   - **Role:** `admin`
   - **Status:** `active`

## How It Works

### What the Route Does

1. **Checks for existing admin** - Verifies if `admin@mail.com` already exists
2. **Creates default company** - Sets up a company if none exists
3. **Calls edge function** - Uses the `admin-create-user` Supabase edge function
4. **Verifies creation** - Confirms the admin user was created with correct settings
5. **Shows confirmation** - Displays success message with credentials

### Access Control

- **No authentication required** - Can be accessed without signing in first
- **One-time only** - After admin exists, shows "Already Initialized" message
- **No sensitive data exposed** - Credentials are only shown on successful initialization

## Implementation Details

### Files Created/Modified

1. **`src/pages/AdminInit.tsx`** (NEW)
   - React component for initialization UI
   - Handles admin user creation workflow
   - Shows status and verification

2. **`src/App.tsx`** (MODIFIED)
   - Added `/admin-init` route
   - Route is accessible without authentication

### How It Works Technically

```
User visits /admin-init
    ↓
Check if admin@mail.com exists
    ├─ If exists → Show "Already Initialized"
    └─ If not → Show initialization button
         ↓
    User clicks "Initialize Admin User"
         ↓
    Create default company (if needed)
         ↓
    Call admin-create-user edge function
         ↓
    Edge function creates:
         • Auth user in Supabase Auth
         • Profile with admin role
         • Set status to "active"
         • Assign permissions
         ↓
    Verify admin was created
         ↓
    Show success message
         ↓
    User can proceed to sign in
```

## Credentials

### Default Admin Credentials

```
Email:    admin@mail.com
Password: Admin.12
Role:     admin
Status:   active
```

⚠️ **Important:** These credentials are hardcoded in the initialization page. Change the password immediately after first sign-in!

## Security Notes

- **One-time setup** - Can only be used to initialize the first admin
- **No credentials transmitted** - Edge function uses server-side authentication
- **RLS protected** - Database changes respect Row Level Security policies
- **Immediate activation** - Admin user is active immediately upon creation

## Using the Route

### Typical Setup Flow

1. Deploy the application
2. Navigate to `/admin-init`
3. Click "Initialize Admin User"
4. Sign in with `admin@mail.com` / `Admin.12`
5. Change password immediately (Settings → User Profile)
6. Create additional users with proper roles

### Verification

After initialization, verify the admin user by:

1. Going to `/admin-init` again
2. Should see "Admin Already Exists" message
3. Signing in with the admin credentials
4. Accessing the admin dashboard

## Troubleshooting

### Issue: "VITE_SUPABASE_URL not configured"
**Cause:** Environment variables not set
**Solution:** Ensure `.env.local` has `VITE_SUPABASE_URL`

### Issue: "Failed to create admin user"
**Cause:** Edge function error
**Possible reasons:**
- Supabase edge functions not deployed
- Service role key not configured
- Database connection issue

**Solution:**
1. Check Supabase edge functions are deployed
2. Verify database is accessible
3. Check Supabase logs for errors

### Issue: "Admin user created but verification failed"
**Cause:** Profile created but status check failed
**Solution:**
1. Check Supabase database directly
2. Verify admin@mail.com profile exists
3. Check profile has role='admin' and status='active'

## Alternative Methods

If the route fails, you can use the script method:

```bash
# Using Node.js script
export SUPABASE_SERVICE_ROLE_KEY="your-key"
node scripts/create-first-admin.js admin@mail.com Admin.12 "Admin User"
```

## Customization

### Changing Default Credentials

To use different credentials, edit `src/pages/AdminInit.tsx`:

```typescript
const ADMIN_EMAIL = 'admin@mail.com';      // Change email
const ADMIN_PASSWORD = 'Admin.12';         // Change password
const ADMIN_NAME = 'System Admin';         // Change name
```

Then rebuild the application.

### Removing Route After Setup

Once initialized, you can:

1. **Keep it** - Useful for setting up in production
2. **Disable it** - Remove the route from `src/App.tsx`
3. **Protect it** - Add authentication requirement to the route

To disable the route:

```typescript
// In src/App.tsx, remove these lines:
<Route path="/admin-init" element={<AdminInit />} />
```

## API Integration

The page calls the Supabase edge function:

```
POST /functions/v1/admin-create-user
```

Payload:
```json
{
  "email": "admin@mail.com",
  "password": "Admin.12",
  "full_name": "System Admin",
  "role": "admin",
  "company_id": "uuid-or-null"
}
```

The edge function handles:
- Creating auth.users entry
- Creating profiles row with admin role
- Setting status to 'active'
- Assigning permissions

## Best Practices

1. **First time setup** - Use this route for initial admin creation
2. **Secure password** - Change the default password after first sign-in
3. **Additional users** - Use the admin panel to create other users
4. **Keep records** - Document who has admin access
5. **Backup** - Ensure database backups are in place

## See Also

- [FIRST_ADMIN_SETUP.md](./FIRST_ADMIN_SETUP.md) - Complete admin setup guide
- [ADMIN_SETUP_QUICK_START.md](./ADMIN_SETUP_QUICK_START.md) - Quick reference
- [ADMIN_SETUP_CHECKLIST.md](./ADMIN_SETUP_CHECKLIST.md) - Setup checklist

## FAQ

**Q: Can I access this route after admin is created?**
A: Yes, but it will show "Admin Already Exists" and prevent further initialization.

**Q: What if I forget the admin password?**
A: Use the password reset functionality or contact Supabase support to reset the auth user.

**Q: Can I change the email address?**
A: Yes, edit `ADMIN_EMAIL` in `src/pages/AdminInit.tsx` before deploying.

**Q: Is this secure for production?**
A: Yes. The route uses server-side authentication via edge functions. However, change the default password immediately after setup.

**Q: What happens if initialization fails?**
A: The page shows an error message. Try again or use the Node.js script as an alternative.

**Q: Can multiple admins be created?**
A: Yes, use the admin panel to create additional admin users after the first one is set up.

---

**Status:** ✅ Ready for use
**Last Updated:** January 2025
