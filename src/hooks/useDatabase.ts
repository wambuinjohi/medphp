import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateDocumentNumberAPI } from '@/utils/documentNumbering';

// ... rest of the imports and earlier code remains the same ...

/**
 * Hook to create a payment
 * Uses client-side insertion as the primary payment creation method
 */
export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentRecord: {
      company_id: string;
      customer_id?: string | null;
      invoice_id: string;
      payment_number: string;
      payment_date: string;
      amount: number;
      payment_method: string;
      reference_number?: string;
      notes?: string;
    }) => {
      try {
        // Use the client-side path as the primary payment creation method
        // Insert payment directly via database adapter
        try {
          // Generate payment_number if not provided
          if (!paymentRecord.payment_number) {
            paymentRecord.payment_number = await generateDocumentNumberAPI('payment');
          }

          const db = getDatabase();
          const insertResult = await db.insert('payments', paymentRecord);

          if (insertResult.error) {
            throw insertResult.error;
          }

          // Check if ID was returned
          if (!insertResult.id) {
            throw new Error('Payment record was created but no ID was returned. Please try again.');
          }

          // Fetch the created payment record
          const { data: paymentData, error: fetchError } = await db.selectOne('payments', insertResult.id);

          if (fetchError) {
            throw fetchError;
          }

          // Try to create payment allocation
          let allocation_failed = false;
          try {
            // Check if payment_allocations table exists
            const { error: allocError } = await db.insert('payment_allocations', {
              payment_id: paymentData.id,
              invoice_id: paymentRecord.invoice_id,
              amount: paymentRecord.amount,
            });

            if (allocError) {
              console.warn('Failed to create payment allocation:', allocError?.message);
              allocation_failed = true;
            } else {
              // Update invoice balance after successful allocation creation
              try {
                console.log('[Payment] Fetching allocations for invoice:', paymentRecord.invoice_id);

                // Get all allocations for this invoice to calculate paid amount
                const { data: allocations, error: allocFetchError } = await db.selectBy('payment_allocations', {
                  invoice_id: paymentRecord.invoice_id
                });

                console.log('[Payment] Allocations fetch result:', {
                  allocations,
                  error: allocFetchError?.message,
                  count: allocations?.length
                });

                if (!allocFetchError && allocations && allocations.length > 0) {
                  console.log('[Payment] Fetching invoice:', paymentRecord.invoice_id);

                  // Get the invoice
                  const { data: invoice, error: invoiceError } = await db.selectOne('invoices', paymentRecord.invoice_id);

                  console.log('[Payment] Invoice fetch result:', {
                    invoice,
                    error: invoiceError?.message
                  });

                  if (!invoiceError && invoice) {
                    // Calculate new paid amount from all allocations
                    const totalPaid = (allocations as any[]).reduce(
                      (sum, alloc) => sum + (alloc.amount || alloc.amount_allocated || 0),
                      0
                    );
                    const newBalanceDue = (invoice as any).total_amount - totalPaid;

                    console.log('[Payment] Calculated values:', {
                      totalPaid,
                      newBalanceDue,
                      oldStatus: (invoice as any).status
                    });

                    // Determine status
                    let newStatus = (invoice as any).status || 'draft';
                    const tolerance = 0.01;
                    const adjustedBalance = Math.abs(newBalanceDue) < tolerance ? 0 : newBalanceDue;

                    if (adjustedBalance <= 0 && totalPaid > tolerance) {
                      newStatus = 'paid';
                    } else if (totalPaid > tolerance && adjustedBalance > 0) {
                      newStatus = 'partial';
                    } else {
                      newStatus = 'draft';
                    }

                    console.log('[Payment] Updating invoice with:', {
                      paid_amount: Math.max(0, totalPaid),
                      balance_due: Math.max(0, newBalanceDue),
                      status: newStatus
                    });

                    // Update invoice
                    const updateResult = await db.update('invoices', paymentRecord.invoice_id, {
                      paid_amount: Math.max(0, totalPaid),
                      balance_due: Math.max(0, newBalanceDue),
                      status: newStatus,
                      updated_at: new Date().toISOString()
                    });

                    console.log('[Payment] Invoice update result:', {
                      error: updateResult?.error?.message,
                      affectedRows: updateResult?.affectedRows
                    });

                    if (updateResult?.error) {
                      console.warn('Failed to update invoice:', updateResult.error?.message);
                    }
                  } else {
                    console.warn('[Payment] Invoice not found or error fetching:', invoiceError?.message);
                  }
                } else {
                  console.warn('[Payment] No allocations found or error fetching:', allocFetchError?.message);
                }
              } catch (reconcileError: any) {
                console.warn('[Payment] Exception during invoice update:', reconcileError?.message);
              }
            }
          } catch (allocError: any) {
            console.warn('Payment allocation failed (table might not exist):', allocError?.message);
            allocation_failed = true;
          }

          return {
            success: true,
            fallback_used: true,
            allocation_failed,
            data: paymentData
          };
        } catch (fallbackError: any) {
          throw fallbackError;
        }
      } catch (error: any) {
        throw error;
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['paymentAllocations'] });

      toast.success('Payment recorded successfully!');
    },
    onError: (error: any) => {
      console.error('Error creating payment:', error);
      const errorMessage = error?.message || 'Failed to record payment. Please try again.';
      toast.error(errorMessage);
    },
  });
}
