# 🎨 Setup Company Branding on Login Page

This guide will help you set up dynamic company logo and name display on the login page.

## What You Need

1. A company record in the database with:
   - `name`: Your company name
   - `logo_url`: URL to your company logo (optional)

2. Public read access to the companies table via RLS policy

## Setup Steps

### Step 1: Ensure Company Data Exists

1. Go to **Supabase Dashboard**
2. Click **Table Editor** (left sidebar)
3. Select the **companies** table
4. You should see at least one row with:
   - **id**: (auto-generated)
   - **name**: Your company name (e.g., "Acme Corp")
   - **logo_url**: URL to your logo (optional, e.g., "https://example.com/logo.png")

If no rows exist, click **Insert** and create one.

### Step 2: Enable Public Read Access

Choose one option below:

#### Option A: Use SQL (Dashboard) - **Recommended** ⚡

1. Go to **Supabase Dashboard**
2. Click **SQL Editor** (left sidebar)
3. Click **New Query** button
4. Copy and paste the entire content of `scripts/setup-company-public-read.sql`
5. Click **Run** (blue button on the right)
6. You should see: `Policy created successfully`

#### Option B: Use CLI Script

```bash
# Make sure Supabase CLI is installed
npm install -g supabase

# Run the setup script
bash scripts/setup-company-public-read.sh
```

#### Option C: Manual SQL (Copy & Paste)

Go to **SQL Editor** and run:

```sql
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Public can read companies" ON companies;

-- Create the public read policy
CREATE POLICY "Public can read companies" ON companies
  FOR SELECT 
  USING (true);
```

### Step 3: Verify It Works

1. **Clear browser cache** (or hard refresh: Ctrl+Shift+R)
2. **Visit the login page**
3. You should see:
   - ✅ Your company logo (in the colored box)
   - ✅ Your company name (as the main title)
   - ✅ Company name in the footer

## Updating Company Info

To change your company logo or name:

1. Go to **Supabase Dashboard** → **Table Editor** → **companies**
2. Click on your company row
3. Edit:
   - `name` field for the company name
   - `logo_url` field for the logo URL
4. Click **Save**
5. Refresh the login page in your browser
6. Changes appear instantly! ✨

## Troubleshooting

### Issue: Still showing ">> Medical Supplies"

**Possible causes:**
1. Company data doesn't exist in the database
2. RLS policy wasn't created
3. Browser cache has old data

**Solutions:**
- Verify company exists: Supabase → Table Editor → companies
- Verify policy exists: Supabase → SQL Editor → run this query:
  ```sql
  SELECT policyname FROM pg_policies WHERE tablename = 'companies';
  ```
  Should include `"Public can read companies"`
- Hard refresh: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
- Clear localStorage: DevTools (F12) → Storage → Clear All

### Issue: Logo not showing

**Check:**
1. `logo_url` field is not empty
2. URL is valid and publicly accessible
3. Check browser console (F12) for error messages

### Issue: See errors in console

**Check:**
1. Open DevTools (F12)
2. Go to Console tab
3. Look for error messages
4. Verify Supabase project is accessible
5. Verify company data exists in the database

## File Structure

```
scripts/
├── setup-company-public-read.sql     # SQL policy setup
└── setup-company-public-read.sh      # Bash helper script

src/
├── services/
│   └── companyService.ts             # Fetches company data
├── hooks/
│   └── usePublicCompany.ts           # React hook for login page
└── components/auth/
    └── EnhancedLogin.tsx             # Login page component

supabase/
└── migrations/
    └── 20250131_allow_public_read_companies.sql  # Migration
```

## How It Works

```
Login Page Loads
    ↓
usePublicCompany() Hook
    ↓
fetchPublicCompanyData()
    ↓
Supabase Query (companies table)
    ↓
    ├─ SUCCESS → Display company logo & name
    └─ FAIL → Show defaults (">> Medical Supplies")
```

## Security

✅ **Safe to enable public read access because:**
- Only SELECT operations are allowed (no UPDATE/DELETE)
- Company info is non-sensitive (shown on public login page anyway)
- No user data or credentials are exposed

## Next Steps

1. ✅ Choose one setup option above
2. ✅ Verify it works
3. ✅ Update company info as needed
4. ✅ Deploy to production

That's it! Your login page now displays dynamic company branding.
