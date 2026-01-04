# Enable Public Read Access to Companies Table

The login page needs to display your company name and logo, but the current RLS policies restrict access to the companies table to authenticated users only. 

## Quick Fix - Run SQL in Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query and paste this SQL:

```sql
-- Allow anonymous users to read company information (needed for login page)
CREATE POLICY "Public can read companies" ON companies
  FOR SELECT 
  USING (true);
```

4. Click **Run** to execute the query

This policy allows anyone (authenticated or not) to read company information, which is safe because company data is not sensitive and needs to be displayed on the public login page.

## Alternative - Using Migration Files

If you prefer to manage this through migrations, we've created a migration file at:
- `supabase/migrations/20250131_allow_public_read_companies.sql`

This file will be applied automatically when you push your code and the Supabase migrations run.

## What This Fixes

Once the policy is added:
- ✅ The login page will fetch and display your company name dynamically
- ✅ The company logo will be displayed correctly
- ✅ Both will automatically update when you change company settings
- ✅ No more hardcoded ">> Medical Supplies" text on the login page

## Verification

After applying the SQL:
1. Refresh the login page (Ctrl+R or Cmd+R)
2. You should see your company name displayed dynamically
3. Check the browser console for any errors

If you still see ">> Medical Supplies", it means:
- The company data hasn't been created yet in your database
- The policy hasn't been applied yet
- There might be a caching issue - try a hard refresh (Ctrl+Shift+R)
