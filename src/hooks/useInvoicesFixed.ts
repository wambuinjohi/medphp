import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api';
import { toast } from 'sonner';

/**
 * Fixed hook for fetching invoices with customer data
 * Uses the external API adapter for database operations
 */
export const useInvoicesFixed = (companyId?: string) => {
  return useQuery({
    queryKey: ['invoices_fixed', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      try {
        console.log('Fetching invoices for company:', companyId);

        // Fetch invoices using the external API adapter
        const { data: invoices, error: invoicesError } = await apiClient.select('invoices', {
          company_id: companyId
        });

        if (invoicesError) {
          console.error('Error fetching invoices:', invoicesError);
          throw new Error(`Failed to fetch invoices: ${invoicesError.message}`);
        }

        if (!Array.isArray(invoices)) {
          console.log('Invoices fetched successfully (no data)');
          return [];
        }

        if (!invoices || invoices.length === 0) {
          return [];
        }

        console.log('Invoices fetched successfully:', invoices?.length || 0);

        // Try to fetch customer data
        const customerIds = [...new Set(invoices.map((invoice: any) => invoice.customer_id).filter(id => id && typeof id === 'string'))];
        let customerMap = new Map();
        
        if (customerIds.length > 0) {
          try {
            // Fetch customers
            for (const customerId of customerIds) {
              const { data: customer, error: customerError } = await apiClient.selectOne('customers', customerId);
              if (!customerError && customer) {
                customerMap.set(customerId, customer);
              }
            }
          } catch (e) {
            console.warn('Could not fetch customer details (non-fatal):', e);
          }
        }

        // Try to fetch invoice items
        let itemsMap = new Map();
        let invoiceIds = invoices.map((inv: any) => inv.id);
        
        if (invoiceIds.length > 0) {
          try {
            // Fetch invoice items for all invoices
            const { data: allItems, error: itemsError } = await apiClient.select('invoice_items', {});
            
            if (!itemsError && Array.isArray(allItems)) {
              // Filter items for our invoices
              const relevantItems = allItems.filter((item: any) => invoiceIds.includes(item.invoice_id));
              
              // Group by invoice_id
              relevantItems.forEach((item: any) => {
                if (!itemsMap.has(item.invoice_id)) {
                  itemsMap.set(item.invoice_id, []);
                }
                itemsMap.get(item.invoice_id).push(item);
              });
            }
          } catch (e) {
            console.warn('Could not fetch invoice items (non-fatal):', e);
          }
        }

        // Combine data
        const enrichedInvoices = invoices.map((invoice: any) => ({
          ...invoice,
          customers: customerMap.get(invoice.customer_id) || {
            name: 'Unknown Customer',
            email: null,
            phone: null
          },
          invoice_items: itemsMap.get(invoice.id) || []
        }));

        console.log('Invoices enriched successfully:', enrichedInvoices.length);
        return enrichedInvoices;

      } catch (error) {
        console.error('Error in useInvoicesFixed:', error);
        throw error;
      }
    },
    enabled: !!companyId,
    staleTime: 30000, // Cache for 30 seconds
    retry: 1,
    retryDelay: 1000,
  });
};

/**
 * Hook for fetching customer invoices (for a specific customer)
 */
export const useCustomerInvoicesFixed = (customerId?: string, companyId?: string) => {
  return useQuery({
    queryKey: ['customer_invoices_fixed', customerId, companyId],
    queryFn: async () => {
      if (!customerId) return [];

      try {
        console.log('Fetching invoices for customer:', customerId);

        // Fetch invoices for the customer using the external API adapter
        const { data: invoices, error: invoicesError } = await apiClient.select('invoices', {
          customer_id: customerId,
          ...(companyId && { company_id: companyId })
        });

        if (invoicesError) {
          console.error('Error fetching customer invoices:', invoicesError);
          throw new Error(`Failed to fetch customer invoices: ${invoicesError.message}`);
        }

        if (!Array.isArray(invoices) || !invoices || invoices.length === 0) {
          return [];
        }

        // Fetch customer data
        let customer = null;
        try {
          const { data: customerData, error: customerError } = await apiClient.selectOne('customers', customerId);
          if (!customerError && customerData) {
            customer = customerData;
          }
        } catch (e) {
          console.warn('Could not fetch customer data (non-fatal):', e);
        }

        // Fetch invoice items
        let itemsMap = new Map();
        try {
          const invoiceIds = invoices.map((inv: any) => inv.id);
          const { data: allItems, error: itemsError } = await apiClient.select('invoice_items', {});
          
          if (!itemsError && Array.isArray(allItems)) {
            const relevantItems = allItems.filter((item: any) => invoiceIds.includes(item.invoice_id));
            relevantItems.forEach((item: any) => {
              if (!itemsMap.has(item.invoice_id)) {
                itemsMap.set(item.invoice_id, []);
              }
              itemsMap.get(item.invoice_id).push(item);
            });
          }
        } catch (e) {
          console.warn('Could not fetch invoice items (non-fatal):', e);
        }

        // Combine data
        const enrichedInvoices = invoices.map((invoice: any) => ({
          ...invoice,
          customers: customer || {
            name: 'Unknown Customer',
            email: null,
            phone: null
          },
          invoice_items: itemsMap.get(invoice.id) || []
        }));

        return enrichedInvoices;

      } catch (error) {
        console.error('Error in useCustomerInvoicesFixed:', error);
        throw error;
      }
    },
    enabled: !!customerId,
    staleTime: 30000,
    retry: 1,
  });
};

// Delete an invoice (audited, cleans up items)
export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      try {
        // Delete child items first
        try {
          // Fetch invoice items first
          const { data: items, error: itemsError } = await apiClient.select('invoice_items', {});
          if (!itemsError && Array.isArray(items)) {
            const invoiceItems = items.filter((item: any) => item.invoice_id === invoiceId);
            for (const item of invoiceItems) {
              await apiClient.delete('invoice_items', item.id);
            }
          }
        } catch (e) {
          console.warn('Invoice items delete skipped/failed:', (e as any)?.message || e);
        }

        // Delete parent record
        const result = await apiClient.delete('invoices', invoiceId);
        if (result.error) {
          throw new Error(`Failed to delete invoice: ${result.error.message}`);
        }
      } catch (error) {
        console.error('Error deleting invoice:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices_fixed'] });
      toast.success('Invoice deleted successfully!');
    },
    onError: (error) => {
      console.error('Error deleting invoice:', error);
      toast.error(`Failed to delete invoice: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });
};
