-- Add RLS policy for payment_allocations table
-- This fixes the bug where payments couldn't be recorded because payment allocations
-- were blocked due to RLS being enabled without any policies

-- Drop existing policy if it exists (in case of re-running)
DROP POLICY IF EXISTS "Company scoped access" ON payment_allocations;

-- Create RLS policy that allows users to access payment allocations for invoices in their company
CREATE POLICY "Company scoped access" ON payment_allocations
    FOR ALL USING (
        invoice_id IN (
            SELECT id FROM invoices 
            WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = auth.uid()
            )
        )
    );
