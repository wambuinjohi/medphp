# Payment Creation Testing Guide

## Overview
This guide verifies that the payment allocation system works correctly after removing RPC dependencies. The payment creation flow now uses direct database operations with fallback mechanisms.

## Test Environment Setup
1. Ensure you're logged in to the application
2. Navigate to the Payments module
3. Have an invoice ready to create a payment against

## Test Scenarios

### Scenario 1: Normal Payment (Amount ≤ Balance Due)

#### Steps:
1. Open the "Record Payment" modal
2. Select an invoice with a balance due > 0
3. Enter a payment amount equal to or less than the balance due
4. Select a payment method
5. (Optional) Enter a reference number
6. Click "Record Payment"

#### Expected Results:
- ✅ Toast shows: "Payment of KES [amount] recorded successfully!"
- ✅ Payment record created in database with:
  - `payment_number` (auto-generated via API)
  - `payment_date`
  - `amount`
  - `payment_method`
  - `reference_number` (or defaults to `payment_number`)
- ✅ Payment allocation created automatically:
  - Links payment to invoice
  - Records `amount_allocated`
- ✅ Invoice `balance_due` updates correctly:
  - New balance = previous balance - payment amount
- ✅ No modal dialog shows (allocation should succeed)
- ✅ Browser console shows no errors

#### Code Flow:
1. `RecordPaymentModal.handleSubmit()` → `processPayment()`
2. `generateDocumentNumberAPI('payment')` generates unique number
3. `useCreatePayment.mutateAsync()` inserts payment record
4. Allocation happens automatically in database
5. Result checked: `result.fallback_used`, `result.allocation_failed`

---

### Scenario 2: Overpayment (Amount > Balance Due)

#### Steps:
1. Open the "Record Payment" modal
2. Select an invoice with balance due < desired payment amount
3. Enter a payment amount greater than balance due
4. A confirmation modal appears showing:
   - Current balance
   - Overpayment amount
5. Click "Confirm Overpayment"

#### Expected Results:
- ✅ Overpayment confirmation dialog appears with:
  - Clear display of balance vs. payment amount
  - Overpayment amount highlighted
  - Info: "A credit note will be automatically created"
- ✅ After confirmation:
  - Payment created successfully
  - Credit note created with `overpayment_amount`
  - Toast shows: "Credit note [number] created for overpayment"
  - Invoice balance becomes 0 (or adjusted correctly)
  - New credit note record in database

#### Code Flow:
1. `RecordPaymentModal.handleSubmit()` detects overpayment
2. Shows `Overpayment Confirmation` dialog
3. `processPayment()` creates payment
4. `useCreateOverpaymentCreditNote.mutateAsync()` creates credit note
5. If credit note creation fails: toast warning shown, payment still succeeds
6. Result includes `fallback_used` flag if API used instead of RPC

---

### Scenario 3: Allocation Failure Recovery

#### Steps:
1. Attempt to create a payment when `payment_allocations` table doesn't exist
2. System should:
   - Still create the payment record ✅
   - Fail to allocate
   - Show `PaymentAllocationQuickFix` component

#### Expected Results:
- ✅ Payment created successfully (payment record exists in DB)
- ✅ Toast shows:
  - "Payment of KES [amount] recorded successfully!"
  - "However, payment allocation failed. See the fix options below."
- ✅ `PaymentAllocationQuickFix` component displays with:
  - Clear explanation of the issue
  - "Diagnose" button to check system
  - "Copy Fix SQL" button with setup script
  - "Open SQL Editor" button to run SQL
- ✅ Diagnosis process:
  - Click "Diagnose" → system checks for `payment_allocations` table
  - If table missing: shows "needs-fix" state with SQL copy option
  - SQL provides complete table setup with RLS policies
  - User can paste & run in Supabase SQL Editor
  - After setup, payment allocation will work for future payments

#### Code Flow:
1. `useCreatePayment()` attempts allocation
2. If allocation fails: `allocation_failed: true` returned
3. `RecordPaymentModal` checks `result.allocation_failed`
4. Sets `setAllocationFailed(true)`
5. Renders `<PaymentAllocationQuickFix />` component
6. User can diagnose and fix via UI

---

## Verification Checklist

### Database Level Verification
- [ ] Check `payments` table for new payment record
- [ ] Verify columns: `payment_number`, `payment_date`, `amount`, `payment_method`, `reference_number`, `company_id`
- [ ] Check `payment_allocations` table for allocation record
- [ ] Verify allocation: `payment_id`, `invoice_id`, `amount_allocated`
- [ ] Check `invoices` table for updated `balance_due`
- [ ] For overpayments: check `credit_notes` table for new record

