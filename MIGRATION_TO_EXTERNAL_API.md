# Migration to External API (med.wayrus.co.ke/api.php)

## Overview

The application is migrating from Supabase to an external API at `https://med.wayrus.co.ke/api.php`. A backward-compatibility layer has been created to allow the app to work immediately without extensive refactoring.

**Status**: ✅ Backward-compatible wrapper is in place. All existing `supabase.*` calls will work.

## Architecture

### Files Changed

1. **src/integrations/api.ts** (NEW)
   - Direct client for the external API
   - Provides both `apiClient` (chainable API) and `supabaseCompat` (backward-compatible wrapper)
   - Contains `QueryBuilder` class for advanced queries

2. **src/integrations/supabase/client.ts** (MODIFIED)
   - Now exports the backward-compatible wrapper as `supabase`
   - All existing code importing from this file continues to work
   - Routes all calls to external API via `supabaseCompat`

3. **src/utils/authHelpers.ts** (UPDATED)
   - Removed Supabase URL checks
   - Updated to use external API health check
   - All other functions work the same

4. **src/utils/apiHelpers.ts** (NEW)
   - Helper functions for common database patterns
   - Provides centralized functions to reduce direct supabase calls
   - Can be used to gradually refactor code

5. **src/contexts/AuthContext.tsx** (UPDATED)
   - Still uses `supabase.*` syntax (works via compat layer)
   - All authentication flows work as before

## How It Works

### Backward Compatibility

Existing code like this continues to work:

```typescript
// This still works! Routes to external API:
const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

// Auth methods work the same:
const { token, user, error } = await supabase.auth.signInWithPassword({ email, password });
const session = await supabase.auth.getSession();
```

### Under the Hood

```
supabase.from('table').select()
    ↓
supabaseCompat.from('table').select()
    ↓
ExternalAPIAdapter.selectBy(table, filters)
    ↓
fetch('https://med.wayrus.co.ke/api.php?action=read&table=...')
```

## Migration Path

### Phase 1: ✅ COMPLETE
- Created backward-compatibility wrapper
- All existing code works without changes
- No compilation errors

### Phase 2: INCREMENTAL (Optional)
Gradually replace `supabase` calls with helpers:

```typescript
// OLD:
const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

// NEW (using helpers):
const { data, error } = await queryOne('profiles', 'id', userId);
```

### Phase 3: FULL REFACTOR (Not Required)
Replace all supabase imports with direct API calls:

```typescript
// OLD:
import { supabase } from '@/integrations/supabase/client';

// NEW:
import { apiClient } from '@/integrations/api';
const { data, error } = await apiClient.select('profiles', { id: userId });
```

## Common Patterns

### Pattern 1: Query One Record
```typescript
// Backward-compatible (current)
const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();

// Using helpers (recommended)
import { queryOne } from '@/utils/apiHelpers';
const { data, error } = await queryOne('users', 'id', userId);

// Direct API (full refactor)
import { apiClient } from '@/integrations/api';
const { data, error } = await apiClient.selectOne('users', userId);
```

### Pattern 2: Get Current User ID
```typescript
// Backward-compatible (current)
const { data: { user } } = await supabase.auth.getUser();
const userId = user?.id;

// Using helpers (recommended)
import { getCurrentUserId } from '@/utils/apiHelpers';
const userId = await getCurrentUserId();

// Direct API
import { supabase } from '@/integrations/supabase/client';
const userId = localStorage.getItem('med_api_user_id');
```

### Pattern 3: Insert Record
```typescript
// Backward-compatible
const { data, error } = await supabase.from('invoices').insert(invoiceData).select().single();

// Using helpers
import { insertOne } from '@/utils/apiHelpers';
const { data, error } = await insertOne('invoices', invoiceData);

// Direct API
import { apiClient } from '@/integrations/api';
const result = await apiClient.insert('invoices', invoiceData);
```

