# External API - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Check Configuration ✓ (Already Done)

The following files have been created/updated:

```
✅ .env.local                    - Environment configuration
✅ public/api.php                - Reference API server
✅ src/main.tsx                  - Database initialization
✅ EXTERNAL_API_SETUP.md         - Full documentation
✅ MIGRATION_TO_EXTERNAL_API.md  - Migration summary
```

### Step 2: Deploy API Server (You Need To Do)

**Option A: Deploy to Your Server**

1. Upload `public/api.php` to your web server
2. Set environment variables:
   ```bash
   DB_HOST=your-mysql-host
   DB_USER=your-mysql-user
   DB_PASS=your-mysql-password
   DB_NAME=your-database-name
   JWT_SECRET=your-secret-key
   ```
3. Test the API:
   ```bash
   curl https://your-domain.com/api.php?action=health
   ```

**Option B: Use Existing API**

If you already have `med.wayrus.co.ke/api.php`, the app is already configured to use it.

### Step 3: Update Configuration (If Needed)

Edit `.env.local`:

```env
VITE_DATABASE_PROVIDER=external-api
VITE_EXTERNAL_API_URL=https://med.wayrus.co.ke/api.php
```

Change the URL to your API server if needed.

### Step 4: Run the App

```bash
npm install
npm run dev
```

The app will:
1. Initialize database with external-api provider
2. Connect to your API server
3. Handle all operations via REST API

### Step 5: Verify It Works

1. Open browser console
2. Look for: `✅ External API adapter initialized`
3. Try logging in
4. Check Network tab for API calls to your server

## 🔑 Quick API Reference

### Login
```bash
POST /api.php?action=login
{
  "email": "user@example.com",
  "password": "password123"
}
→ { token, user: { id, email, role } }
```

### Check Auth
```bash
POST /api.php?action=check_auth
{
  "token": "jwt_token_here"
}
→ { id, email, role }
```

### Create Record
```bash
POST /api.php?action=create&table=contacts
{
  "name": "John Doe",
  "email": "john@example.com"
}
→ { id, data: { ...record } }
```

### Read Records
```bash
POST /api.php?action=read&table=contacts
{
  "where": { "id": "123" }
}
→ { data: [ {...} ], count: 1 }
```

### Update Record
```bash
PUT /api.php?action=update&table=contacts
{
  "id": "123",
  "name": "Jane Doe"
}
→ { affected_rows: 1 }
```

### Delete Record
```bash
DELETE /api.php?action=delete&table=contacts
{
  "id": "123"
}
→ { affected_rows: 1 }
```

## 📦 Database Tables

The MySQL database should include:

```sql
-- Users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password TEXT,
  role VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contacts
CREATE TABLE contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  subject VARCHAR(255),
  message TEXT,
  status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Newsletter
CREATE TABLE newsletter (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- And others as needed...
```

See `public/api.php` for complete schema.

## 🔐 Authentication Flow

1. **Login**
   ```
   User → POST /api.php?action=login
   API → Verify password, create JWT
   API → Return token (24-hour expiry)
   ```

2. **Store Token**
   ```
   App → Save to localStorage['med_api_token']
   ```

3. **Authenticated Requests**
   ```
   App → POST /api.php?action=read&table=users
   App → Header: Authorization: Bearer <token>
   API → Verify JWT, return data
   ```

4. **Logout**
   ```
   App → DELETE token from localStorage
   ```

## 🛠️ Troubleshooting

### Issue: "API initialization failed"

**Solution:**
- Check console for error details
- Verify `VITE_EXTERNAL_API_URL` is correct
- Test API with curl: `curl https://med.wayrus.co.ke/api.php?action=health`

### Issue: "Database connection failed"

**Solution (On Server):**
- Check environment variables are set
- Verify MySQL is running
- Test connection: `mysql -h $DB_HOST -u $DB_USER -p $DB_PASS`

### Issue: "Not authenticated"

**Solution:**
- Verify token is in localStorage
- Check token hasn't expired (24 hours)
- Verify Authorization header is being sent

### Issue: "CORS error in browser"

**Solution:**
- Verify API has CORS headers enabled
- Check if using correct domain
- Test with curl first to isolate issue

## 📊 Network Architecture

```
┌─────────────┐
│  Browser    │
│  (React)    │────┐
└─────────────┘    │
                   │ HTTP/HTTPS
                   │
          ┌────────▼────────┐
          │  med.wayrus.co.ke/api.php
          │  (PHP REST API)
          └────────┬────────┘
                   │
                   │ MYSQLI
                   │
          ┌────────▼────────┐
          │  MySQL Database
          │  (med.wayrus.co.ke)
          └─────────────────┘
```

## 📝 Files Reference

| File | Purpose |
|------|---------|
| `.env.local` | Configuration (provider, API URL) |
| `public/api.php` | Reference API server |
| `src/main.tsx` | Database initialization |
| `src/integrations/database/external-api-adapter.ts` | API adapter |
| `src/integrations/database/manager.ts` | Database manager |
| `EXTERNAL_API_SETUP.md` | Full documentation |
| `MIGRATION_TO_EXTERNAL_API.md` | Migration details |

## ✅ Checklist

- [ ] Environment variables set correctly
- [ ] API server deployed and running
- [ ] Database created with required tables
- [ ] MySQL credentials configured
- [ ] JWT_SECRET set to a strong value
- [ ] CORS enabled on API server
- [ ] App starts without errors
- [ ] Can login successfully
- [ ] CRUD operations work
- [ ] Production deployment ready

## 🚢 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Hosting
```bash
# Upload dist/ folder to hosting service
# (Netlify, Vercel, AWS S3, etc.)
```

### Verify Deployment
1. Open app in browser
2. Login with test account
3. Verify API calls in Network tab
4. Test CRUD operations

## 📚 More Information

- **Full Setup Guide**: See `EXTERNAL_API_SETUP.md`
- **Migration Details**: See `MIGRATION_TO_EXTERNAL_API.md`
- **API Reference**: See inline comments in `public/api.php`

## 🆘 Need Help?

1. Check browser console for error messages
2. Check server logs for API errors
3. Test API directly with curl
4. Review `EXTERNAL_API_SETUP.md` for detailed troubleshooting
5. Check network connectivity between app and API

---

**Ready to go!** Your app is now configured to use an external MySQL API instead of Supabase. Deploy the API server and start using it! 🎉

