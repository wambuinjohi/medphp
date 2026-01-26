import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getDatabase } from '@/integrations/database';
import { toast } from 'sonner';
import { calculateDocumentTotals, type TaxableItem } from '@/utils/taxCalculation';
import { parseErrorMessage } from '@/utils/errorHelpers';

export interface ProformaItem {
  id?: string;
  proforma_id?: string;
  product_id: string;
  product_name?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  discount_amount?: number;
  tax_percentage: number;
  tax_amount: number;
  tax_inclusive: boolean;
  line_total: number;
}

export interface ProformaInvoice {
  id?: string;
  company_id: string;
  customer_id: string;
  proforma_number: string;
  proforma_date: string;
  valid_until: string;
  subtotal: number;
  tax_percentage?: number;
  tax_amount: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'accepted' | 'expired' | 'converted';
  notes?: string;
  terms_and_conditions?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProformaWithItems extends ProformaInvoice {
  customers?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  proforma_items?: ProformaItem[];
}

/**
 * Hook to fetch proforma invoices for a company
 */
export const useProformas = (companyId?: string) => {
  return useQuery({
    queryKey: ['proforma_invoices', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('proforma_invoices')
        .select(`
          *,
          customers (
            id,
            name,
            email,
            phone,
            address
          ),
          proforma_items (
            *,
            products (
              name
            )
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching proformas:', error);
        throw error;
      }

      // Map product names to items for compatibility
      const proformasWithProductNames = data?.map(proforma => ({
        ...proforma,
        proforma_items: proforma.proforma_items?.map(item => ({
          ...item,
          product_name: item.products?.name || ''
        }))
      }));

      return proformasWithProductNames as ProformaWithItems[];
    },
    enabled: !!companyId,
  });
};

/**
 * Hook to fetch a single proforma invoice
 */
export const useProforma = (proformaId?: string) => {
  return useQuery({
    queryKey: ['proforma_invoice', proformaId],
    queryFn: async () => {
      if (!proformaId) return null;

      const { data, error } = await supabase
        .from('proforma_invoices')
        .select(`
          *,
          customers (
            id,
            name,
            email,
            phone,
            address
          ),
          proforma_items (
            *,
            products (
              name
            )
          )
        `)
        .eq('id', proformaId)
        .single();

      if (error) {
        console.error('Error fetching proforma:', error);
        throw error;
      }

      // Map product names to items for compatibility
      const proformaWithProductNames = {
        ...data,
        proforma_items: data.proforma_items?.map(item => ({
          ...item,
          product_name: item.products?.name || ''
        }))
      };

      return proformaWithProductNames as ProformaWithItems;
    },
    enabled: !!proformaId,
  });
};

// Utility function to serialize errors properly
const serializeError = (error: any): string => {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.details) return error.details;
  if (error.hint) return error.hint;
  if (error.code) return `Database error (code: ${error.code})`;
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return parseErrorMessage(error);
  }
};

/**
 * Hook to create a proforma invoice with items
 */
export const useCreateProforma = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ proforma, items }: { proforma: ProformaInvoice; items: ProformaItem[] }) => {
      // Validate and calculate totals
      const taxableItems: TaxableItem[] = items.map(item => ({
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_percentage: item.tax_percentage,
        tax_inclusive: item.tax_inclusive,
        discount_percentage: item.discount_percentage,
        discount_amount: item.discount_amount,
      }));

      const totals = calculateDocumentTotals(taxableItems);

      // Update proforma with calculated totals
      const proformaWithTotals = {
        ...proforma,
        subtotal: totals.subtotal,
        tax_amount: totals.tax_total,
        total_amount: totals.total_amount,
      };

      // Ensure created_by defaults to authenticated user
      let cleanProforma = { ...proformaWithTotals } as any;
      try {
        const { data: userData } = await supabase.auth.getUser();
        const authUserId = userData?.user?.id || null;
        if (authUserId) {
          cleanProforma.created_by = authUserId;
        } else if (typeof cleanProforma.created_by === 'undefined' || cleanProforma.created_by === null) {
          cleanProforma.created_by = null;
        }
      } catch {
        if (typeof cleanProforma.created_by === 'undefined') {
          cleanProforma.created_by = null;
        }
      }

      // Create the proforma invoice (retry without valid_until if column missing)
      let proformaData;
      let firstData; let proformaError: any;
      {
        const { data, error } = await supabase
          .from('proforma_invoices')
          .insert([cleanProforma])
          .select()
          .single();
        firstData = data; proformaError = error as any;
      }

      // Fallback: if error includes created_by (FK violation or column missing), retry without it
      if (proformaError && String(proformaError.message || '').includes('created_by')) {
        const { created_by, ...retryPayload } = cleanProforma;
        const retryRes = await supabase
          .from('proforma_invoices')
          .insert([retryPayload])
          .select()
          .single();
        firstData = retryRes.data; proformaError = retryRes.error as any;
      }

      if (proformaError) {
        const errorMessage = serializeError(proformaError).toLowerCase();
        console.warn('Proforma insert failed, checking for schema mismatch:', errorMessage);

        // Fallback: if valid_until column missing, retry without it
        if (errorMessage.includes('valid_until')) {
          const { valid_until, created_by, ...withoutColumns } = cleanProforma as any;
          const retry = await supabase
            .from('proforma_invoices')
            .insert([withoutColumns])
            .select()
            .single();

          if (retry.error) {
            const retryMessage = serializeError(retry.error);
            console.error('Retry insert failed:', retryMessage);
            throw new Error(`Failed to create proforma: ${retryMessage}`);
          }

          proformaData = retry.data;
        } else {
          throw new Error(`Failed to create proforma: ${serializeError(proformaError)}`);
        }
      } else {
        proformaData = firstData;
      }

      // Create the proforma items
      if (items.length > 0) {
        const proformaItemsFull = items.map(item => ({
          proforma_id: proformaData.id,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage || 0,
          discount_amount: item.discount_amount || 0,
          tax_percentage: item.tax_percentage,
          tax_amount: item.tax_amount,
          tax_inclusive: item.tax_inclusive,
          line_total: item.line_total,
        }));

        let { error: itemsError } = await supabase
          .from('proforma_items')
          .insert(proformaItemsFull);

        if (itemsError) {
          const firstMsg = serializeError(itemsError).toLowerCase();
          console.warn('Proforma items insert failed, attempting reduced columns:', firstMsg);

          // Retry without discount_amount / tax fields
          let proformaItemsReduced = items.map((item, index) => ({
            proforma_id: proformaData.id,
            product_id: item.product_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_percentage: item.discount_percentage || 0,
            line_total: item.line_total,
            sort_order: index + 1,
          }));

          // If discount_percentage column is missing, remove it too
          if (firstMsg.includes('discount_percentage')) {
            proformaItemsReduced = proformaItemsReduced.map(({ discount_percentage, ...rest }) => rest as any);
          }

          const retry = await supabase
            .from('proforma_items')
            .insert(proformaItemsReduced);

          if (retry.error) {
            const retryMessage = serializeError(retry.error);
            console.error('Retry creating proforma items failed:', retryMessage);
            // Try to delete the proforma if items creation failed
            await supabase.from('proforma_invoices').delete().eq('id', proformaData.id);
            throw new Error(`Failed to create proforma items: ${retryMessage}`);
          }
        }
      }

      return proformaData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proforma_invoices'] });
      toast.success(`Proforma invoice ${data.proforma_number} created successfully!`);
    },
    onError: (error) => {
      const errorMessage = serializeError(error);
      console.error('Error creating proforma:', errorMessage);
      toast.error(`Error creating proforma: ${errorMessage}`);
    },
  });
};

/**
 * Hook to update a proforma invoice
 */
export const useUpdateProforma = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      proformaId, 
      proforma, 
      items 
    }: { 
      proformaId: string; 
      proforma: Partial<ProformaInvoice>; 
      items?: ProformaItem[] 
    }) => {
      // If items are provided, recalculate totals
      if (items) {
        const taxableItems: TaxableItem[] = items.map(item => ({
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_percentage: item.tax_percentage,
          tax_inclusive: item.tax_inclusive,
          discount_percentage: item.discount_percentage,
          discount_amount: item.discount_amount,
        }));

        const totals = calculateDocumentTotals(taxableItems);

        // Update proforma with calculated totals
        proforma = {
          ...proforma,
          subtotal: totals.subtotal,
          tax_amount: totals.tax_total,
          total_amount: totals.total_amount,
        };
      }

      // Update the proforma invoice
      const { data: proformaData, error: proformaError } = await supabase
        .from('proforma_invoices')
        .update(proforma)
        .eq('id', proformaId)
        .select()
        .single();

      if (proformaError) {
        const errorMessage = serializeError(proformaError);
        console.error('Error updating proforma:', errorMessage);
        throw new Error(`Failed to update proforma: ${errorMessage}`);
      }

      // Update items if provided
      if (items) {
        // Delete existing items
        const { error: deleteError } = await supabase
          .from('proforma_items')
          .delete()
          .eq('proforma_id', proformaId);

        if (deleteError) {
          const errorMessage = serializeError(deleteError);
          console.error('Error deleting existing proforma items:', errorMessage);
          throw new Error(`Failed to delete existing proforma items: ${errorMessage}`);
        }

        // Insert new items
        if (items.length > 0) {
          const proformaItems = items.map(item => ({
            proforma_id: proformaId,
            product_id: item.product_id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_percentage: item.tax_percentage,
            tax_amount: item.tax_amount,
            tax_inclusive: item.tax_inclusive,
            line_total: item.line_total,
          }));

          const { error: itemsError } = await supabase
            .from('proforma_items')
            .insert(proformaItems);

          if (itemsError) {
            const errorMessage = serializeError(itemsError);
            console.error('Error creating updated proforma items:', errorMessage);
            throw new Error(`Failed to create updated proforma items: ${errorMessage}`);
          }
        }
      }

      return proformaData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proforma_invoices'] });
      queryClient.invalidateQueries({ queryKey: ['proforma_invoice', data.id] });
      toast.success(`Proforma invoice ${data.proforma_number} updated successfully!`);
    },
    onError: (error) => {
      const errorMessage = serializeError(error);
      console.error('Error updating proforma:', errorMessage);
      toast.error(`Error updating proforma: ${errorMessage}`);
    },
  });
};

/**
 * Hook to delete a proforma invoice
 */
export const useDeleteProforma = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proformaId: string) => {
      // Snapshot for audit
      let snapshot: any = null;
      let companyId: string | null = null;
      try {
        const { data } = await supabase
          .from('proforma_invoices')
          .select(`*, proforma_items(*)`)
          .eq('id', proformaId)
          .single();
        snapshot = data;
        companyId = (data as any)?.company_id ?? null;
      } catch {}

      try {
        const { logDeletion } = await import('@/utils/auditLogger');
        await logDeletion('proforma', proformaId, snapshot, companyId);
      } catch (e) {
        console.warn('Proforma delete audit failed:', (e as any)?.message || e);
      }

      // Delete child items first (best-effort)
      try {
        await supabase.from('proforma_items').delete().eq('proforma_id', proformaId);
      } catch (e) {
        console.warn('Proforma items delete skipped/failed:', (e as any)?.message || e);
      }

      // Delete parent record
      const { error } = await supabase
        .from('proforma_invoices')
        .delete()
        .eq('id', proformaId);

      if (error) {
        const errorMessage = serializeError(error);
        console.error('Error deleting proforma:', errorMessage);
        throw new Error(`Failed to delete proforma: ${errorMessage}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proforma_invoices'] });
      toast.success('Proforma invoice deleted successfully!');
    },
    onError: (error) => {
      const errorMessage = serializeError(error);
      console.error('Error deleting proforma:', errorMessage);
      toast.error(`Error deleting proforma: ${errorMessage}`);
    },
  });
};

/**
 * Hook to generate proforma number using the centralized API
 */
export const useGenerateProformaNumber = () => {
  return useMutation({
    mutationFn: async (companyId: string) => {
      // Use the centralized document number generation API
      const { generateDocumentNumberAPI } = await import('@/utils/documentNumbering');
      return generateDocumentNumberAPI('proforma');
    },
  });
};

/**
 * Hook to convert proforma to invoice
 */
export const useConvertProformaToInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proformaId: string) => {
      const db = getDatabase();

      // Get proforma data using database adapter
      const proformaResult = await db.selectOne('proforma_invoices', proformaId);
      if (proformaResult.error) throw proformaResult.error;
      if (!proformaResult.data) throw new Error('Proforma not found');

      const proforma = proformaResult.data as any;

      // Get proforma items
      const itemsResult = await db.selectBy('proforma_items', { proforma_id: proformaId });
      if (itemsResult.error) throw itemsResult.error;
      const proformaItems = itemsResult.data || [];

      // Generate invoice number using centralized API
      const { generateDocumentNumberAPI } = await import('@/utils/documentNumbering');
      const invoiceNumber = await generateDocumentNumberAPI('invoice');

      // Get current user
      let createdBy: string | null = null;
      try {
        const { data: userData } = await supabase.auth.getUser();
        createdBy = userData?.user?.id || null;
      } catch {
        createdBy = null;
      }

      // Create invoice from proforma
      const invoiceData = {
        company_id: proforma.company_id,
        customer_id: proforma.customer_id,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'sent',
        subtotal: proforma.subtotal,
        tax_amount: proforma.tax_amount,
        total_amount: proforma.total_amount,
        created_by: createdBy
      };

      // Create invoice using database adapter
      const invoiceInsertResult = await db.insert('invoices', invoiceData);
      if (invoiceInsertResult.error) {
        // Fallback: if FK violation on created_by, retry with created_by = null
        if (String(invoiceInsertResult.error.message || '').includes('created_by')) {
          const retryPayload = { ...invoiceData, created_by: null };
          const retryResult = await db.insert('invoices', retryPayload);
          if (retryResult.error) throw retryResult.error;
          if (!retryResult.id) throw new Error('Failed to create invoice: no ID returned');
        } else {
          throw invoiceInsertResult.error;
        }
      }

      if (!invoiceInsertResult.id) throw new Error('Failed to create invoice: no ID returned');

      // Fetch the created invoice
      const invoiceSelectResult = await db.selectOne('invoices', invoiceInsertResult.id);
      if (invoiceSelectResult.error) throw invoiceSelectResult.error;
      if (!invoiceSelectResult.data) throw new Error('Failed to fetch created invoice');

      const invoice = invoiceSelectResult.data as any;

      // Create invoice items from proforma items
      if (proformaItems && proformaItems.length > 0) {
        const invoiceItems = proformaItems.map((item: any, index: number) => ({
          invoice_id: invoice.id,
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_percentage: item.tax_percentage,
          tax_amount: item.tax_amount,
          tax_inclusive: item.tax_inclusive,
          line_total: item.line_total,
          sort_order: item.sort_order || index + 1
        }));

        const itemsInsertResult = await db.insertMany('invoice_items', invoiceItems);
        if (itemsInsertResult.error) throw itemsInsertResult.error;

        // Create stock movements
        const stockMovements = invoiceItems
          .filter(item => item.product_id && item.quantity > 0)
          .map(item => ({
            company_id: invoice.company_id,
            product_id: item.product_id,
            movement_type: 'OUT',
            reference_type: 'INVOICE',
            reference_id: invoice.id,
            quantity: item.quantity,
            cost_per_unit: item.unit_price,
            notes: `Stock reduction for invoice ${invoice.invoice_number} (converted from proforma ${proforma.proforma_number})`
          }));

        if (stockMovements.length > 0) {
          const movementsInsertResult = await db.insertMany('stock_movements', stockMovements);
          if (movementsInsertResult.error) {
            console.warn('Failed to create stock movements:', movementsInsertResult.error);
          }
        }
      }

      // Update proforma status to converted
      const updateResult = await db.update('proforma_invoices', proformaId, { status: 'converted' });
      if (updateResult.error) {
        console.warn('Failed to update proforma status:', updateResult.error);
      }

      return invoice;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['proforma_invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
      toast.success(`Proforma invoice converted to invoice ${data.invoice_number}!`);
    },
    onError: (error) => {
      const errorMessage = serializeError(error);
      console.error('Error converting proforma to invoice:', errorMessage);
      toast.error(`Error converting proforma: ${errorMessage}`);
    },
  });
};

