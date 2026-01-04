# External API Database Setup Guide

This guide explains how to initialize the MySQL database and create user accounts for the Medical Supplies application using the external API.

## Overview

The application supports three methods to initialize the database and create users:

1. **Web UI** - Interactive setup page (recommended)
2. **Command Line** - Automated setup scripts
3. **Manual API Calls** - Direct HTTP requests

---

## Method 1: Web UI (Recommended)

### Access the Setup Page

1. Open your browser and navigate to:
   ```
   https://your-app-url/admin-init-external
   ```

2. The page will:
   - Check if the database is already initialized
   - Display the current API configuration
   - Show setup status and credentials

### Initialize Database

1. **Review Configuration**
   - Verify the API URL is correct
   - Update if needed (e.g., for local development)

2. **Click "Initialize Database & Create Admin User"**
   - The system will automatically:
     - Create all database tables
     - Create the admin user
     - Set up JWT authentication
     - Display a progress log

3. **Save Your Credentials**
   - Default email: `admin@biolegend.local`
   - Default password: `Biolegend2024!Admin`
   - Store these safely!

### Manual Setup (If Automated Fails)

If the automated setup fails, use the curl command provided on the page:

```bash
curl -X POST "https://med.wayrus.co.ke/api.php?action=setup" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@biolegend.local","password":"Biolegend2024!Admin"}'
```

---

## Method 2: Command Line Setup

### Prerequisites

- Node.js installed (for Node.js script)
- Or curl installed (for shell script)

### Option A: Node.js Script (Recommended)

Run the Node.js setup script:

```bash
npm run setup:external-api
```

Or with custom options:

```bash
npm run setup:external-api -- --api-url https://your-api.com/api.php \
  --email admin@yourcompany.com \
  --password YourSecurePassword123!
```

**Dry run** (preview without making changes):

```bash
npm run setup:external-api:dry
```

### Option B: Shell Script

Make the script executable:

```bash
chmod +x setup-external-api.sh
```

Run the script:

```bash
./setup-external-api.sh
```

Or with custom options:

```bash
./setup-external-api.sh \
  --api-url https://your-api.com/api.php \
  --email admin@yourcompany.com \
  --password YourSecurePassword123!
```

**Dry run**:

```bash
./setup-external-api.sh --dry-run
```

### Script Features

- **Automatic API testing** - Verifies connectivity before setup
- **Database initialization** - Creates all required tables
- **User creation** - Creates admin user with secure password hashing
- **Login verification** - Tests authentication to confirm setup success
- **Progress logging** - Detailed output of each step
- **Error handling** - Clear error messages if something fails
- **Dry run mode** - Preview changes without executing them

### Environment Variables

You can also use environment variables:

```bash
export API_URL="https://your-api.com/api.php"
export ADMIN_EMAIL="admin@yourcompany.com"
export ADMIN_PASSWORD="YourSecurePassword123!"

npm run setup:external-api
```

---

## Method 3: Manual API Calls

### Step 1: Initialize Database & Create Admin

```bash
curl -X POST "https://med.wayrus.co.ke/api.php?action=setup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@biolegend.local",
    "password": "Biolegend2024!Admin"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Admin user created",
  "id": 1,
  "email": "admin@biolegend.local"
}
```

### Step 2: Test Login

```bash
curl -X POST "https://med.wayrus.co.ke/api.php?action=login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@biolegend.local",
    "password": "Biolegend2024!Admin"
  }'
```

**Expected Response:**
```json
{
  "status": "success",
  "message": "Login successful",
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": 1,
    "email": "admin@biolegend.local",
    "role": "admin"
  }
}
```

Save the `token` from the response for authenticated API calls.

---

## Default Credentials

### Admin User

| Property | Value |
|----------|-------|
| **Email** | `admin@biolegend.local` |
| **Password** | `Biolegend2024!Admin` |
| **Role** | `admin` |

> ⚠️ **Important**: Change the default password after first login!

---

## What Gets Created

When you run the setup, the following database tables are created:

### Users Table

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password TEXT,
  role VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Additional Tables

The API automatically creates these tables:

- **contacts** - Contact form submissions
- **newsletter** - Newsletter subscribers
- **leads** - CRM leads
- **quotations** - Sales quotations
- **portfolios** - Portfolio items
- **opportunities** - Sales opportunities
- **discovery_leads** - Discovery leads
- **logs** - Application logs

---

## Troubleshooting

### Issue: "API is not responding"

**Solution:**
1. Check the API URL is correct
2. Verify the server is running
3. Test with curl manually:
   ```bash
   curl -I https://med.wayrus.co.ke/api.php
   ```

### Issue: "Database connection failed"

**Solution (On Server):**
1. Check MySQL is running
2. Verify environment variables:
   ```bash
   echo $DB_HOST $DB_USER $DB_NAME
   ```
3. Test connection:
   ```bash
   mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME
   ```

