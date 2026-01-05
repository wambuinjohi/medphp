# Local Authentication Server Setup Guide

## Overview

Your application has been configured with a **local authentication server** that doesn't require external API dependencies. This is perfect for:

- ✅ Development and testing
- ✅ Working offline
- ✅ Debugging authentication flows
- ✅ Quick setup without external dependencies

> ⚠️ **WARNING**: This server is **FOR DEVELOPMENT ONLY**. Do NOT use in production.

---

## Quick Start (1 Minute)

### Option A: Run Both Frontend & Auth Server Together

```bash
# Terminal 1: Start the auth server
npm run auth-server

# Terminal 2 (new terminal): Start the frontend in LOCAL mode
npm run dev:local
```

Then:
1. Open `http://localhost:8080`
2. Go to `/admin-init-external` 
3. Click "Initialize Database & Create Admin User"
4. Use these credentials to login:
   - Email: `admin@mail.com`
   - Password: `Pass123`

### Option B: Start Everything Together (if concurrently installed)

```bash
npm run dev-full
```

This will:
- Start auth server on `http://localhost:3001`
- Start frontend on `http://localhost:8080`

---

## Manual Setup

### Step 1: Start the Local Auth Server

```bash
node scripts/local-auth-server.js
```

Expected output:
```
╔════════════════════════════════════════════════════════════════╗
║        🔐 LOCAL AUTHENTICATION SERVER                          ║
╠════════════════════════════════════════════════════════════════╣
║ Server:  http://localhost:3001                                ║
║ Database: .auth-dev.json                                       ║
║                                                                ║
║ ⚠️  FOR DEVELOPMENT ONLY!                                      ║
║ Do NOT use this in production!                                 ║
╚════════════════════════════════════════════════════════════════╝
```

### Step 2: Configure Frontend to Use Local Auth

```bash
# Start frontend with local auth enabled
VITE_USE_LOCAL_AUTH=true npm run dev
```

Or manually set in terminal:

**macOS/Linux:**
```bash
export VITE_USE_LOCAL_AUTH=true
npm run dev
```

**Windows (PowerShell):**
```powershell
$env:VITE_USE_LOCAL_AUTH="true"
npm run dev
```

**Windows (CMD):**
```cmd
set VITE_USE_LOCAL_AUTH=true
npm run dev
```

### Step 3: Initialize Database

1. Open `http://localhost:8080`
2. Navigate to `/admin-init-external`
3. Click **"Initialize Database & Create Admin User"**
4. Check the console for success message

### Step 4: Login

Use these credentials:
- **Email:** `admin@mail.com`
- **Password:** `Pass123`

---

## API Endpoints

The local auth server provides these endpoints:

### POST /api/auth/setup
Create or update admin user

**Request:**
```bash
curl -X POST "http://localhost:3001/api/auth/setup" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mail.com","password":"Pass123"}'
```

**Response:**
```json
{
  "status": "success",
  "message": "Admin user created",
  "id": 1,
  "email": "admin@mail.com"
}
```

### POST /api/auth/login
Login with email and password

**Request:**
```bash
curl -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mail.com","password":"Pass123"}'
```

**Response:**
```json
{
  "status": "success",
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "admin@mail.com",
    "role": "admin"
  }
}
```

### POST /api/auth/check
Verify JWT token

**Request:**
```bash
curl -X POST "http://localhost:3001/api/auth/check" \
  -H "Authorization: Bearer <your-token>"
```

**Response:**
```json
{
  "status": "success",
  "user": {
    "id": 1,
    "email": "admin@mail.com",
    "role": "admin"
  }
}
```

### GET /users (Dev Endpoint)
List all users

```bash
curl http://localhost:3001/users
```

### POST /reset (Dev Endpoint)
Reset database (delete all users)

```bash
curl -X POST http://localhost:3001/reset
```

---

## Switching Between Auth Methods

### Use Local Auth (Development)
```bash
VITE_USE_LOCAL_AUTH=true npm run dev
```

**Endpoint:** `http://localhost:3001`