### Code Quality Verification
- [ ] ✅ No RPC calls in payment creation flow
  - `useCreatePayment()` uses direct `db.insert()`
  - Document numbering uses `generateDocumentNumberAPI()`
  - Allocation attempted via database trigger/policy
  - Overpayment credit note uses API with fallback
- [ ] ✅ Fallback mechanisms in place:
  - Payment success doesn't depend on allocation
  - Credit note creation failure doesn't prevent payment
  - All errors properly caught and reported to user
- [ ] ✅ UI feedback:
  - `fallback_used` flag properly checked
  - `allocation_failed` flag triggers `PaymentAllocationQuickFix`
  - Toast messages differentiate between success and partial success
  - Quick fix component provides actionable steps

### User Experience Verification
- [ ] Payment number auto-generates via API (not RPC)
- [ ] Reference number defaults to payment number if not provided
- [ ] Payment method selection works and persists
- [ ] Invoice selection shows current balance due
- [ ] Overpayment confirmation provides clear information
- [ ] Error messages are specific and actionable
- [ ] No unexpected console errors appear

### Browser Console Verification
- [ ] No RPC errors (previously: `Error: Object function...`)
- [ ] No "undefined fallback_used" messages
- [ ] No allocation errors that aren't handled
- [ ] Debug: Check for fallback behavior in network tab
  - Should see API calls to `generateDocumentNumberAPI`
  - Should NOT see RPC calls

### Server/Database Log Verification
- [ ] Check Supabase logs for:
  - No failed RPC attempts
  - Successful API document numbering calls
  - Database inserts for payments and allocations
  - Any allocation policy errors (if applicable)
- [ ] Monitor for performance issues
  - Payment creation should complete within 2-3 seconds
  - No timeout errors

---

## Troubleshooting

### Payment Created but Not Showing
- Wait 1-2 seconds for real-time updates
- Refresh the page
- Check browser console for errors

### Allocation Failed Alert Appears
- Click "Diagnose" in the `PaymentAllocationQuickFix` component
- Follow the SQL setup instructions
- Ensure `payment_allocations` table is created with proper RLS

### Document Number Not Generating
- Verify `generateDocumentNumberAPI()` is being called (check Network tab)
- Check that API response includes `payment_number`
- Verify document numbering service is accessible

### Credit Note Not Created for Overpayment
- Payment should still succeed with warning toast
- Check `credit_notes` table for entry
- If missing, check browser console for error details
- Verify `useCreateOverpaymentCreditNote` mutation is working

---

## Success Criteria (Post-RPC Removal)

All of the following must be true:

1. ✅ Payment records create successfully without RPC calls
2. ✅ Document numbering uses API with fallback mechanism
3. ✅ Allocation failures don't prevent payment creation
4. ✅ `fallback_used` and `allocation_failed` flags properly indicate status
5. ✅ `PaymentAllocationQuickFix` component guides users to fix allocation issues
6. ✅ Overpayment credit notes create automatically with error handling
7. ✅ All error messages are user-friendly and actionable
8. ✅ No unexpected RPC calls appear in network logs

---

## Notes on Fallback Architecture

### Document Numbering Fallback
- **Primary**: Uses sequential API (`generateDocumentNumberAPI()`)
- **Fallback**: Already implemented with sequence-based number generation
- **Result**: Payment always gets a `payment_number`, no RPC needed

### Payment Allocation Fallback
- **Design**: Payment creation succeeds even if allocation fails
- **Notification**: `allocation_failed: true` triggers `PaymentAllocationQuickFix` UI
- **User Action**: User can diagnose and fix via quick-fix component

### Credit Note Fallback
- **Scenario**: Overpayment detected, credit note needed
- **Attempt**: Creates via database function with error handling
- **Fallback**: Warning toast shows, payment still succeeds
- **Recovery**: User can manually create credit note if needed

---

## Running Tests

To test this feature:

1. **Manual Testing via UI** (recommended for this release):
   - Use scenarios 1-3 above
   - Verify all expected results
   - Check database for records
   - Verify no RPC calls in network logs

2. **Automated Testing** (future enhancement):
   - Consider adding E2E tests using Playwright
   - Unit tests for `useCreatePayment` hook
   - Integration tests for payment-allocation flow

---

Generated: Payment Allocation RPC Removal Testing
Last Updated: After final refactoring
