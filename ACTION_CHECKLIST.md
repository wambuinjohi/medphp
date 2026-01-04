# ✅ Action Checklist - Company Branding on Login

## Quick Setup (2 Minutes)

### Step 1: Check Company Data
- [ ] Open Supabase Dashboard
- [ ] Go to **Table Editor** 
- [ ] Click **companies** table
- [ ] Verify you have at least 1 row with:
  - [ ] `name` field filled (e.g., "Acme Corp")
  - [ ] `logo_url` field (optional, e.g., "https://...")

If missing, click **Insert** and add one.

### Step 2: Enable Public Access (Pick ONE)

#### 🟢 Option A: SQL Dashboard (Easiest)
- [ ] Supabase Dashboard → **SQL Editor**
- [ ] Click **New Query**
- [ ] Copy file: `scripts/setup-company-public-read.sql`
- [ ] Paste into query editor
- [ ] Click **Run** (blue button)
- [ ] See: "Policy created successfully"

#### 🟡 Option B: Run Script (CLI)
```bash
bash scripts/setup-company-public-read.sh
```

#### 🟠 Option C: Manual SQL
Copy this to SQL Editor and run:
```sql
DROP POLICY IF EXISTS "Public can read companies" ON companies;
CREATE POLICY "Public can read companies" ON companies
  FOR SELECT USING (true);
```

### Step 3: Test It
- [ ] Hard refresh browser: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)
- [ ] Visit login page
- [ ] Verify:
  - [ ] Company logo displays
  - [ ] Company name shows in title
  - [ ] Company name shows in footer (not ">> Medical Supplies")

---

## Troubleshooting

### Still see default name?
→ Did you complete Step 2? The RLS policy must be created.

### Logo missing?
→ Check `logo_url` is valid in companies table

### Need to update company info?
1. Supabase → Table Editor → companies
2. Edit the row
3. Refresh browser

---

## ✅ Done!

Your login page now has dynamic company branding. That's it!

**No edge functions, no complex setup. Just SQL + React hooks.**