### Use Remote API (Production/Staging)
```bash
VITE_EXTERNAL_API_URL=https://med.wayrus.co.ke/api.php npm run dev
```

**Endpoint:** `https://med.wayrus.co.ke/api.php`

### Switch at Runtime (In Frontend)

Edit environment variable before starting:
```bash
# Check current setting
echo $VITE_USE_LOCAL_AUTH

# Change setting
export VITE_USE_LOCAL_AUTH=true
npm run dev
```

---

## Database Location

User credentials are stored in:
```
.auth-dev.json
```

This is a JSON file in the project root. Delete it to reset all users:

```bash
rm .auth-dev.json
npm run auth-server
```

---

## Troubleshooting

### "Cannot connect to auth server"

1. Make sure auth server is running:
   ```bash
   npm run auth-server
   ```

2. Check if port 3001 is available:
   ```bash
   lsof -i :3001  # macOS/Linux
   netstat -ano | findstr :3001  # Windows
   ```

3. Kill any process using port 3001:
   ```bash
   kill -9 <PID>  # macOS/Linux
   taskkill /PID <PID> /F  # Windows
   ```

### "Invalid email or password" after setup

1. Clear browser localStorage:
   ```javascript
   // In browser console
   localStorage.clear()
   sessionStorage.clear()
   ```

2. Check database file exists:
   ```bash
   ls -la .auth-dev.json
   ```

3. List created users:
   ```bash
   curl http://localhost:3001/users
   ```

### Auth server won't start

Check if Node.js is installed:
```bash
node --version  # Should be v14+
```

Check for errors:
```bash
node scripts/local-auth-server.js 2>&1 | tee auth-server.log
```

---

## Development Features

### Create Test User

```bash
curl -X POST "http://localhost:3001/api/auth/setup" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"testuser@example.com",
    "password":"Test123"
  }'
```

### Test Login

```bash
curl -X POST "http://localhost:3001/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"testuser@example.com",
    "password":"Test123"
  }' | jq '.token' # Extract token
```

### Check Database

```bash
cat .auth-dev.json | jq '.'  # Pretty print JSON
```

### Reset Everything

```bash
# Delete database
rm .auth-dev.json

# Server will recreate on next startup
npm run auth-server
```

---

## Common Workflows

### Workflow 1: Fresh Start

```bash
# 1. Reset database
rm .auth-dev.json

# 2. Start auth server
npm run auth-server

# 3. Start frontend (new terminal)
npm run dev:local

# 4. Initialize admin via web UI
# Navigate to /admin-init-external and click "Initialize Database & Create Admin User"

# 5. Login with admin@mail.com / Pass123
```

### Workflow 2: Test Multiple Users

```bash
# Create users
curl -X POST "http://localhost:3001/api/auth/setup" \
  -d '{"email":"user1@test.com","password":"pass1"}'

curl -X POST "http://localhost:3001/api/auth/setup" \
  -d '{"email":"user2@test.com","password":"pass2"}'

# List all users
curl http://localhost:3001/users

# Login as different users in frontend
```

### Workflow 3: Debug Authentication

```bash
# 1. Start auth server with verbose output
node scripts/local-auth-server.js

# 2. Open browser DevTools (F12)
# 3. Check Network tab when logging in
# 4. Look for /api/auth/login request
# 5. Check response for token and errors
```

---

## Switching to Remote API

When ready to use the remote API at `med.wayrus.co.ke`:

```bash
# Option 1: Stop using local auth
VITE_USE_LOCAL_AUTH=false npm run dev

# Option 2: Use remote API explicitly
VITE_EXTERNAL_API_URL=https://med.wayrus.co.ke/api.php npm run dev

# Option 3: Don't set the variable (uses remote by default)
npm run dev
```

Make sure the remote database is properly initialized before switching!

---

## Summary

✅ **Local Auth Server** = Perfect for dev & testing
✅ **Remote API** = For production & staging
✅ **Easy to switch** = Just change environment variable

Choose what works best for your workflow!