### Issue: "Admin user creation failed"

**Solution:**
1. Check if user already exists:
   ```bash
   mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME
   SELECT * FROM users WHERE email = 'admin@biolegend.local';
   ```
2. If user exists, just use the login method
3. If permission error, check database user permissions

### Issue: "Login token not received"

**Solution:**
1. Verify user was created
2. Check password is correct
3. Ensure JWT_SECRET is set:
   ```bash
   echo $JWT_SECRET
   ```

### Issue: CORS Error

**Solution:**
1. Verify API CORS headers are enabled
2. Check request origin
3. Test with curl (no CORS restrictions)

---

## Security Best Practices

### 1. Change Default Password

After successful setup, immediately change the admin password:

```bash
curl -X POST "https://med.wayrus.co.ke/api.php?action=update&table=users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "id": 1,
    "password": "YourNewSecurePassword123!"
  }'
```

### 2. Secure JWT Secret

Set a strong JWT_SECRET on the server:

```bash
export JWT_SECRET=$(openssl rand -base64 32)
```

### 3. Use HTTPS

Always use HTTPS in production:

```
https://your-domain.com/api.php (production)
https://med.wayrus.co.ke/api.php (external)
```

### 4. Database Credentials

Store database credentials in environment variables:

```bash
export DB_HOST="your-mysql-host"
export DB_USER="your-mysql-user"
export DB_PASS="your-mysql-password"
export DB_NAME="your-database"
```

### 5. Regular Backups

Create regular backups of your database:

```bash
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME > backup.sql
```

---

## Creating Additional Users

After the database is initialized, you can create additional users via the app or API:

### Via API

```bash
curl -X POST "https://med.wayrus.co.ke/api.php?action=create&table=users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "email": "user@company.com",
    "password": "SecurePassword123!",
    "role": "user"
  }'
```

### Via Web UI

1. Login to the application
2. Go to Settings → User Management
3. Click "Add New User"
4. Enter email and password
5. Assign role (admin, user, etc.)
6. Click "Create"

---

## Verifying Setup Success

### Check Database Connection

```bash
curl -X POST "https://med.wayrus.co.ke/api.php?action=read&table=users" \
  -H "Content-Type: application/json" \
  -d '{"where": {}}'
```

**Expected Response:**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "email": "admin@biolegend.local",
      "role": "admin",
      "created_at": "2025-01-04 12:34:56"
    }
  ]
}
```

### Test Login

Try logging in with the admin credentials:

1. Open the app in your browser
2. Navigate to the login page
3. Enter:
   - Email: `admin@biolegend.local`
   - Password: `Biolegend2024!Admin`
4. Click Sign In

---

## Next Steps

After successful initialization:

1. ✅ Access the application dashboard
2. ✅ Configure company settings
3. ✅ Set up payment methods
4. ✅ Create team members
5. ✅ Customize tax settings
6. ✅ Begin managing your business

---

## Support

For issues or questions:

1. Check the **Troubleshooting** section above
2. Review **EXTERNAL_API_SETUP.md** for detailed API documentation
3. Check server logs for error messages
4. Test API endpoints with curl directly
5. Review environment variables configuration

---

## Files Reference

| File | Purpose |
|------|---------|
| `/admin-init-external` | Web UI setup page |
| `scripts/setup-external-api.js` | Node.js setup script |
| `setup-external-api.sh` | Shell setup script |
| `src/utils/externalApiSetup.ts` | Setup utility functions |
| `backend/api.php` | PHP API server (reference) |
| `EXTERNAL_API_SETUP.md` | API documentation |
| `EXTERNAL_API_QUICK_START.md` | Quick start guide |

---

## Common Commands

```bash
# Initialize database interactively
npm run setup:external-api

# Dry run (preview)
npm run setup:external-api:dry

# With custom email
npm run setup:external-api -- --email admin@yourcompany.com

# With custom password
npm run setup:external-api -- --password YourPassword123!

# Custom API URL
npm run setup:external-api -- --api-url https://your-api.com/api.php

# All options
npm run setup:external-api -- \
  --api-url https://api.example.com/api.php \
  --email admin@example.com \
  --password SecurePass123!
```

---

## Architecture

```
┌─────────────────────────────────┐
│  Web UI                         │
│  /admin-init-external          │
└──────────────┬──────────────────┘
               │ (HTTP)
┌──────────────▼──────────────────┐
│  Application                    │
│  src/utils/externalApiSetup.ts │
└──────────────┬──────────────────┘
               │ (HTTPS)
┌──────────────▼──────────────────┐
│  External API                   │
│  med.wayrus.co.ke/api.php      │
└──────────────┬──────────────────┘
               │ (MYSQLI)
┌──────────────▼──────────────────┐
│  MySQL Database                 │
│  wayrusc1_med                   │
└─────────────────────────────────┘
```

---

**Last Updated:** January 2025  
**Version:** 1.0
