# Database Initialization Scripts - Summary

## Overview

Three new setup methods have been added to initialize the MySQL database and create admin user accounts. Choose the method that works best for your workflow.

---

## Quick Start

### Option 1: Web UI (Easiest)

Navigate to: **`/admin-init-external`**

- Interactive setup page
- Visual progress tracking
- Copy-paste curl commands
- No terminal required

### Option 2: NPM Command (Recommended)

```bash
npm run setup:external-api
```

- Cross-platform (Windows, Mac, Linux)
- Colored output with progress
- Easy to integrate in CI/CD
- Supports custom options

### Option 3: Shell Script (Advanced)

```bash
chmod +x setup-external-api.sh
./setup-external-api.sh
```

- Unix/Linux/Mac only
- Raw curl-based
- Full control

---

## Files Created

### 1. **src/pages/AdminInitExternal.tsx**
   - React component for web UI setup
   - Route: `/admin-init-external`
   - Features:
     - Database status checking
     - One-click setup button
     - Progress tracking
     - Manual curl commands
     - Credential display

### 2. **src/utils/externalApiSetup.ts**
   - Utility functions for API setup
   - Exported functions:
     - `initializeExternalAPI()` - Main setup function
     - `checkAdminExists()` - Verify admin user exists
     - `createUserViaAPI()` - Create additional users
     - `getDatabaseInfo()` - Get database status
   - Used by web UI and tests

### 3. **scripts/setup-external-api.js**
   - Node.js setup script
   - Cross-platform compatible
   - Run with: `npm run setup:external-api`
   - Features:
     - API connectivity testing
     - User creation with password hashing
     - Login verification
     - Colored console output
     - Dry-run mode
     - Custom options support

### 4. **setup-external-api.sh**
   - Bash shell script
   - Unix/Linux/Mac only
   - Run with: `./setup-external-api.sh`
   - Features:
     - Same as Node version
     - Uses curl directly
     - POSIX shell compatible
     - jq optional for JSON parsing

### 5. **package.json** (Modified)
   - Added npm scripts:
     - `npm run setup:external-api` - Run setup
     - `npm run setup:external-api:dry` - Preview mode

### 6. **src/App.tsx** (Modified)
   - Added route: `/admin-init-external`
   - Imports AdminInitExternal component

### 7. **EXTERNAL_API_SETUP_GUIDE.md**
   - Comprehensive setup documentation
   - Troubleshooting guide
   - Security best practices
   - API examples
   - Common commands

---

## Usage Examples

### Web UI Method

```
1. Open browser
2. Go to: https://your-app-url/admin-init-external
3. Click "Initialize Database & Create Admin User"
4. Wait for completion
5. Save credentials
6. Login to app
```

### NPM Method

```bash
# Default setup
npm run setup:external-api

# Custom email
npm run setup:external-api -- --email admin@company.com

# Custom password
npm run setup:external-api -- --password MyPassword123!

# Custom API URL
npm run setup:external-api -- --api-url https://api.example.com/api.php

# All options
npm run setup:external-api -- \
  --api-url https://api.example.com/api.php \
  --email admin@company.com \
  --password MyPassword123!

# Dry run (preview)
npm run setup:external-api:dry
```

### Shell Script Method

```bash
# Default setup
./setup-external-api.sh

# Custom email
./setup-external-api.sh --email admin@company.com

# Custom password
./setup-external-api.sh --password MyPassword123!

# Custom API URL
./setup-external-api.sh --api-url https://api.example.com/api.php

# Dry run (preview)
./setup-external-api.sh --dry-run

# Help
./setup-external-api.sh --help
```

### Manual Curl

```bash
# Create admin user
curl -X POST "https://med.wayrus.co.ke/api.php?action=setup" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@biolegend.local","password":"Biolegend2024!Admin"}'

# Test login
curl -X POST "https://med.wayrus.co.ke/api.php?action=login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@biolegend.local","password":"Biolegend2024!Admin"}'
```

---

## Default Credentials

| Property | Value |
|----------|-------|
| Email | `admin@biolegend.local` |
| Password | `Biolegend2024!Admin` |
| Role | `admin` |

> ⚠️ Change password after first login!

---

## What Gets Initialized

When you run setup, the system:

