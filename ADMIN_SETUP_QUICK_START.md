# Admin Setup - Quick Start Reference

## ⚡ 30-Second Quick Start

```bash
# 1. Get your service role key from Supabase (Settings → API)
export SUPABASE_SERVICE_ROLE_KEY="your-key-here"

# 2. Run the setup script
node scripts/create-first-admin.js

# 3. Follow the prompts - that's it! 🎉
```

## 📋 What You'll Need

- ✅ Supabase Service Role Key (from Settings → API)
- ✅ Node.js installed
- ✅ Email for admin account
- ✅ Secure password (8+ characters)

## 🚀 Three Ways to Set Up

### Method 1: Interactive (Easiest) ⭐
```bash
export SUPABASE_SERVICE_ROLE_KEY="your-key"
node scripts/create-first-admin.js
# ← Follow the prompts
```

### Method 2: Command Line Arguments
```bash
export SUPABASE_SERVICE_ROLE_KEY="your-key"
node scripts/create-first-admin.js admin@company.com "PassWord123!" "Your Name"
```

### Method 3: Environment Variables
```bash
export SUPABASE_SERVICE_ROLE_KEY="your-key"
export ADMIN_EMAIL="admin@company.com"
export ADMIN_PASSWORD="PassWord123!"
export ADMIN_FULL_NAME="Your Name"
node scripts/create-first-admin.js
```

## 🔑 Where to Find Your Service Role Key

1. Go to: https://app.supabase.com/
2. Select your project
3. Click: Settings → API (left sidebar)
4. Copy: **Service Role Key** (⚠️ Keep this secret!)

## ✅ After Setup

```
✅ Admin user created
✅ Profile configured with admin role
✅ Permissions granted
✅ Ready to sign in!
```

**Next: Sign in with your email and password**

## 🔧 Troubleshooting

| Error | Solution |
|-------|----------|
| `SUPABASE_SERVICE_ROLE_KEY not found` | Run: `export SUPABASE_SERVICE_ROLE_KEY="your-key"` |
| `User already exists` | Choose "yes" to update to admin status |
| `Invalid email format` | Check email spelling |
| `Password too short` | Use at least 8 characters |

## 📚 Full Documentation

For detailed info, see: [FIRST_ADMIN_SETUP.md](./FIRST_ADMIN_SETUP.md)

## 🚨 Security Tips

- 🔐 Use a **strong password** (mix upper, lower, numbers, symbols)
- 🔑 Never share your **Service Role Key** 
- 💾 Store credentials in a **password manager**
- 🚫 Don't commit keys to **version control**

---

**Ready?** Start with Method 1 above! 🚀
