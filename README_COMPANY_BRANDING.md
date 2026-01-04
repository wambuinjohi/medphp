# 🎨 Dynamic Company Branding - Quick Start

Your login page now displays your company's **logo and name dynamically** without needing edge functions. Here's what you need to do:

## ⚡ 30-Second Setup

### Step 1: Open Supabase Dashboard
Go to your Supabase project dashboard

### Step 2: Create SQL Query
1. Click **SQL Editor** (left sidebar)
2. Click **New Query** button
3. **Paste this SQL**:

```sql
DROP POLICY IF EXISTS "Public can read companies" ON companies;
CREATE POLICY "Public can read companies" ON companies
  FOR SELECT USING (true);
```

### Step 3: Run It
Click the **Run** button (blue, on the right)

You should see: ✅ `Policy created successfully`

### Step 4: Test It
1. Refresh your browser: **Ctrl+R** (or **Cmd+R**)
2. Go to login page
3. You should see your **company logo and name**!

**Done!** 🎉

---

## 📋 Longer Version

If the above didn't work or you want more details:

👉 **Read**: [`DYNAMIC_COMPANY_BRANDING_GUIDE.md`](./DYNAMIC_COMPANY_BRANDING_GUIDE.md)

Or choose your setup method:
- **SQL Dashboard**: [`SETUP_COMPANY_BRANDING.md`](./SETUP_COMPANY_BRANDING.md)
- **Bash Script**: [`scripts/README.md`](./scripts/README.md)
- **Checklist**: [`ACTION_CHECKLIST.md`](./ACTION_CHECKLIST.md)

---

## 🔍 Prerequisites

Before setting up, make sure:
1. You have company data in Supabase (`companies` table)
   - `name` field filled (e.g., "Acme Corp")
   - `logo_url` optional (URL to your logo)

If missing:
1. Go to Supabase → Table Editor → companies
2. Click Insert and create a company record

---

## 🚀 What Was Built

### No Edge Functions
✅ Pure SQL + React
✅ Simple and maintainable
✅ Direct Supabase queries

### New Files:
- `src/services/companyService.ts` - Fetches company data
- `src/hooks/usePublicCompany.ts` - React hook
- `scripts/setup-company-public-read.sql` - Setup script
- `supabase/migrations/20250131_allow_public_read_companies.sql` - Migration

### Updated Files:
- `src/components/auth/EnhancedLogin.tsx` - Uses public hook
- `src/components/ui/biolegend-logo.tsx` - Accepts company data

---

## ❓ Troubleshooting

### Still see ">> Medical Supplies"?
→ Did you run the SQL? Check [DYNAMIC_COMPANY_BRANDING_GUIDE.md - Troubleshooting](./DYNAMIC_COMPANY_BRANDING_GUIDE.md#troubleshooting)

### Logo not showing?
→ Check `logo_url` is valid in your companies table

### Need help?
→ Read the full guide: [`DYNAMIC_COMPANY_BRANDING_GUIDE.md`](./DYNAMIC_COMPANY_BRANDING_GUIDE.md)

---

**That's it! Your login page now has dynamic company branding.** ✨

Questions? Read the full guide linked above!
