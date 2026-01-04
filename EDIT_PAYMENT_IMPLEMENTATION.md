# Edit Payment Feature Implementation

## Overview
Added complete edit payment functionality to the Payments module. Users can now edit payment details, and the changes automatically affect customer statements and invoice balances.

## Changes Made

### 1. **New Hook: `useUpdatePayment`** (src/hooks/useDatabase.ts)
- **Location**: Lines 1210-1320
- **Functionality**:
  - Updates payment record (amount, date, method, reference, notes)
  - Recalculates payment allocation amounts when payment amount changes
  - Automatically updates invoice balances for all allocated invoices
  - Handles invoice status recalculation (draft, partial, paid)
  - Invalidates relevant query caches to refresh UI

**Key Features**:
- Compares old and new payment amounts to calculate difference
- Adjusts invoice `paid_amount` and `balance_due` accordingly
- Uses tolerance (0.01) for floating-point precision in balance calculations
- Updates invoice status based on payment activity
- Clears cache for payments, invoices, and customer statements

### 2. **New Component: `EditPaymentModal`** (src/components/payments/EditPaymentModal.tsx)
- **Location**: New file, 353 lines
- **Features**:
  - Modal dialog for editing payment details
  - Editable fields:
    - Amount (KES)
    - Payment Date
    - Payment Method (with dropdown)
    - Reference Number
    - Notes
  - Shows original amount vs new amount comparison
  - Displays all invoice allocations for the payment
  - Shows warning when amount is changed (explains impact on invoice balances)
  - Summary card showing difference calculation

**UX Improvements**:
- Visual feedback when amount changes
- Allocation display shows which invoices will be affected
- Clear messaging about impact on invoice balances
- Toast notifications for success/error states
- Loading state during submission

### 3. **Updated: Payments Page** (src/pages/Payments.tsx)
**Additions**:
- Import EditPaymentModal component
- Import Edit icon from lucide-react
- Add showEditModal state variable
- Add handleEditPayment function with permission checks
- Add Edit button to payment table actions
- Add EditPaymentModal component render with proper props
- Update DeletePaymentModal success callback to close edit modal

**Edit Button Features**:
- Positioned between View and Download buttons
- Uses primary color styling (blue)
- Respects edit_payment permission
- Shows appropriate disabled state

## Affected Areas

### Customer Statements
✅ **Automatically Updated**: When a payment is edited:
1. Invoice balances are recalculated
2. Customer's outstanding amounts are adjusted
3. Payment dates affect aging calculations
4. Customer statement reports reflect changes

### Invoice Management
✅ **Automatic Updates**:
- `paid_amount`: Adjusted based on payment amount change
- `balance_due`: Recalculated as `total_amount - paid_amount`
- `status`: Changed to 'paid', 'partial', or 'draft' based on new balance

### Cache Invalidation
The mutation invalidates:
- `payments` cache
- `invoices` cache
- `customer_invoices` cache

## Permissions Required

The edit payment feature respects the following permission:
- `edit_payment`: Required to edit payments (checked in handleEditPayment)

## Database Impact

### Tables Involved
1. **payments** table:
   - Updates: amount, payment_date, payment_method, reference_number, notes, updated_at

2. **payment_allocations** table:
   - Updates: amount_allocated (when payment amount changes)

3. **invoices** table:
   - Updates: paid_amount, balance_due, status, updated_at

## Error Handling

- Validates payment exists before attempting update
- Validates amount is greater than 0
- Validates payment method is selected
- Provides user-friendly error messages via toast notifications
- Logs detailed errors for debugging
- Graceful failure with no data corruption

## UI/UX Flow

1. User clicks Edit button on payment row
2. EditPaymentModal opens with pre-filled data
3. User can modify any field
4. Form shows original vs new amounts
5. User clicks "Update Payment"
6. System:
   - Updates payment record
   - Recalculates invoice balances
   - Shows success message
   - Closes modal
   - Refreshes payment list
7. Customer statements automatically reflect changes

## Testing Checklist

- ✅ Edit payment amount (affects invoice balances)
- ✅ Edit payment date
- ✅ Edit payment method
- ✅ Edit reference number and notes
- ✅ Verify invoice status updates (draft → partial → paid)
- ✅ Verify customer statements update
- ✅ Permission checks work
- ✅ Error handling works
- ✅ Cache invalidation works
- ✅ Original amount shown for comparison

## Related Features

- Delete Payment: Reverses all payment effects
- Record Payment: Creates new payment with auto allocation
- View Payment: Shows detailed payment information
- Customer Statements: Shows impact of payment changes
- Payment Receipts: Can be re-downloaded after editing

## Technical Notes

- Uses React Query mutations for state management
- Follows existing code patterns in the application
- Compatible with Supabase RLS policies
- Handles floating-point precision with 0.01 tolerance
- Respects company and customer relationships