1. ✅ Tests API connectivity
2. ✅ Creates all database tables
3. ✅ Creates admin user account
4. ✅ Hashes password with bcrypt
5. ✅ Sets up JWT authentication
6. ✅ Verifies login works
7. ✅ Stores auth token

---

## Tables Created

- `users` - User accounts
- `contacts` - Contact submissions
- `newsletter` - Newsletter signups
- `leads` - CRM leads
- `quotations` - Sales quotations
- `portfolios` - Portfolio items
- `opportunities` - Opportunities
- `discovery_leads` - Discovery leads
- `logs` - Application logs

---

## Integration with App

### Environment Variables

```bash
VITE_DATABASE_PROVIDER=external-api
VITE_EXTERNAL_API_URL=https://med.wayrus.co.ke/api.php
```

### App Initialization

The app automatically:
1. Detects setup status when loading
2. Redirects to setup if needed
3. Stores auth token in localStorage
4. Sends token with API requests

---

## Troubleshooting

### Common Issues

**Issue:** "API is not responding"
```bash
# Test API connection
curl -I https://med.wayrus.co.ke/api.php
```

**Issue:** "Database connection failed"
```bash
# Check on server
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME
```

**Issue:** "User already exists"
```bash
# Clear existing user and try again
# Or update existing user with new password
```

See **EXTERNAL_API_SETUP_GUIDE.md** for detailed troubleshooting.

---

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Setup Database
  run: npm run setup:external-api
  env:
    API_URL: ${{ secrets.API_URL }}
    ADMIN_EMAIL: ${{ secrets.ADMIN_EMAIL }}
    ADMIN_PASSWORD: ${{ secrets.ADMIN_PASSWORD }}
```

### Docker Example

```dockerfile
RUN npm run setup:external-api
ENV API_URL=https://api.example.com/api.php
ENV ADMIN_EMAIL=admin@example.com
ENV ADMIN_PASSWORD=SecurePassword123!
```

---

## Comparison Matrix

| Feature | Web UI | NPM | Shell |
|---------|--------|-----|-------|
| Ease of use | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Cross-platform | ✅ | ✅ | ❌ |
| Automation | ❌ | ✅ | ✅ |
| Progress visual | ✅ | ⭐⭐⭐ | ⭐⭐ |
| CI/CD ready | ❌ | ✅ | ✅ |
| No terminal needed | ✅ | ❌ | ❌ |

---

## Next Steps

1. **Choose a setup method** (Web UI recommended for first-time)
2. **Run setup** using your preferred method
3. **Verify success** by logging in
4. **Change password** for security
5. **Start using app** normally

---

## Support

For detailed information:
- **Setup Guide**: See `EXTERNAL_API_SETUP_GUIDE.md`
- **API Docs**: See `EXTERNAL_API_SETUP.md`
- **Quick Start**: See `EXTERNAL_API_QUICK_START.md`

---

## File Structure

```
project/
├── src/
│   ├── pages/
│   │   └── AdminInitExternal.tsx      (Web UI)
│   ├── utils/
│   │   └── externalApiSetup.ts        (Utility functions)
│   └── App.tsx                        (Modified - added route)
├── scripts/
│   └── setup-external-api.js          (Node.js script)
├── setup-external-api.sh              (Shell script)
├── package.json                       (Modified - added scripts)
├── EXTERNAL_API_SETUP_GUIDE.md        (This guide)
└── SETUP_SCRIPTS_SUMMARY.md           (Summary)
```

---

## FAQ

**Q: Which method should I use?**
A: Start with the Web UI (`/admin-init-external`) for first-time setup. Use NPM script for automation and CI/CD.

**Q: Can I change the default credentials?**
A: Yes! Use custom options: `--email` and `--password` with any method.

**Q: What if setup fails?**
A: Check the troubleshooting section in `EXTERNAL_API_SETUP_GUIDE.md`. Most issues are connectivity or configuration related.

**Q: Is the database encrypted?**
A: Passwords are hashed with bcrypt. Use HTTPS for all API calls.

**Q: Can I reset the database?**
A: Yes, but you'll need manual SQL access. Consider creating a backup first.

---

**Created:** January 2025  
**Version:** 1.0  
**Status:** Ready for production
