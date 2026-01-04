# Authentication Troubleshooting Guide

## Error: "Invalid email or password" When Admin Doesn't Exist

### The Problem
You're getting "Invalid email or password" error because the admin user hasn't been created in the database, OR the database isn't properly initialized.

Your system is configured to use: **`https://med.wayrus.co.ke/api.php`**

---

## Quick Diagnosis

### Step 1: Run API Diagnostics
1. Open your application login page
2. Navigate to `/admin-init-external`
3. Click **"Show Advanced Diagnostics"** button
4. Click **"Run API Diagnostics"** button
5. Review the results - they will tell you:
   - ✅ API Connectivity
   - ✅ Setup Endpoint status
   - ✅ Login Endpoint status
   - ✅ Database Connection status

### Step 2: Check Browser Console
- Press `F12` to open Developer Tools
- Go to "Console" tab
- Run diagnostics and check the full report in the console logs

---

## Solution Paths

### Path A: Fix Remote API (Recommended if you control med.wayrus.co.ke)

If you have access to the server at `med.wayrus.co.ke`, follow these steps:

#### 1. Verify Database Connection
The backend API at that server needs these environment variables:
```env
DB_HOST=localhost  (or your DB server)
DB_USER=wayrusc1_med
DB_PASS=Sirgeorge.12
DB_NAME=wayrusc1_med
```

#### 2. Verify MySQL Database Exists
```bash
# On the server, check if the database exists
mysql -u wayrusc1_med -p
> SHOW DATABASES;
> USE wayrusc1_med;
> SHOW TABLES;  # Should have a 'users' table
```

#### 3. Create Users Table if Missing
If the `users` table doesn't exist, run:
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. Test the Setup Endpoint via curl
```bash
curl -X POST "https://med.wayrus.co.ke/api.php?action=setup" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mail.com","password":"Pass123"}'
```

Expected response:
```json
{
  "status": "success",
  "message": "Admin user created",
  "id": 1,
  "email": "admin@mail.com"
}
```

---

### Path B: Use Different External API

If you have access to a different API server that's already set up, change the URL:

1. Set environment variable:
   ```bash
   VITE_EXTERNAL_API_URL=https://your-api-server.com/api.php
   ```

2. Restart the application:
   ```bash
   npm run dev
   ```

---

### Path C: Set Up Local API (Self-Hosted Solution)

If you want to run the API locally:

#### 1. Set Up Local MySQL
```bash
# Install MySQL (if not already installed)
# macOS:
brew install mysql
brew services start mysql

# Linux:
sudo apt install mysql-server
sudo systemctl start mysql

# Windows: Download from mysql.com or use WSL
```

#### 2. Configure Credentials
Create a `.env` file in the `backend/` directory:
```env
DB_HOST=localhost
DB_USER=root
DB_PASS=your-password
DB_NAME=med_supplies
JWT_SECRET=your-secret-key-here
```

#### 3. Create Database
```bash
mysql -u root -p
> CREATE DATABASE med_supplies;
> CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
```

#### 4. Run Local API
```bash
# Option A: Using PHP built-in server
php -S localhost:8000 -t backend/

# Option B: Using Apache/Nginx
# Configure your web server to serve the backend/ directory
```

#### 5. Update Frontend Config
Set environment variable:
```bash
VITE_EXTERNAL_API_URL=http://localhost:8000/api.php
```

---

## Manual Testing

### Test 1: Check If Admin Can Be Created
```bash
curl -X POST "https://med.wayrus.co.ke/api.php?action=setup" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mail.com","password":"Pass123"}'
```

### Test 2: Check If Admin Can Login
```bash
curl -X POST "https://med.wayrus.co.ke/api.php?action=login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mail.com","password":"Pass123"}'
```

Expected response should have a `token` field.

### Test 3: Check If Users Table Exists
```bash
curl -X POST "https://med.wayrus.co.ke/api.php?action=read&table=users" \
  -H "Content-Type: application/json" \
  -d '{}'
```

If the response says the table doesn't exist, that's your problem - create it (see Path A, Step 3).

---

## Error Messages & Solutions

| Error Message | Likely Cause | Solution |
|---|---|---|
| Cannot reach API | Network issue or wrong URL | Check URL, internet connection, firewall |
| Invalid email or password | Admin doesn't exist | Run setup endpoint or check database |
| Database connection error | DB not accessible | Check DB credentials, host, port |
| Unknown action: setup | Old/wrong API version | Use correct API endpoint |
| Table users doesn't exist | Database not initialized | Create the users table |

---

## Checklist for Debugging

- [ ] Run API Diagnostics (shows in browser console)
- [ ] Verify API is accessible (curl the endpoint)
- [ ] Check database exists on the server
- [ ] Check users table exists
- [ ] Try creating admin user via curl
- [ ] Try logging in via curl
- [ ] Check API server logs
- [ ] Verify environment variables are set

---

## Getting Help

### Collect This Information
1. Output of `npm run setup:external-api --dry-run`
2. Output of API Diagnostics from the browser
3. Error messages from browser console
4. Curl test responses (Test 1, 2, 3 above)

### Share These Logs
```bash
# If using local API:
tail -f /var/log/mysql/error.log  # MySQL error log
tail -f /var/log/apache2/error.log  # Apache error log

# If using remote API:
Contact the server administrator for API and database logs
```

---

## Default Credentials (After Successful Setup)

```
Email:    admin@mail.com
Password: Pass123
Role:     admin
```

Change these immediately in production!

---

## Summary

Your system uses a **remote API** at `med.wayrus.co.ke`. The "Invalid email or password" error means:

1. **Most likely**: The admin user hasn't been created in that database yet
2. **Also possible**: The database isn't properly initialized (users table missing)
3. **Or**: The database connection is failing on that server

**Recommended next step**:
1. Go to `/admin-init-external` page
2. Click "Show Advanced Diagnostics"
3. Run diagnostics to identify the specific issue
4. Based on results, follow Path A, B, or C above
