# Direct User Creation Without Edge Functions

## Changes Made

Updated `src/hooks/useUserManagement.ts` to remove edge function dependency and use the built-in Supabase invitation workflow instead.

## How It Works Now

### Admin Creates a User

1. Admin opens **Settings > User Management > "Add User"** button
2. Fills in the form:
   - Email (required)
   - Full Name (optional)
   - Role (required)
   - Password (shown for reference, not stored by admin)
3. Clicks **"Create User"**

### What Happens Behind the Scenes

1. **Validation**:
   - Checks admin has `create_user` permission ✓
   - Validates email format ✓
   - Confirms user doesn't already exist ✓
   - Verifies company exists ✓

2. **Create Pre-Approved Invitation**:
   - Creates user_invitations record with:
     - Email
     - Role
     - Company
     - Status: pending
     - **is_approved: true** (pre-approved by admin)
     - **approved_at: now** (already approved)

3. **Log Audit Trail**:
   - Records user creation in audit logs
   - Shows admin who created the user

4. **Success Message**:
   - Displays "Pre-approved invitation created for email@example.com"
   - Shows password to share with user (optional)

### User Signs Up

1. **User receives email** (optional - admin can share credentials)
2. **User goes to login page** and clicks "Sign Up"
3. **User enters**:
   - Email (provided by admin)
   - Password (can use the one provided or create their own)
4. **User account created** in Supabase auth

### Automatic Activation

When user signs up with approved invitation:
1. Supabase creates auth.users record
2. User's profile is created and automatically:
   - Set to status: **'active'** (not pending)
   - Assigned to correct company
   - Assigned correct role
   - Linked to admin who created invitation
3. **User can sign in immediately** ✓

## Technical Details

### Why Not Direct Auth User Creation?

Supabase auth users can only be created via:
1. **Client-side**: Using `signUp()` method (requires email verification)
2. **Server-side**: Using `auth.admin.createUser()` (requires service role key)
3. **Edge Functions**: Server-side Deno runtime (what we removed)

**Client limitation**: You cannot directly create auth users from the client-side without exposing secrets or using edge functions.

### Solution: Approved Invitations

- ✓ No edge functions needed
- ✓ No secrets exposed
- ✓ Uses Supabase's built-in auth flow
- ✓ One-step admin action
- ✓ Users are immediately active after signup
- ✓ Fully audited
- ✓ RLS policies respected

## Flow Comparison

### Before (with Edge Functions)
```
Admin fills form
    ↓
Call edge function (server)
    ↓
Edge function creates auth user + profile (with service role)
    ↓
User immediately active
```

### After (without Edge Functions)
```
Admin fills form
    ↓
Create pre-approved invitation (client)
    ↓
User signs up with email/password
    ↓
Supabase creates auth user (client signup)
    ↓
Profile auto-created and activated (via signup hook)
    ↓
User immediately active
```

## User Experience

### For Admin
✓ One click to create a user  
✓ Can see pre-approved invitation in "Approved Invitations" section  
✓ Optional: Share temporary password with user  

### For User
✓ Simple signup flow with pre-filled email  
✓ No approval step needed  
✓ Active immediately after signup  
✓ Can start using system right away  

## Database Operations

When admin creates user:
```
INSERT into user_invitations (
  email,
  role,
  company_id,
  invited_by,
  is_approved = true,
  approved_by,
  approved_at = now()
)
```

When user signs up:
```
1. Supabase creates auth.users record
2. Signup hook triggers:
   - Finds user_invitations with matching email
   - Checks if is_approved = true
   - Creates/updates profiles record with:
     - status = 'active'
     - role = invitation.role
     - company_id = invitation.company_id
     - invited_by = admin_id
```

## Advantages

✓ **No Edge Function Errors** - Uses Supabase's core auth system  
✓ **Simple** - Leverages built-in invitation workflow  
✓ **Secure** - No service role key exposed  
✓ **Audited** - All actions logged in audit trail  
✓ **One-Click** - Admin creates user in one step  
✓ **Compliant** - Follows Supabase auth best practices  
✓ **Scalable** - No additional server infrastructure needed  

## Limitations

✗ User must sign up to activate (not instant)  
✗ Requires user to create/receive password  
✗ Not suitable for fully automated user creation  

## Testing

### Test Admin User Creation

1. Login as admin
2. Go to Settings > User Management
3. Click "Add User" button
4. Fill form:
   - Email: test@example.com
   - Full Name: Test User
   - Role: User
   - Password: (shown for reference)
5. Click "Create User"
6. Verify: "Pre-approved invitation created" message

### Test User Signup

1. Logout
2. Go to login page
3. Click "Sign Up"
4. Enter email: test@example.com
5. Enter password
6. Verify: Account created and status is "active"
7. Verify: Can sign in immediately
8. Verify: Profile shows correct role and company

### Verify in UI

1. Go back to User Management
2. Check "Users" tab - new user should appear with status "active"
3. Check "Invitations" tab - invitation should show status "accepted"
4. Check "Audit Logs" - creation event should be logged

## Troubleshooting

### "User with this email already exists"
- Check if user already in system
- Verify email spelling
- Clear browser cache if needed

### User can't sign up
- Verify invitation is approved (is_approved = true)
- Check company still exists
- Verify no RLS policy blocking insertion

### Invited user not activating
- Check signup hook is working
- Verify user_invitations record has is_approved = true
- Check company_id matches
- Review browser console for errors

## Configuration

No additional configuration needed. Uses existing Supabase setup and auth flow.

## Migration from Edge Functions

If you were previously using edge functions:

1. ✓ Existing invitations still work
2. ✓ Existing users unaffected
3. ✓ No data migration needed
4. ✓ Can disable edge function if not needed elsewhere

## Future Improvements

- [ ] Add bulk user import (CSV)
- [ ] Add user templates for quick role assignment
- [ ] Add password generation and sharing via secure link
- [ ] Add SMS/WhatsApp delivery of signup link
- [ ] Add LDAP/Active Directory integration
