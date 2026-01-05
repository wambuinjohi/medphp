# 🎯 Getting Started - Medical Supplies Management System

Welcome! This guide will help you get the authentication system working and start using the application.

---

## 📋 Overview

Your application has been fixed and now supports **TWO authentication methods**:

1. **Local Development Server** ← Recommended for development
2. **Remote API** ← For production

Each method is documented below.

---

## 🚀 Start Here: Choose Your Path

### Path A: Local Development (Fastest - 2 Minutes)
**Best for:** Development, testing, offline work
**Setup time:** ~2 minutes
**Complexity:** Low

[👉 Go to Local Development Setup](#path-a-local-development)

### Path B: Remote API (Production - 5 Minutes)
**Best for:** Production, staging, team deployment
**Setup time:** ~5 minutes
**Complexity:** Medium

[👉 Go to Remote API Setup](#path-b-remote-api)

---

## Path A: Local Development

### Prerequisites
- Node.js v14+ installed
- npm or yarn available
- Terminal/Command prompt access

### Step-by-Step

#### 1️⃣ Clone/Pull Latest Code
```bash
git clone <your-repo-url>
# OR if already cloned:
git pull origin main
```

#### 2️⃣ Install Dependencies
```bash
npm install
```

#### 3️⃣ Start Auth Server (Terminal 1)
```bash
npm run auth-server
```

You should see:
```
╔════════════════════════════════════════════════════════════════╗
║        🔐 LOCAL AUTHENTICATION SERVER                          ║
╠════════════════════════════════════════════════════════════════╣
║ Server:  http://localhost:3001                                ║
║ Database: .auth-dev.json                                       ║
╚════════════════════════════════════════════════════════════════╝
```

#### 4️⃣ Start Frontend (Terminal 2)
```bash
npm run dev:local
```

You should see:
```
✅ Using LOCAL authentication server at http://localhost:3001
  VITE v5.x.x  ready in xxx ms
  
  ➜  Local:   http://localhost:8080/
```

#### 5️⃣ Open Browser
Navigate to: **http://localhost:8080**

You should see the login page with setup options.

#### 6️⃣ Initialize Admin
1. Click **"Use Local Dev Server"** button (the purple outlined button)
2. You'll see a setup page
3. Click **"Initialize Database & Create Admin User"**
4. Wait for success message

#### 7️⃣ Login
Use these credentials:
- **Email:** `admin@mail.com`
- **Password:** `Pass123`

✅ **You're logged in!** Start using the application.

#### 8️⃣ Create More Users (Optional)
```bash
# In a new terminal, test creating more users:
curl -X POST "http://localhost:3001/api/auth/setup" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"TestPass123"}'
```

### Stopping the Servers
```bash
# In Terminal 1: Press Ctrl+C
# In Terminal 2: Press Ctrl+C
```

### Resetting Everything
```bash
# Delete the dev database:
rm .auth-dev.json

# Restart auth server - it will create a fresh database
npm run auth-server

# Next time you login, it will be empty and you'll need to reinitialize
```

---

## Path B: Remote API

### Prerequisites
- Node.js v14+ installed
- SSH access to `med.wayrus.co.ke` server
- MySQL database credentials
- Server admin access

### Step-by-Step

#### 1️⃣ Prepare Server

SSH into your server:
```bash
ssh user@med.wayrus.co.ke
```

Verify MySQL is running:
```bash
mysql -u wayrusc1_med -p
```

#### 2️⃣ Initialize Database

Make sure the `users` table exists:
```bash
# Login to MySQL
mysql -u wayrusc1_med -pYourPassword

# Use the database
USE wayrusc1_med;

# Check if users table exists
SHOW TABLES;
```

If the `users` table is missing, create it:
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3️⃣ Test API Connectivity

From your local machine:
```bash
# Test if API is accessible
curl https://med.wayrus.co.ke/api.php?action=health

# Expected response: Should not give connection error
```

If you get connection errors, check:
- [ ] Firewall allows HTTPS (port 443)
- [ ] PHP is running on the server
- [ ] API file path is correct

#### 4️⃣ Clone/Pull Latest Code
```bash
git clone <your-repo-url>
# OR if already cloned:
git pull origin main
```

#### 5️⃣ Install Dependencies
```bash
npm install
```

#### 6️⃣ Start Frontend
```bash
npm run dev
```

Expected output:
```
🌐 Using REMOTE API at https://med.wayrus.co.ke/api.php
  VITE v5.x.x  ready in xxx ms
  
  ➜  Local:   http://localhost:8080/
```

#### 7️⃣ Open Browser
Navigate to: **http://localhost:8080**

#### 8️⃣ Initialize Admin
1. Click **"Use Remote API"** button (the purple filled button)
2. You'll see a setup page showing your API URL
3. Click **"Initialize Database & Create Admin User"**
4. Wait for success message

#### 9️⃣ Login
Use these credentials:
- **Email:** `admin@mail.com`
- **Password:** `Pass123`

✅ **You're logged in!** Start using the application.

### Verifying Setup
```bash
# Test the API directly:
curl -X POST "https://med.wayrus.co.ke/api.php?action=login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mail.com","password":"Pass123"}'

# Should return a token if successful
```

---

## 🔄 Switching Between Methods

### Use Local Auth:
```bash
npm run dev:local
```

### Use Remote Auth:
```bash
npm run dev
```

Or with explicit URL:
```bash
VITE_EXTERNAL_API_URL=https://med.wayrus.co.ke/api.php npm run dev
```

---

## 🎯 Common Tasks

### Reset Database (Local)
```bash
# Delete dev database
rm .auth-dev.json

# Restart auth server
npm run auth-server
```

### List All Users (Local)
```bash
# In local auth server, visit:
curl http://localhost:3001/users
```

### Change Admin Password
```bash
# Local - create new admin (replaces old):
curl -X POST "http://localhost:3001/api/auth/setup" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mail.com","password":"NewPassword123"}'

# Remote - same command:
curl -X POST "https://med.wayrus.co.ke/api.php?action=setup" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mail.com","password":"NewPassword123"}'
```

### Clear Browser Session
```javascript
// Press F12 to open DevTools, then in Console:
localStorage.clear()
sessionStorage.clear()
// Then refresh the page
```

---

## ⚠️ Troubleshooting

### "Cannot connect to auth server"
**For Local Dev:**
- Make sure `npm run auth-server` is running in another terminal
- Check if port 3001 is available: `lsof -i :3001`

**For Remote API:**
- Verify API URL is correct
- Check internet connection
- Try curl test: `curl https://med.wayrus.co.ke/api.php?action=health`

### "Invalid email or password"
- Make sure you initialized admin (see step 6/8 above)
- Check you're using correct email/password
- Try clearing browser cache: `localStorage.clear()`

### Port Already in Use
```bash
# Find and kill process on port 3001 (macOS/Linux):
lsof -i :3001 | grep LISTEN | awk '{print $2}' | xargs kill -9

# For port 8080:
lsof -i :8080 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Database Table Missing
```bash
# Create it manually:
mysql -u wayrusc1_med -p
USE wayrusc1_med;
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📚 Full Documentation

For more detailed information, see:

1. **QUICK_FIX_GUIDE.md** - 5-minute quick start
2. **LOCAL_AUTH_SERVER_SETUP.md** - Complete local server guide
3. **AUTHENTICATION_TROUBLESHOOTING.md** - Detailed debugging
4. **GETTING_STARTED.md** - This file

---

## ✅ Success Checklist

After completing your chosen path, verify:

- [ ] Auth server is running (if using local)
- [ ] Frontend is running
- [ ] App opens at `http://localhost:8080`
- [ ] You can see the login page
- [ ] Setup buttons are visible
- [ ] You completed initialization
- [ ] You can login with admin credentials
- [ ] Dashboard loads after login

If all are checked ✅, you're ready to go!

---

## 🚀 Next Steps

1. **Explore the application** - Check out all the features
2. **Create more users** - Add team members
3. **Configure settings** - Customize for your business
4. **Deploy to production** - When ready

---

## 💬 Need Help?

1. Check **AUTHENTICATION_TROUBLESHOOTING.md** for your error
2. Review the relevant setup guide
3. Check browser console (F12) for error messages
4. Review application logs

---

## 🎉 Welcome to Medical Supplies Management System!

You're now set up and ready to use the application. Happy managing! 📊