/**
 * Hook to update proforma status
 */
export const useUpdateProformaStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ proformaId, status, notes }: { proformaId: string; status: ProformaInvoice['status']; notes?: string }) => {
      const updateData: any = { status };

      if (notes) {
        // Append note to existing notes
        const { data: currentProforma } = await supabase
          .from('proforma_invoices')
          .select('notes')
          .eq('id', proformaId)
          .single();

        if (currentProforma?.notes) {
          updateData.notes = `${currentProforma.notes}\n[${new Date().toLocaleString()}] Status changed to ${status}: ${notes}`;
        } else {
          updateData.notes = `[${new Date().toLocaleString()}] Status changed to ${status}: ${notes}`;
        }
      }

      const { data, error } = await supabase
        .from('proforma_invoices')
        .update(updateData)
        .eq('id', proformaId)
        .select()
        .single();

      if (error) throw error;

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proforma_invoices'] });
      queryClient.invalidateQueries({ queryKey: ['proforma_invoice', variables.proformaId] });

      const statusLabels: Record<string, string> = {
        'draft': 'Draft',
        'sent': 'Sent',
        'accepted': 'Accepted',
        'expired': 'Expired',
        'converted': 'Converted to Invoice',
      };

      toast.success(`Proforma status changed to ${statusLabels[variables.status] || variables.status}`);
    },
    onError: (error) => {
      const errorMessage = serializeError(error);
      console.error('Error updating proforma status:', errorMessage);
      toast.error(`Failed to update status: ${errorMessage}`);
    },
  });
};
