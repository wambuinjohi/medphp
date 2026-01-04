# 🎨 Dynamic Company Branding on Login Page - Complete Guide

## Overview

Your login page now displays your company's **logo** and **name** dynamically, without requiring user authentication. This is achieved using simple SQL and React hooks - no complex edge functions.

## What's Changed

### Architecture
```
Login Page (Public)
    ↓
usePublicCompany Hook
    ↓
Fetch company data from Supabase
    ↓
Display company logo & name
    ↓
Fallback to defaults if data unavailable
```

### What The Login Page Shows
- ✅ Company logo from `companies.logo_url`
- ✅ Company name from `companies.name`
- ✅ Fallback ">> Medical Supplies" if no company data
- ✅ Automatic updates when company info changes

## Files Involved

### Source Code
```
src/
├── services/
│   └── companyService.ts           # Fetches company data
├── hooks/
│   └── usePublicCompany.ts         # React hook for login page
└── components/auth/
    └── EnhancedLogin.tsx           # Updated to use public hook
```

### Setup Scripts
```
scripts/
├── README.md                        # Guide for scripts
├── setup-company-public-read.sql   # SQL policy setup
└── setup-company-public-read.sh    # Bash helper
```

### Database
```
supabase/
└── migrations/
    └── 20250131_allow_public_read_companies.sql  # Migration
```

## Setup Instructions

### Prerequisites
Ensure you have company data in Supabase:
1. Go to **Supabase Dashboard**
2. Click **Table Editor**
3. Select **companies** table
4. Verify you have at least one row with:
   - `name`: Your company name
   - `logo_url`: URL to your logo (optional)

If missing, click **Insert** and create a company record.

### Enable Public Access

Choose **ONE** option below:

#### ⚡ Option 1: SQL Dashboard (Recommended)
1. Go to **Supabase Dashboard**
2. Click **SQL Editor**
3. Click **New Query**
4. Open file: `scripts/setup-company-public-read.sql`
5. Copy entire content
6. Paste into query editor
7. Click **Run** (blue button)
8. Success message: "Policy created successfully"

#### 🔧 Option 2: Bash Script
```bash
# Requires Supabase CLI
npm install -g supabase

# Run the setup script
bash scripts/setup-company-public-read.sh
```

#### 📝 Option 3: Manual SQL Copy & Paste
Paste in SQL Editor:
```sql
DROP POLICY IF EXISTS "Public can read companies" ON companies;
CREATE POLICY "Public can read companies" ON companies
  FOR SELECT USING (true);
```

### Verify Setup

1. Refresh browser with hard refresh: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
2. Visit login page
3. Check:
   - ✅ Company logo displays
   - ✅ Company name in title
   - ✅ Company name in footer (not default text)
   - ✅ No console errors (F12)

## Using It

### View Your Company Branding
Simply visit the login page. Company logo and name will load automatically.

### Update Company Info
1. Go to **Supabase Dashboard** → **Table Editor** → **companies**
2. Click on your company row to edit
3. Update:
   - `name` - Company name
   - `logo_url` - Logo image URL
4. Click **Save**
5. Refresh login page in browser
6. Changes appear instantly!

### Check the RLS Policy
To verify the policy was created:
1. Go to **SQL Editor**
2. Run this query:
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'companies';
```
You should see `"Public can read companies"` in the results.

## How It Works

### Query Flow
```
usePublicCompany Hook
    ↓
fetchPublicCompanyData()
    ↓
Supabase Query:
  SELECT id, name, logo_url, primary_color
  FROM companies
  LIMIT 1
    ↓
Return data to component
    ↓
Display in login page
    ↓
If fails → Use fallback values
```

### Error Handling
- If company data can't be fetched → Shows default ">> Medical Supplies"
- If logo_url is missing → Shows placeholder image
- If logo image broken → Falls back to placeholder

## Database Schema

Your `companies` table should have:

| Column | Type | Required | Example |
|--------|------|----------|---------|
| id | UUID | Yes | (auto) |
| name | Text | Yes | "Acme Corp" |
| logo_url | Text | No | "https://..." |
| primary_color | Text | No | "#FF5733" |
| created_at | Timestamp | Yes | (auto) |
| updated_at | Timestamp | Yes | (auto) |

## Troubleshooting

### Problem: Still showing ">> Medical Supplies"

**Cause**: RLS policy not created or company data missing

**Solution**:
1. Check company data exists:
   - Supabase → Table Editor → companies
   - Should have at least 1 row
2. Check RLS policy:
   - SQL Editor → Run: `SELECT policyname FROM pg_policies WHERE tablename = 'companies';`
   - Should include `"Public can read companies"`
3. If policy missing, run the setup SQL (see Setup Instructions above)
4. Hard refresh: **Ctrl+Shift+R**

### Problem: Logo not displaying

**Cause**: Invalid `logo_url` or broken image

**Solution**:
1. Check `logo_url` in Supabase (Table Editor → companies)
2. Verify URL is:
   - Valid and complete (e.g., "https://example.com/logo.png")
   - Publicly accessible
   - Supported image format (PNG, JPG, etc.)
3. Test URL in browser address bar
4. Clear browser cache if needed

### Problem: Console shows errors

**Check**:
1. Open DevTools: **F12**
2. Go to **Console** tab
3. Look for error messages
4. Common errors:
   - `CORS error` - Image URL not accessible
   - `404 error` - Image not found
   - `RLS policy error` - Policy not created

**Fix**:
- Ensure RLS policy exists
- Ensure company data exists
- Ensure logo_url is valid
- Hard refresh browser

### Problem: Changes aren't showing

**Solution**:
- Hard refresh: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
- Clear localStorage: DevTools (F12) → Storage → Clear All
- Wait a moment (might be caching)

## Security Considerations

✅ **This is safe because:**
- Only `SELECT` (read) operations allowed
- Company info is non-sensitive (displayed publicly on login page anyway)
- No authentication required (intentional for login page)
- RLS policy prevents any write/delete operations

✅ **What's protected:**
- Only the public companies table has this policy
- Other tables remain restricted to authenticated users
- Admin operations still require full authentication

## Performance

- ✅ Single database query
- ✅ Minimal overhead
- ✅ Cached in browser memory
- ✅ Graceful degradation if unavailable

## Production Deployment

When deploying to production:

1. **Ensure migration is included**: `supabase/migrations/20250131_allow_public_read_companies.sql`
2. **Run migrations**: Supabase runs them automatically
3. **Verify RLS policy**: Check it was created in your production database
4. **Test on staging first**: Before deploying to production

## Next Steps

1. ✅ Run setup SQL (choose one option above)
2. ✅ Verify policy was created
3. ✅ Update company info if needed (name, logo URL)
4. ✅ Test login page
5. ✅ Deploy to production

## Support & References

- **Setup Guide**: `SETUP_COMPANY_BRANDING.md`
- **Quick Checklist**: `ACTION_CHECKLIST.md`
- **Setup Scripts**: `scripts/README.md`
- **Supabase RLS**: https://supabase.com/docs/guides/auth/row-level-security
- **Supabase Policies**: https://supabase.com/docs/guides/auth/row-level-security-policies

---

**You're all set!** Run the setup SQL and your login page will display dynamic company branding. 🚀
