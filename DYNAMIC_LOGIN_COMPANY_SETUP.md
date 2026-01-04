# Dynamic Company Logo and Name on Login Page - Setup Guide

## What's Changed

I've implemented a complete solution to display dynamic company information (logo and name) on the login page. Here's what was added:

### New Files Created:

1. **Edge Function** (`supabase/supabase/functions/get-public-company/index.ts`)
   - Allows fetching company data without authentication
   - Bypasses RLS restrictions using the service role
   - Used as a fallback if direct database access fails

2. **Service Layer** (`src/services/companyService.ts`)
   - Handles fetching company data with intelligent fallback
   - First tries direct Supabase query
   - Falls back to edge function if RLS blocks access

3. **Custom Hook** (`src/hooks/usePublicCompany.ts`)
   - React hook for the login page
   - Fetches company data without requiring authentication
   - Provides loading and error states

4. **Updated Components**:
   - `src/components/auth/EnhancedLogin.tsx` - Now uses the public hook
   - `src/components/ui/biolegend-logo.tsx` - Accepts company data as props

5. **Database Migration** (`supabase/migrations/20250131_allow_public_read_companies.sql`)
   - Creates a public read policy for the companies table
   - Allows unauthenticated users to read company info

## Setup Instructions

### Step 1: Ensure Company Data Exists

Make sure your `companies` table has at least one record with:
- `name` - Your company name (e.g., ">> Medical Supplies")
- `logo_url` - URL to your company logo image

### Step 2: Enable Public Access to Companies Table

You have **two options**:

#### Option A: Apply SQL Policy Directly (Immediate)
1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Create a new query and paste:

```sql
CREATE POLICY "Public can read companies" ON companies
  FOR SELECT USING (true);
```

4. Click **Run**

#### Option B: Deploy Edge Function (Recommended for Production)
1. Ensure the migration file exists: `supabase/migrations/20250131_allow_public_read_companies.sql`
2. The edge function at `supabase/supabase/functions/get-public-company/index.ts` will handle requests
3. Deploy/Push your code to trigger the migration

### Step 3: Test the Login Page

1. Clear your browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
2. Go to the login page
3. You should see:
   - ✅ Your company logo displayed
   - ✅ Your company name in the header
   - ✅ Your company name in the footer

## How It Works

```
Login Page Load
    ↓
usePublicCompany Hook Triggered
    ↓
fetchPublicCompanyData()
    ↓
    ├─→ Try Direct Query (if RLS allows)
    │   ├─→ SUCCESS → Return Data
    │   └─→ FAIL → Continue to next step
    │
    └─→ Try Edge Function Fallback
        ├─→ SUCCESS → Return Data
        └─→ FAIL → Use Default Values
```

## What Gets Displayed

The login page displays:

| Element | Source |
|---------|--------|
| Company Logo | `companies.logo_url` |
| Company Name (Header) | `companies.name` |
| Company Name (Footer) | `companies.name` |
| Fallback Name | `">> Medical Supplies"` (if no company found) |
| Fallback Logo | `/placeholder.svg` (if no logo_url found) |

## Troubleshooting

### Issue: Still showing ">> Medical Supplies"

**Possible causes:**
1. Company data doesn't exist in the database
2. RLS policy hasn't been applied yet
3. Browser cache contains old content

**Solutions:**
- Verify company record exists: Go to Supabase → Table Editor → companies
- Verify RLS policy was applied: Go to Supabase → SQL Editor → Look for "Public can read companies" policy
- Hard refresh browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Clear localStorage: Open DevTools → Storage → Clear All

### Issue: Logo not showing

**Possible causes:**
1. `logo_url` field is null or empty
2. Logo URL is invalid or inaccessible
3. Browser blocked the image load

**Solutions:**
- Update company record with valid logo_url
- Ensure logo URL is publicly accessible
- Check browser console for CORS or 404 errors

### Issue: See error in console

**Check the browser console (F12) for:**
- Network errors → Check your Supabase project is accessible
- Edge function errors → Ensure edge functions are deployed
- CORS errors → Check allow origins in Supabase

## Environment Variables

The edge function uses these Supabase environment variables (automatically set):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for bypassing RLS)

These are already configured in your Supabase project.

## Testing Locally

To test locally:

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Start Supabase local (if using local Supabase)
supabase start

# Terminal 3: Deploy edge functions locally
supabase functions deploy get-public-company --no-verify-jwt
```

## Next Steps

1. ✅ Apply the RLS policy using Option A (SQL) or Option B (migration)
2. ✅ Verify company data exists in your database
3. ✅ Test the login page
4. ✅ Update company information in settings if needed

## Support

If you encounter issues:
1. Check the browser console (F12) for error messages
2. Verify company data exists in Supabase
3. Verify RLS policy was created
4. Try a hard refresh (Ctrl+Shift+R)
5. Check the [Supabase documentation](https://supabase.com/docs)
