# ⚡ Quick Start: Dynamic Login Branding (5 Minutes)

## TL;DR - Just Do This

### Step 1: Add Company Data (if you haven't)
Go to your Supabase Dashboard → Table Editor → Click "companies" table

Make sure you have one row with:
- **name**: Your company name (e.g., "Acme Corp")
- **logo_url**: URL to your logo (e.g., "https://example.com/logo.png")

### Step 2: Enable Public Access (Copy & Paste)

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. **Paste this exactly:**

```sql
CREATE POLICY "Public can read companies" ON companies
  FOR SELECT USING (true);
```

5. Click **RUN** (blue button on the right)
6. You should see: `Policy created successfully`

### Step 3: Refresh & Test

1. Refresh your browser (Ctrl+R or Cmd+R)
2. Go to the login page
3. ✅ You should see your company logo and name!

---

## If It Doesn't Work

### Check 1: Does company data exist?
```sql
SELECT name, logo_url FROM companies LIMIT 1;
```
Should show your company. If empty, add a row first!

### Check 2: Is the policy created?
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'companies';
```
Look for `"Public can read companies"`

### Check 3: Browser issues?
- Hard refresh: **Ctrl+Shift+R** (Win) or **Cmd+Shift+R** (Mac)
- Or clear cache: DevTools (F12) → Storage → Clear All

---

## What Changed

I've updated these files to support dynamic company branding:

- `src/components/auth/EnhancedLogin.tsx` - Uses new public company hook
- `src/services/companyService.ts` - Fetches company data
- `src/hooks/usePublicCompany.ts` - Login page hook
- `src/components/ui/biolegend-logo.tsx` - Accepts company data as props
- `supabase/migrations/20250131_allow_public_read_companies.sql` - RLS policy
- `supabase/supabase/functions/get-public-company/index.ts` - Edge function fallback

**That's it!** Your login page now displays your company branding dynamically.

---

## Update Company Info Anytime

To change your company logo or name:

1. Go to Supabase Dashboard → Table Editor → companies
2. Edit the row:
   - Change `name` field
   - Update `logo_url` field
3. Refresh the login page in your browser
4. Changes appear instantly! ✨

---

## Questions?

- **Logo not showing?** Make sure logo_url is a valid, publicly accessible image URL
- **Still see default name?** Check Step 2 - the RLS policy must be created
- **Need more help?** Read the full guide: `DYNAMIC_LOGIN_COMPANY_SETUP.md`
