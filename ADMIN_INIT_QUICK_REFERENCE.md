# Admin Init Route - Quick Reference

## 🚀 30-Second Setup

```
1. Start app: npm run dev
2. Go to: http://localhost:5173/admin-init
3. Click: "Initialize Admin User"
4. Sign in with:
   • Email: admin@mail.com
   • Password: Admin.12
   
DONE! ✅
```

## 📝 Default Credentials

```
Email:    admin@mail.com
Password: Admin.12
Role:     admin
Status:   active
```

## 🔗 Access Point

**URL:** `http://localhost:5173/admin-init`

**Production:** `https://your-domain.com/admin-init`

## ✨ What It Does

```
✓ Checks if admin exists
✓ Creates auth user
✓ Creates profile with admin role
✓ Sets status to active
✓ Assigns permissions
✓ Shows success message
```

## ⚠️ Important

- **One-time only** - Can only initialize once
- **No auth required** - Anyone can access (by design)
- **Change password** - After first sign-in
- **Hardcoded** - Credentials are in the code

## 🔧 Customize Credentials

Edit `src/pages/AdminInit.tsx` (lines 13-15):

```typescript
const ADMIN_EMAIL = 'your-email@example.com';  // ← Change
const ADMIN_PASSWORD = 'YourPassword123!';     // ← Change
const ADMIN_NAME = 'Your Name';                 // ← Change
```

Then rebuild: `npm run build`

## 📱 UI Flow

```
Visit /admin-init
    ↓
Already initialized?
    ├─ YES → Show "Already Initialized"
    └─ NO  → Show Initialize Button
            ↓
         Click Button
            ↓
         Creating... (loading)
            ↓
         Success!
            ↓
         Ready to Sign In
```

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Page won't load | Check console, verify VITE_SUPABASE_URL |
| Initialization fails | Check Supabase logs, try again |
| Can't sign in | Verify profile exists in database |
| Already initialized | Visit route again, use admin panel to create users |

## 🔗 Related Docs

- **[ADMIN_INIT_ROUTE.md](./ADMIN_INIT_ROUTE.md)** - Full documentation
- **[ADMIN_INIT_IMPLEMENTATION.md](./ADMIN_INIT_IMPLEMENTATION.md)** - Technical details
- **[FIRST_ADMIN_SETUP.md](./FIRST_ADMIN_SETUP.md)** - Setup guide (Node.js script method)
- **[ADMIN_SETUP_QUICK_START.md](./ADMIN_SETUP_QUICK_START.md)** - Script quick start

## 📂 Files Changed

```
✅ NEW: src/pages/AdminInit.tsx
✏️ MODIFIED: src/App.tsx (added route)
📄 NEW: ADMIN_INIT_ROUTE.md
📄 NEW: ADMIN_INIT_IMPLEMENTATION.md
📄 NEW: ADMIN_INIT_QUICK_REFERENCE.md (this file)
```

## 🎯 Success Indicators

✅ Page loads at `/admin-init`
✅ "Initialize Admin User" button visible
✅ Button is clickable
✅ Success message appears after clicking
✅ Can sign in with credentials provided

## ⏱️ Time to Complete Setup

- **Visit route:** 1 second
- **Click button:** 2 seconds
- **Initialization:** 2-5 seconds
- **See success:** Instant
- **Total:** ~10 seconds ⚡

## 🔐 Security Notes

- ✅ Server-side authentication via edge function
- ✅ Service role key never exposed
- ✅ RLS policies enforced
- ✅ One-time setup only
- ⚠️ **Change password after setup!**

## 🚫 Known Limitations

- Cannot create multiple admins with this route
- Cannot customize role during initialization
- Cannot customize company during initialization
- Must change password manually after setup

## ✅ Production Checklist

- [ ] Route tested in development
- [ ] Initialization successful
- [ ] Admin can sign in
- [ ] Admin can access dashboard
- [ ] Password changed from default
- [ ] Consider disabling route after setup (optional)
- [ ] Users created for team members

## 📞 Support

If issues occur:

1. Check the full documentation: [ADMIN_INIT_ROUTE.md](./ADMIN_INIT_ROUTE.md)
2. Try the Node.js script method: [FIRST_ADMIN_SETUP.md](./FIRST_ADMIN_SETUP.md)
3. Check Supabase logs for errors
4. Verify database and edge functions are deployed

---

**Status:** ✅ Ready to use
**Created:** January 2025
**Last Updated:** January 2025
