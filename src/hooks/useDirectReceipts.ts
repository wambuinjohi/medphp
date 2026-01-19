import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DirectReceipt {
  id: string;
  invoice_id: string;
  payment_number: string;
  invoice_number: string;
  customers: {
    name: string;
    email?: string;
  };
  invoice_date: string;
  payment_date: string;
  total_amount: number;
  paid_amount: number;
  payment_method: string;
  reference_number?: string;
  status: 'paid' | 'partial' | 'draft';
  invoice_items?: any[];
  created_by?: string;
  created_by_profile?: { full_name?: string } | null;
}

export const useDirectReceipts = (companyId?: string) => {
  return useQuery({
    queryKey: ['directReceipts', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      try {
        // Fetch invoices with their related payment and customer info
        const { data: invoices, error: invoicesError } = await supabase
          .from('invoices')
          .select(`
            id,
            invoice_number,
            invoice_date,
            total_amount,
            paid_amount,
            balance_due,
            status,
            created_by,
            created_by_profile:profiles!invoices_created_by_fk(full_name),
            customers(id, name, email),
            invoice_items(
              id,
              description,
              quantity,
              unit_price,
              tax_percentage,
              tax_amount,
              tax_inclusive,
              line_total,
              sort_order
            ),
            payments:payment_allocations(
              payment_id,
              payments(id, payment_number, payment_date, amount, payment_method, reference_number)
            )
          `)
          .eq('company_id', companyId)
          .ilike('notes', '%Direct receipt%')
          .order('invoice_date', { ascending: false });

        if (invoicesError) throw invoicesError;

        // Transform invoices to receipts format
        const transformedReceipts: DirectReceipt[] = (invoices || []).map((invoice: any) => {
          const payment = invoice.payments?.[0]?.payments;
          return {
            id: invoice.id,
            invoice_id: invoice.id,
            payment_number: payment?.payment_number || `REC-${invoice.id.slice(0, 8)}`,
            invoice_number: invoice.invoice_number,
            customers: invoice.customers,
            invoice_date: invoice.invoice_date,
            payment_date: payment?.payment_date || invoice.invoice_date,
            total_amount: invoice.total_amount,
            paid_amount: invoice.paid_amount,
            payment_method: payment?.payment_method || 'unknown',
            reference_number: payment?.reference_number,
            status: invoice.status,
            invoice_items: invoice.invoice_items,
            created_by: invoice.created_by,
            created_by_profile: invoice.created_by_profile
          };
        });

        return transformedReceipts;
      } catch (error) {
        console.error('Error fetching direct receipts:', error);
        throw error;
      }
    },
    enabled: !!companyId,
  });
};
