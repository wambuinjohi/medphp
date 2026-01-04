# Setup Scripts for Company Branding

This folder contains helper scripts to enable dynamic company branding on the login page.

## What They Do

These scripts enable **public read access** to your `companies` table, allowing the login page to display your company logo and name without requiring user authentication.

## Files

### 1. `setup-company-public-read.sql`
**SQL script that creates the RLS policy**

- **When to use**: When you want to manually set up the policy
- **How to use**:
  1. Go to Supabase Dashboard → SQL Editor
  2. Create a new query
  3. Copy and paste the entire file content
  4. Click "Run"
  5. You should see: "Policy created successfully"

### 2. `setup-company-public-read.sh`
**Bash helper script**

- **When to use**: When you have Supabase CLI installed
- **Prerequisites**: 
  ```bash
  npm install -g supabase
  ```
- **How to use**:
  ```bash
  bash scripts/setup-company-public-read.sh
  ```

## Quick Start

Choose one option:

### Option A: Dashboard (Easiest)
1. Copy content of `setup-company-public-read.sql`
2. Paste in Supabase SQL Editor
3. Click Run

### Option B: Command Line
```bash
bash scripts/setup-company-public-read.sh
```

## Verification

After running the script:

1. Go to Supabase Dashboard → SQL Editor
2. Run this query:
   ```sql
   SELECT policyname FROM pg_policies WHERE tablename = 'companies';
   ```
3. You should see `"Public can read companies"` in the results

## Testing

1. Hard refresh the login page: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
2. You should see your company logo and name displayed
3. If you see the default ">> Medical Supplies", the policy might not be created yet

## What Gets Enabled

The script creates this RLS policy:

```sql
CREATE POLICY "Public can read companies" ON companies
  FOR SELECT 
  USING (true);
```

This allows:
- ✅ Anyone to READ company data
- ❌ No one to UPDATE company data via this policy
- ❌ No one to DELETE company data via this policy

Only authenticated admins can modify company settings through the admin interface.

## Next Steps

1. ✅ Run one of the scripts above
2. ✅ Verify the policy was created
3. ✅ Update your company info in Supabase if needed
4. ✅ Deploy to production

That's it! Your login page now displays dynamic company branding.
