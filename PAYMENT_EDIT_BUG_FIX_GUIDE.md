# Payment Edit Bug Fix Guide

## Problem Summary
When editing a payment, the system updates invoice balances which may trigger the `trigger_update_stock_on_invoice` trigger. This trigger was inserting into the `stock_movements` table with:
- **Lowercase** `'out'` for `movement_type` 
- **Lowercase** `'invoice'` for `reference_type`

However, database constraints require these values to be **UPPERCASE**:
- `movement_type` must be in `('IN', 'OUT', 'ADJUSTMENT')`
- `reference_type` must be in `('INVOICE', 'DELIVERY_NOTE', 'RESTOCK', 'ADJUSTMENT', 'CREDIT_NOTE', 'PURCHASE', 'CREDIT_NOTE_REVERSAL')`

## Error Message
```
Error: Failed to update invoice balance: 
new row for relation "stock_movements" violates check constraint "stock_movements_movement_type_check"
```

## Root Cause Analysis

### Where the Bug Was
**File**: `database-schema.sql`, lines 481-493 in the `update_stock_on_invoice()` trigger function

**Original Code (WRONG)**:
```sql
INSERT INTO stock_movements (company_id, product_id, movement_type, quantity, reference_type, reference_id, reference_number, movement_date, created_by)
SELECT 
    NEW.company_id,
    ii.product_id,
    'out',              -- ❌ LOWERCASE
    -ii.quantity,
    'invoice',          -- ❌ LOWERCASE
    NEW.id,
    ...
```

### Why It Happens
When you edit a payment amount:
1. `useUpdatePayment()` hook updates invoice `paid_amount` and `balance_due`
2. Invoice status may change to 'paid'
3. The `trigger_update_stock_on_invoice` trigger fires (responds to status → 'paid' changes)
4. Trigger inserts into `stock_movements` with **lowercase** values
5. Constraint violation occurs ❌

## Solution Applied

### Fixed Code (CORRECT)
```sql
INSERT INTO stock_movements (company_id, product_id, movement_type, quantity, reference_type, reference_id, reference_number, movement_date, created_by)
SELECT 
    NEW.company_id,
    ii.product_id,
    'OUT',              -- ✅ UPPERCASE
    -ii.quantity,
    'INVOICE',          -- ✅ UPPERCASE
    NEW.id,
    ...
```

### Changes Made
1. **database-schema.sql**
   - Line 485: Changed `'out'` → `'OUT'`
   - Line 487: Changed `'invoice'` → `'INVOICE'`
   - Line 304: Updated comment from `'in', 'out', 'adjustment'` → `'IN', 'OUT', 'ADJUSTMENT'`

## How to Deploy the Fix

### Step 1: Update Database Schema
You need to apply the schema changes to your Supabase database. The fixes are already in `database-schema.sql`.

**Option A: Using Supabase Dashboard**
1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the SQL from `STOCK_MOVEMENTS_FIX.sql`
5. Run the script

**Option B: Using Supabase CLI**
```bash
supabase db push
```

### Step 2: Normalize Existing Data
The `STOCK_MOVEMENTS_FIX.sql` script will:
- Update any existing lowercase `movement_type` values to uppercase
- Update any existing lowercase `reference_type` values to uppercase
- Verify that constraints are properly applied
- Check that all existing data now complies with constraints

## Testing the Fix

### Test Case 1: Edit Payment Amount
1. Open the Payments page
2. Select a payment that has invoice allocations
3. Click the **Edit** button (pencil icon)
4. Change the payment amount (increase or decrease)
5. Click **Update Payment**
6. ✅ Should succeed with no errors

### Test Case 2: Verify Invoice Status Changes
1. Go to Invoices page
2. Find an invoice with a payment
3. Check that its status is correctly set to:
   - `draft` if no payments
   - `partial` if partially paid
   - `paid` if fully paid
4. ✅ Statuses should be accurate

### Test Case 3: Verify Customer Statements
1. Go to Reports → Customer Statements
2. Generate a statement for a customer with edited payments
3. ✅ Statements should reflect the updated payment amounts

### Test Case 4: Stock Movements (if using inventory)
1. If your system tracks inventory, check that stock movements are created correctly
2. All `movement_type` values should be uppercase: 'IN', 'OUT', 'ADJUSTMENT'
3. All `reference_type` values should be uppercase: 'INVOICE', 'DELIVERY_NOTE', etc.

