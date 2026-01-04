# Admin User Setup - Checklist

Use this checklist to ensure your admin setup is complete and correct.

## Pre-Setup ✓

- [ ] **Supabase Project Created**
  - Project URL: `https://app.supabase.com/`
  
- [ ] **Database Migrations Applied**
  - Profiles table created
  - User roles defined (admin, accountant, stock_manager, user)
  - Companies table created
  
- [ ] **Service Role Key Obtained**
  - Go to: Settings → API
  - Copy: Service Role Key (NOT the anon key)
  - Verify it starts with: `eyJ0eXAi...` or similar

- [ ] **Node.js Installed**
  - Check: `node --version` (should be v14+)
  
- [ ] **Dependencies Installed**
  - Check: `npm list @supabase/supabase-js`

## Setup Execution ✓

### Step 1: Prepare Environment
```bash
□ Open terminal
□ Navigate to project directory: cd your-project
□ Set environment variable:
  export SUPABASE_SERVICE_ROLE_KEY="your-key-here"
□ Verify: echo $SUPABASE_SERVICE_ROLE_KEY (should show your key)
```

### Step 2: Run Setup Script
```bash
□ Execute: node scripts/create-first-admin.js
□ OR use alternative method (see ADMIN_SETUP_QUICK_START.md)
```

### Step 3: Follow Prompts
```bash
□ Enter admin email address
□ Create secure password (8+ characters)
□ Confirm password
□ Enter full name (optional)
□ Script creates company (if needed)
□ Script creates auth user
□ Script creates profile
□ Script assigns permissions
```

### Step 4: Verify Success
```bash
□ Look for: "✅ SUCCESS! First admin user created!"
□ Script shows:
  • Email: [your-admin-email]
  • Role: admin
  • Status: active
  • Company: [company-name]
```

## Post-Setup Verification ✓

### Test with Verification Script
```bash
□ Run: node scripts/verify-admin-setup.js
□ Enter admin email
□ Script checks:
  ✓ Profile exists
  ✓ Status is "active"
  ✓ Role is "admin"
  ✓ Company assigned
  ✓ Permissions set
  ✓ Auth user exists
```

### Test Sign-In
```bash
□ Open application in browser
  URL: http://localhost:5173 (development)
  OR your production URL

□ Click "Sign In"

□ Enter credentials:
  Email: [your-admin-email]
  Password: [your-password]

□ Click "Sign In"

□ Expected result:
  ✓ Redirected to dashboard
  ✓ Can see all admin features
  ✓ No "Account pending approval" error
```

### Verify Dashboard Access
```bash
□ Dashboard loads without errors
□ Can see all navigation menus
□ Can access admin sections:
  • Settings
  • Users
  • Company Settings
  • Reports (if available)
□ No permission warnings or errors
```

## Troubleshooting ✓

### Setup Script Issues
```bash
□ Issue: "SUPABASE_SERVICE_ROLE_KEY not found"
  ✓ Solution: export SUPABASE_SERVICE_ROLE_KEY="your-key"

□ Issue: "User already exists"
  ✓ Solution: Choose "yes" to update to admin

□ Issue: "Invalid email format"
  ✓ Solution: Check email spelling and format

□ Issue: "Password too short"
  ✓ Solution: Use at least 8 characters

□ For other issues: See FIRST_ADMIN_SETUP.md
```

### Sign-In Issues
```bash
□ Issue: "Invalid credentials"
  ✓ Solution: Check spelling, case-sensitive password

□ Issue: "Account pending approval"
  ✓ Solution: Run: node scripts/approve-admin-account.js

□ Issue: "Cannot find user"
  ✓ Solution: Run verification script to check setup

□ For other issues: Check browser console for errors
```

## Security Checklist ✓

- [ ] **Service Role Key**
  - [ ] NOT committed to git
  - [ ] NOT shared with unauthorized users
  - [ ] Stored safely (use password manager if needed)
  - [ ] Can be rotated from Supabase console

- [ ] **Admin Password**
  - [ ] At least 8 characters
  - [ ] Contains mixed case and numbers
  - [ ] Contains special characters (recommended)
  - [ ] Stored in password manager
  - [ ] NOT shared via email or chat
  - [ ] Unique (not used elsewhere)

- [ ] **Account Security**
  - [ ] Email confirmed
  - [ ] Status is "active"
  - [ ] Role is "admin"
  - [ ] Can sign in successfully
  - [ ] Consider enabling MFA if available

## Documentation Review ✓

- [ ] **Read**: ADMIN_SETUP_QUICK_START.md (2 min read)
- [ ] **Read**: FIRST_ADMIN_SETUP.md (complete guide)
- [ ] **Read**: ADMIN_SETUP_IMPLEMENTATION.md (technical details)
- [ ] **Bookmark**: This checklist for future reference

## Next Steps After Successful Setup ✓

1. [ ] **Create Additional Users**
   - Go to: Settings → Users → Create User
   - Create users for team members
   - Assign appropriate roles

2. [ ] **Configure Company Settings**
   - Go to: Settings → Company Settings
   - Update company name, address, contact info
   - Upload company logo (if available)

3. [ ] **Set Up Integrations** (if needed)
   - Payment methods
   - Email configuration
   - API integrations

4. [ ] **Import Data** (if available)
   - Customers
   - Products
   - Suppliers
   - Historical transactions

5. [ ] **Configure Access Control**
   - Set user permissions
   - Configure role-based access
   - Review RLS policies

6. [ ] **Test All Features**
   - Create a test transaction
   - Test all major features
   - Verify permissions work correctly

## Rollback Plan (If Issues Occur) ✓

If something goes wrong and you need to start over:

```bash
□ Delete admin user via Supabase console:
  • Go to: Authentication → Users
  • Find your admin user
  • Delete it

□ Or delete the profile record:
  • SQL: DELETE FROM profiles WHERE email = 'admin@example.com';

□ Then re-run the setup script:
  • node scripts/create-first-admin.js
```

## Support Resources ✓

- [ ] **Quick Reference**: ADMIN_SETUP_QUICK_START.md
- [ ] **Full Guide**: FIRST_ADMIN_SETUP.md
- [ ] **Technical Details**: ADMIN_SETUP_IMPLEMENTATION.md
- [ ] **Supabase Docs**: https://supabase.com/docs
- [ ] **This Project**: See README.md

## Sign-Off ✓

```
Setup Completed By: ________________
Date: ________________
Admin Email: ________________
Verified Working: [ ] Yes [ ] No

Notes:
_________________________________
_________________________________
_________________________________
```

---

**All done?** Your admin user is ready! 🎉

Go to your application and sign in to get started!