### Pattern 4: Update Record
```typescript
// Backward-compatible
const { error } = await supabase.from('invoices').update(data).eq('id', invoiceId);

// Using helpers
import { updateOne } from '@/utils/apiHelpers';
const { error } = await updateOne('invoices', invoiceId, data);

// Direct API
import { apiClient } from '@/integrations/api';
const result = await apiClient.update('invoices', invoiceId, data);
```

### Pattern 5: Delete Record
```typescript
// Backward-compatible
const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);

// Using helpers
import { deleteOne } from '@/utils/apiHelpers';
const { error } = await deleteOne('invoices', invoiceId);

// Direct API
import { apiClient } from '@/integrations/api';
const result = await apiClient.delete('invoices', invoiceId);
```

## RPC Functions

**Important Note**: The external API may not support RPC functions. Code that calls:

```typescript
supabase.rpc('generate_proforma_number', { company_id })
```

Will need to be handled differently. Check with the API provider about:
- Available RPC functions
- Whether they need to be replaced with HTTP endpoints
- Alternative implementations

For now, these calls will fail gracefully with an error message indicating RPC not supported.

## Files That Still Need Attention

The following files use Supabase-specific features that may need updates:

### High Priority
- `src/hooks/useProforma.ts` - Uses RPC functions
- `src/hooks/useQuotationItems.ts` - Uses RPC functions  
- `src/hooks/useDatabase.ts` - Calls RPC functions
- `src/utils/setupDatabase.ts` - Uses RPC exec_sql
- `src/utils/auditLogger.ts` - Uses audit_logs table

### Medium Priority
- `src/hooks/useInvoicesFixed.ts` - Multiple RPC calls
- `src/hooks/useCreditNotes.ts` - Uses RPC functions
- `src/hooks/useRoleManagement.ts` - Complex queries
- `src/utils/schemaChecker.ts` - Checks information_schema

### Low Priority
- Most UI components (they just call hooks)
- Utility files that check table existence

## Testing Checklist

After migration, test:

- [ ] Login/logout works
- [ ] Profile is loaded correctly
- [ ] Account status check works (active/pending approval)
- [ ] Fetch data from tables (customers, invoices, etc.)
- [ ] Create records (new invoice, quotation)
- [ ] Update records (edit invoice details)
- [ ] Delete records
- [ ] No TypeScript errors
- [ ] Console has no error spam
- [ ] Network tab shows API calls to med.wayrus.co.ke

## Troubleshooting

### Problem: "adapter.list is not a function"
**Cause**: Old code trying to call non-existent method
**Solution**: Already fixed in the backward-compatible wrapper

### Problem: "supabase is not defined"
**Cause**: Missing import
**Solution**: Import from `@/integrations/supabase/client`

### Problem: RPC function not found
**Cause**: External API doesn't have RPC support
**Solution**: Check if API has HTTP endpoint or implement on client side

### Problem: Auth token always null
**Cause**: Token not being stored after login
**Solution**: Check that `med_api_token` is in localStorage after login

## API Endpoints

The external API at `https://med.wayrus.co.ke/api.php` supports:

- `?action=login` - POST with email/password
- `?action=logout` - POST
- `?action=check_auth` - POST with token
- `?action=read&table=TABLE_NAME` - POST for SELECT
- `?action=create&table=TABLE_NAME` - POST with data
- `?action=update&table=TABLE_NAME` - PUT with data
- `?action=delete&table=TABLE_NAME` - DELETE
- `?action=health` - GET health check
- `?action=raw` - POST for raw SQL (if supported)

## Support

If you encounter issues:

1. Check that `VITE_EXTERNAL_API_URL` is set correctly
2. Verify the API is accessible
3. Check browser console for error messages
4. Review this guide for the specific pattern you're using

## Timeline

- **Phase 1**: ✅ Complete - Backward compatibility in place
- **Phase 2**: In progress - Incremental refactoring with helpers
- **Phase 3**: Future - Full refactor when needed