## What Was Fixed in the Code

### 1. Database Schema (database-schema.sql)
- ✅ Fixed trigger function `update_stock_on_invoice()`
- ✅ Updated table comment for clarity
- ✅ Ensured consistency with constraints

### 2. Migration Script (STOCK_MOVEMENTS_FIX.sql)
- ✅ Normalizes existing data
- ✅ Enforces uppercase constraints
- ✅ Provides verification queries

### 3. EditPaymentModal (existing)
- ℹ️ No changes needed - it already handles the update correctly
- ℹ️ Shows warnings when amount changes
- ℹ️ Displays affected invoices

### 4. useUpdatePayment Hook (existing)
- ℹ️ No changes needed - hook logic is correct
- ℹ️ Properly calculates new balances
- ℹ️ Correctly updates invoice status

## Prevention of Future Issues

### Code Patterns to Follow
When inserting into `stock_movements`:
```typescript
// ✅ CORRECT - Always use UPPERCASE
const stockMovements = items.map(item => ({
  movement_type: 'OUT' as const,        // UPPERCASE
  reference_type: 'INVOICE' as const,   // UPPERCASE
  ...
}));

// ❌ WRONG - Never use lowercase
const stockMovements = items.map(item => ({
  movement_type: 'out',         // LOWERCASE
  reference_type: 'invoice',    // LOWERCASE
  ...
}));
```

### SQL Patterns to Follow
```sql
-- ✅ CORRECT
INSERT INTO stock_movements (..., movement_type, reference_type, ...)
VALUES (..., 'OUT', 'INVOICE', ...);

-- ❌ WRONG
INSERT INTO stock_movements (..., movement_type, reference_type, ...)
VALUES (..., 'out', 'invoice', ...);
```

## Affected Features
The fix affects these features:
- ✅ **Edit Payment** - Now works without constraint violations
- ✅ **Delete Payment** - Continues to work correctly
- ✅ **Invoice Status Changes** - Properly triggers stock movements
- ✅ **Customer Statements** - Reflects payment changes accurately
- ✅ **Inventory Tracking** - Stock movements use correct format

## Troubleshooting

### If you still get errors after applying the fix:

1. **Verify the schema changes were applied**
   ```sql
   -- Check the trigger function
   SELECT pg_get_functiondef('update_stock_on_invoice()'::regprocedure);
   ```
   - Look for `'OUT'` (uppercase) at line 485
   - Look for `'INVOICE'` (uppercase) at line 487

2. **Verify constraints exist**
   ```sql
   -- Check constraints
   SELECT constraint_name, constraint_definition 
   FROM information_schema.check_constraints 
   WHERE table_name = 'stock_movements';
   ```
   - Should show constraints requiring uppercase values

3. **Check existing data**
   ```sql
   -- Look for lowercase values
   SELECT COUNT(*) as lowercase_count 
   FROM stock_movements 
   WHERE movement_type != UPPER(movement_type) 
   OR reference_type != UPPER(reference_type);
   ```
   - Should return 0 if fix was applied

4. **Re-run the normalization script** if needed
   - Use `STOCK_MOVEMENTS_FIX.sql` again

## Files Modified

| File | Changes | Impact |
|------|---------|--------|
| `database-schema.sql` | Fixed trigger function | Critical - Schema fix |
| `STOCK_MOVEMENTS_FIX.sql` | NEW - Normalization script | Required - Data fix |
| `PAYMENT_EDIT_BUG_FIX_GUIDE.md` | NEW - This guide | Documentation |

## Timeline

- **Issue Found**: Payment edit triggered constraint violation
- **Root Cause**: Lowercase values in trigger function
- **Fix Applied**: Changed to uppercase in schema
- **Status**: ✅ FIXED and READY TO DEPLOY

## Next Steps

1. ✅ Apply `database-schema.sql` changes to your database
2. ✅ Run `STOCK_MOVEMENTS_FIX.sql` to normalize existing data
3. ✅ Test the payment edit feature
4. ✅ Verify customer statements update correctly
5. ✅ Monitor for any related issues

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify the constraint definitions match the fix
3. Ensure all schema changes are applied
4. Run the normalization script on existing data
