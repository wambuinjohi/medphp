# First Admin User Setup Guide

This guide will help you create the first admin user for the >> Medical Supplies system.

## Prerequisites

- **Supabase Service Role Key**: You need your Supabase project's service role key
- **Node.js**: Version 14+ (should already be installed)
- **Database access**: The system should have the required migrations applied

## Getting Your Service Role Key

1. Go to your Supabase project: https://app.supabase.com/
2. Click on your project
3. Navigate to **Settings** → **API** (in the left sidebar)
4. Look for **Service Role Key** (⚠️ NOT the anon key - this is sensitive!)
5. Copy the service role key

## Creating the First Admin User

### Option 1: Interactive Mode (Recommended for First Time)

```bash
# Set your service role key
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Run the setup script
node scripts/create-first-admin.js
```

The script will guide you through:
- Email address for the admin account
- Password (with confirmation)
- Full name (optional)
- Company selection or creation

### Option 2: Command Line Arguments

```bash
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

node scripts/create-first-admin.js admin@medplus.app "SecurePassword123!" "Admin User"
```

### Option 3: Environment Variables

```bash
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
export ADMIN_EMAIL="admin@medplus.app"
export ADMIN_PASSWORD="SecurePassword123!"
export ADMIN_FULL_NAME="Admin User"

node scripts/create-first-admin.js
```

## Understanding the Setup Process

The script performs the following steps:

1. **Validation**: Checks email and password requirements
2. **Existing User Check**: Verifies if the user already exists
3. **Company Setup**: Creates or links to a default company
4. **Auth User Creation**: Creates the authentication user in Supabase Auth
5. **Profile Creation**: Creates the user profile with admin role and active status
6. **Permissions Assignment**: Assigns dashboard viewing permissions

## Password Requirements

- Minimum 8 characters
- Should include uppercase, lowercase, numbers, and special characters for security
- Example: `SecurePass123!@`

## What Gets Created

When you create the first admin user, the following is set up:

```
Authentication User (Supabase Auth)
    ↓
User Profile
    ├─ Role: admin
    ├─ Status: active
    ├─ Company: [Company Name]
    └─ Permissions: view_dashboard_summary
```

## Signing In

Once the admin user is created:

1. Go to your application URL
2. Click "Sign In"
3. Enter the admin email and password
4. You should be redirected to the dashboard

## Troubleshooting

### "SUPABASE_SERVICE_ROLE_KEY environment variable is required"

**Solution**: Make sure you've set the environment variable:
```bash
export SUPABASE_SERVICE_ROLE_KEY="your-key-here"
```

Verify it's set:
```bash
echo $SUPABASE_SERVICE_ROLE_KEY
```

### "User already exists"

**Solution**: The script will offer to update the existing user to admin status. Choose "yes" to proceed.

### "Company not found"

**Solution**: The script automatically creates a default company if none exists. This should not be an issue.

### "Error creating auth user"

**Possible causes:**
- Email is already used by another user
- Password doesn't meet requirements
- Service role key is invalid or expired

**Solution:**
1. Check that the email hasn't been used before
2. Ensure password is at least 8 characters
3. Verify your service role key is current

### "Error creating profile"

**Possible causes:**
- RLS (Row Level Security) policies blocking the operation
- Database permissions issue

**Solution:**
1. Check that migrations have been applied
2. Try running the RLS fix function:
```bash
curl -X POST https://your-supabase-url/functions/v1/fix-profile-rls \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

## After Setup

### First Steps as Admin

1. **Update Company Information**: Go to Settings → Company Settings
2. **Create Additional Users**: Go to Settings → Users → Create User
3. **Configure Preferences**: Set up your company details and preferences
4. **Invite Team Members**: Use the invite function to add other users

### Important Reminders

- 🔐 **Keep the admin password secure** - store it in a password manager
- 🔑 **Never share the service role key** - it has full database access
- 👥 **Create additional users** for team members with appropriate roles
- 📋 **Set up roles and permissions** as needed for your team

## Alternative: Manual Database Update

If the script doesn't work, you can manually approve an existing user:

```bash
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
node scripts/approve-admin-account.js
```

This script will:
- Find the `admin@medplus.app` user
- Set their status to `active`
- Grant admin permissions

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the script output for detailed error messages
3. Verify your Supabase project is properly configured
4. Check that all migrations have been applied

## Security Best Practices

1. **Use a strong password**: Mix uppercase, lowercase, numbers, and special characters
2. **Secure your service role key**: Never commit it to version control
3. **Rotate keys regularly**: Update your service role key periodically
4. **Use environment variables**: Don't pass sensitive data in command line arguments
5. **Enable MFA**: Set up multi-factor authentication for the admin account (if available)

## What's Next?

After creating the admin user, you can:

- ✅ Create additional users with different roles (accountant, stock_manager, user)
- ✅ Set up company information and details
- ✅ Configure system settings and preferences
- ✅ Import existing data if available
- ✅ Set up integrations and automations
