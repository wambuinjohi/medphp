/**
 * useDatabase Hook
 * Provides easy access to database operations in React components
 */

import { useEffect, useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getDatabase, getDatabaseProvider } from '@/integrations/database';
import type { IDatabase, DatabaseProvider } from '@/integrations/database';
import { useForceTaxSettings } from '@/hooks/useForceTaxSettings';

let errorToastShown = false;

interface UseDatabaseReturn {
  db: IDatabase;
  provider: DatabaseProvider;
  isHealthy: boolean;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to get database instance and provider
 * @returns Database instance, provider name, health status, and loading state
 */
export function useDatabase(): UseDatabaseReturn {
  const [isHealthy, setIsHealthy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastHealthCheckTime, setLastHealthCheckTime] = useState(0);

  const db = getDatabase();
  const provider = getDatabaseProvider();

  useEffect(() => {
    // Health checks have been disabled to prevent AbortError issues
    // The app will rely on real operations to detect API issues
    setIsHealthy(true);
    setIsLoading(false);
    setError(null);
  }, [db, provider]);

  return {
    db,
    provider,
    isHealthy,
    isLoading,
    error,
  };
}

/**
 * Hook to select data from a table
 * @param table - Table name
 * @param filter - Optional filter conditions
 * @returns Data, loading state, and error
 */
export function useSelect<T>(table: string, filter?: Record<string, any>) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  const { db, isHealthy } = useDatabase();

  useEffect(() => {
    let isMounted = true;
    let timeoutHandle: NodeJS.Timeout | null = null;

    async function fetchData() {
      try {
        if (isMounted) {
          setIsLoading(true);
          setLoadingTimeout(false);
        }

        // Set a 12-second timeout for the request (longer than API's 10s timeout)
        timeoutHandle = setTimeout(() => {
          if (isMounted) {
            setLoadingTimeout(true);
            setIsLoading(false);
          }
        }, 12000);

        const result = await db.select<T>(table, filter);

        if (timeoutHandle) clearTimeout(timeoutHandle);

        if (isMounted) {
          setData(result.data);
          setError(result.error);
          setLoadingTimeout(false);

          // Clear retry count on successful fetch
          if (!result.error) {
            setRetryCount(0);
          }
        }
      } catch (err) {
        if (timeoutHandle) clearTimeout(timeoutHandle);

        const error = err as Error;
        console.error(`Error fetching from ${table}:`, error);

        if (isMounted) {
          setError(error);
          setData([]);
          setLoadingTimeout(false);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    // Try to fetch on initial load or when explicitly retried
    fetchData();

    return () => {
      isMounted = false;
      if (timeoutHandle) clearTimeout(timeoutHandle);
    };
  }, [db, table, filter, retryCount]);

  const retry = () => {
    setRetryCount(prev => prev + 1);
  };

  return { data, isLoading, error, retry, loadingTimeout };
}

/**
 * Hook to select a single record
 * @param table - Table name
 * @param id - Record ID
 * @returns Record data, loading state, and error
 */
export function useSelectOne<T>(table: string, id: string) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { db } = useDatabase();

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const result = await db.selectOne<T>(table, id);
        setData(result.data);
        setError(result.error);
      } catch (err) {
        setError(err as Error);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      fetchData();
    }
  }, [db, table, id]);

  return { data, isLoading, error };
}

/**
 * Hook to insert a record
 * @returns Insert function and mutation state
 */
export function useInsert<T>(table: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { db } = useDatabase();

  const insert = async (data: Partial<T>) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await db.insert<T>(table, data);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { insert, isLoading, error };
}

/**
 * Hook to update a record
 * @returns Update function and mutation state
 */
export function useUpdate<T>(table: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { db } = useDatabase();

  const update = async (id: string, data: Partial<T>) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await db.update<T>(table, id, data);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { update, isLoading, error };
}

/**
 * Hook to delete a record
 * @returns Delete function and mutation state
 */
export function useDelete(table: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { db } = useDatabase();

  const delete_ = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await db.delete(table, id);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return { delete: delete_, isLoading, error };
}

// ============================================
// Table-specific hooks
// ============================================

/**
 * Hook to get companies
 * @param companyId - Optional company ID for filtering
 */
export function useCompanies(companyId?: string) {
  const filter = useMemo(() =>
    companyId ? { id: companyId } : undefined,
    [companyId]
  );
  return useSelect('companies', filter);
}

/**
 * Hook to get customers
 * @param companyId - Optional company ID for filtering
 */
export function useCustomers(companyId?: string) {
  const filter = useMemo(() =>
    companyId ? { company_id: companyId } : undefined,
    [companyId]
  );
  return useSelect('customers', filter);
}

/**
 * Hook to get products/inventory items
 * @param companyId - Optional company ID for filtering
 */
export function useProducts(companyId?: string) {
  const { provider } = useDatabase();
  const filter = useMemo(() =>
    companyId ? { company_id: companyId } : undefined,
    [companyId]
  );

  const { data: rawData, isLoading, error, retry, loadingTimeout } = useSelect('products', filter);

  // Normalize field names for external API vs Supabase
  const data = useMemo(() => {
    if (!rawData || rawData.length === 0) return rawData;

    return rawData.map((product: any) => {
      if (provider === 'external-api') {
        // Map external API fields to standard names
        return {
          ...product,
          product_code: product.sku || product.product_code,
          selling_price: product.unit_price || product.selling_price,
          minimum_stock_level: product.reorder_level || product.minimum_stock_level,
          // Keep original fields too for compatibility
          sku: product.sku,
          unit_price: product.unit_price,
          reorder_level: product.reorder_level
        };
      }
      return product;
    });
  }, [rawData, provider]);

  return { data, isLoading, error, retry, loadingTimeout };
}

/**
 * Hook to create a new product
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  return useMutation({
    mutationFn: async (productData: any) => {
      const result = await db.insert('products', productData);
      if (result.error) throw result.error;

      // Fetch the created record to return full data
      const { data } = await db.selectOne('products', result.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product created successfully!');
    },
    onError: (error: any) => {
      console.error('Error creating product:', error);
      const message = error?.message || 'Failed to create product';
      toast.error(message);
    },
  });
}

/**
 * Hook to update a product
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const result = await db.update('products', id, data);
      if (result.error) throw result.error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product updated successfully!');
    },
    onError: (error: any) => {
      console.error('Error updating product:', error);
      const message = error?.message || 'Failed to update product';
      toast.error(message);
    },
  });
}

/**
 * Hook to get units of measure
 * @param companyId - Optional company ID for filtering
 */
export function useUnitsOfMeasure(companyId?: string) {
  const filter = companyId ? { company_id: companyId } : undefined;
  return useSelect('units_of_measure', filter);
}

/**
 * Hook to create a new unit of measure
 */
export function useCreateUnitOfMeasure() {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  return useMutation({
    mutationFn: async (uomData: any) => {
      const result = await db.insert('units_of_measure', uomData);
      if (result.error) throw result.error;

      // Fetch the created record
      const { data } = await db.selectOne('units_of_measure', result.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units_of_measure'] });
      toast.success('Unit of measure created successfully!');
    },
    onError: (error: any) => {
      console.error('Error creating unit of measure:', error);
      const message = error?.message || 'Failed to create unit of measure';
      toast.error(message);
    },
  });
}

/**
 * Hook to get quotations
 * @param companyId - Optional company ID for filtering
 */
export function useQuotations(companyId?: string) {
  const filter = useMemo(() =>
    companyId ? { company_id: companyId } : undefined,
    [companyId]
  );
  return useSelect('quotations', filter);
}

/**
 * Hook to get invoices
 * @param companyId - Optional company ID for filtering
 */
export function useInvoices(companyId?: string) {
  const filter = useMemo(() =>
    companyId ? { company_id: companyId } : undefined,
    [companyId]
  );
  return useSelect('invoices', filter);
}

/**
 * Hook to get payments
 * @param companyId - Optional company ID for filtering
 */
export function usePayments(companyId?: string) {
  const filter = useMemo(() =>
    companyId ? { company_id: companyId } : undefined,
    [companyId]
  );
  return useSelect('payments', filter);
}

/**
 * Hook to get delivery notes
 * @param companyId - Optional company ID for filtering
 */
export function useDeliveryNotes(companyId?: string) {
  const filter = useMemo(() =>
    companyId ? { company_id: companyId } : undefined,
    [companyId]
  );
  return useSelect('delivery_notes', filter);
}

/**
 * Hook to get LPOs (Local Purchase Orders)
 * @param companyId - Optional company ID for filtering
 */
export function useLPOs(companyId?: string) {
  const filter = useMemo(() =>
    companyId ? { company_id: companyId } : undefined,
    [companyId]
  );
  return useSelect('lpos', filter);
}

/**
 * Hook to create a new LPO
 */
export function useCreateLPO() {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  return useMutation({
    mutationFn: async (lpoData: any) => {
      const result = await db.insert('lpos', lpoData);
      if (result.error) throw result.error;

      // Fetch the created record
      const { data } = await db.selectOne('lpos', result.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lpos'] });
      toast.success('LPO created successfully!');
    },
    onError: (error: any) => {
      console.error('Error creating LPO:', error);
      const message = error?.message || 'Failed to create LPO';
      toast.error(message);
    },
  });
}

/**
 * Hook to generate an LPO number
 */
export function useGenerateLPONumber() {
  return useGenerateDocumentNumber();
}

/**
 * Hook to get all suppliers and customers
 */
export function useAllSuppliersAndCustomers(companyId?: string) {
  const filter = useMemo(() =>
    companyId ? { company_id: companyId } : undefined,
    [companyId]
  );
  return useSelect('customers', filter);
}

/**
 * Hook to get all suppliers
 * @param companyId - Optional company ID for filtering
 */
export function useSuppliers(companyId?: string) {
  const filter = companyId ? { company_id: companyId } : undefined;
  return useSelect('suppliers', filter);
}

/**
 * Hook to create a new supplier
 */
export function useCreateSupplier() {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  return useMutation({
    mutationFn: async (supplierData: any) => {
      const result = await db.insert('suppliers', supplierData);
      if (result.error) throw result.error;

      // Fetch the created record
      const { data } = await db.selectOne('suppliers', result.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier created successfully!');
    },
    onError: (error: any) => {
      console.error('Error creating supplier:', error);
      const message = error?.message || 'Failed to create supplier';
      toast.error(message);
    },
  });
}

/**
 * Hook to update a supplier
 */
export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: any }) => {
      const result = await db.update('suppliers', String(id), data);
      if (result.error) throw result.error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier updated successfully!');
    },
    onError: (error: any) => {
      console.error('Error updating supplier:', error);
      const message = error?.message || 'Failed to update supplier';
      toast.error(message);
    },
  });
}

/**
 * Hook to delete a supplier
 */
export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  return useMutation({
    mutationFn: async (id: string | number) => {
      const result = await db.delete('suppliers', String(id));
      if (result.error) throw result.error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Error deleting supplier:', error);
      const message = error?.message || 'Failed to delete supplier';
      toast.error(message);
    },
  });
}

/**
 * Hook to update an LPO with items
 */
export function useUpdateLPOWithItems() {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const result = await db.update('lpos', id, data);
      if (result.error) throw result.error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lpos'] });
      toast.success('LPO updated successfully!');
    },
    onError: (error: any) => {
      console.error('Error updating LPO:', error);
      const message = error?.message || 'Failed to update LPO';
      toast.error(message);
    },
  });
}

/**
 * Hook to get stock movements
 * @param companyId - Optional company ID for filtering
 */
export function useStockMovements(companyId?: string) {
  const filter = companyId ? { company_id: companyId } : undefined;
  return useSelect('stock_movements', filter);
}

/**
 * Hook to get remittance advice
 * @param companyId - Optional company ID for filtering
 */
export function useRemittanceAdvice(companyId?: string) {
  const filter = companyId ? { company_id: companyId } : undefined;
  return useSelect('remittance_advice', filter);
}

/**
 * Hook to create a new remittance advice
 */
export function useCreateRemittanceAdvice() {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  return useMutation({
    mutationFn: async (remittanceData: any) => {
      const result = await db.insert('remittance_advice', remittanceData);
      if (result.error) throw result.error;

      // Fetch the created record
      const { data } = await db.selectOne('remittance_advice', result.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remittance_advice'] });
      toast.success('Remittance advice created successfully!');
    },
    onError: (error: any) => {
      console.error('Error creating remittance advice:', error);
      const message = error?.message || 'Failed to create remittance advice';
      toast.error(message);
    },
  });
}

/**
 * Hook to update remittance advice
 */
export function useUpdateRemittanceAdvice() {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const result = await db.update('remittance_advice', String(id), data);
      if (result.error) throw result.error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remittance_advice'] });
      toast.success('Remittance advice updated successfully!');
    },
    onError: (error: any) => {
      console.error('Error updating remittance advice:', error);
      const message = error?.message || 'Failed to update remittance advice';
      toast.error(message);
    },
  });
}

/**
 * Hook to update remittance advice items
 */
export function useUpdateRemittanceAdviceItems() {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const result = await db.update('remittance_advice_items', String(id), data);
      if (result.error) throw result.error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remittance_advice_items'] });
      toast.success('Remittance advice items updated successfully!');
    },
    onError: (error: any) => {
      console.error('Error updating remittance advice items:', error);
      const message = error?.message || 'Failed to update remittance advice items';
      toast.error(message);
    },
  });
}

/**
 * Hook to create a new customer
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  return useMutation({
    mutationFn: async (customerData: any) => {
      const result = await db.insert('customers', customerData);
      if (result.error) throw result.error;

      // Fetch the created record to return full data
      const { data } = await db.selectOne('customers', result.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created successfully!');
    },
    onError: (error: any) => {
      console.error('Error creating customer:', error);
      const message = error?.message || 'Failed to create customer';
      toast.error(message);
    },
  });
}

/**
 * Hook to get invoices for a specific customer
 * @param customerId - Customer ID
 */
export function useCustomerInvoices(customerId?: string) {
  const filter = customerId ? { customer_id: customerId } : undefined;
  return useSelect('invoices', filter);
}

/**
 * Hook to get payments for a specific customer
 * @param customerId - Customer ID
 */
export function useCustomerPayments(customerId?: string) {
  const filter = customerId ? { customer_id: customerId } : undefined;
  return useSelect('payments', filter);
}

/**
 * Hook to delete a customer
 */
export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  return useMutation({
    mutationFn: async (customerId: string) => {
      const result = await db.delete('customers', customerId);
      if (result.error) throw result.error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Error deleting customer:', error);
      const message = error?.message || 'Failed to delete customer';
      toast.error(message);
    },
  });
}

/**
 * Hook to update a customer
 */
export function useUpdateCustomer() {
  return useUpdate('customers');
}

/**
 * Hook to update a delivery note
 */
export function useUpdateDeliveryNote() {
  return useUpdate('delivery_notes');
}

/**
 * Hook to update an LPO
 */
export function useUpdateLPO() {
  return useUpdate('lpos');
}

/**
 * Hook to delete a payment
 */
export function useDeletePayment() {
  return useDelete('payments');
}

/**
 * Hook to delete an LPO
 */
export function useDeleteLPO() {
  return useDelete('lpos');
}

/**
 * Hook to get payment methods
 * @param companyId - Optional company ID for filtering
 */
export function usePaymentMethods(companyId?: string) {
  const filter = useMemo(() =>
    companyId ? { company_id: companyId } : undefined,
    [companyId]
  );
  return useSelect('payment_methods', filter);
}

/**
 * Hook to create a new payment method
 */
export function useCreatePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentMethod: {
      code: string;
      name: string;
      description?: string;
      company_id?: string;
      icon_name?: string;
    }) => {
      const { data, error } = await supabase
        .from('payment_methods')
        .insert(paymentMethod)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      toast.success('Payment method created successfully!');
    },
    onError: (error: any) => {
      console.error('Error creating payment method:', error);
      toast.error('Failed to create payment method. Please try again.');
    },
  });
}

/**
 * Hook to update a payment method
 */
export function useUpdatePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string | number; data: any }) => {
      const { data: result, error } = await supabase
        .from('payment_methods')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      toast.success('Payment method updated successfully!');
    },
    onError: (error: any) => {
      console.error('Error updating payment method:', error);
      toast.error('Failed to update payment method. Please try again.');
    },
  });
}

/**
 * Hook to delete a payment method
 */
export function useDeletePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string | number) => {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      toast.success('Payment method deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Error deleting payment method:', error);
      toast.error('Failed to delete payment method. Please try again.');
    },
  });
}

/**
 * Hook to create a payment
 * Attempts to use server-side RPC if available, falls back to client-side insertion
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
        // Try to use the server-side RPC function for atomic payment + allocation
        const db = getDatabase();
        const { data, error } = await db.rpc('record_payment_with_allocation', {
          p_company_id: paymentRecord.company_id,
          p_customer_id: paymentRecord.customer_id,
          p_invoice_id: paymentRecord.invoice_id,
          p_payment_number: paymentRecord.payment_number,
          p_payment_date: paymentRecord.payment_date,
          p_amount: paymentRecord.amount,
          p_payment_method: paymentRecord.payment_method,
          p_reference_number: paymentRecord.reference_number || paymentRecord.payment_number,
          p_notes: paymentRecord.notes || null
        });

        if (error) {
          throw error;
        }

        return {
          success: true,
          fallback_used: false,
          allocation_failed: false,
          data
        };
      } catch (rpcError: any) {
        console.warn('RPC function record_payment_with_allocation not available, using fallback:', rpcError?.message);

        // Fallback: Insert payment directly
        try {
          const { data: paymentData, error: insertError } = await supabase
            .from('payments')
            .insert(paymentRecord)
            .select()
            .single();

          if (insertError) {
            throw insertError;
          }

          // Try to create payment allocation
          let allocation_failed = false;
          try {
            // Check if payment_allocations table exists
            const { error: allocError } = await supabase
              .from('payment_allocations')
              .insert({
                payment_id: paymentData.id,
                invoice_id: paymentRecord.invoice_id,
                allocated_amount: paymentRecord.amount,
                allocation_date: paymentRecord.payment_date,
              })
              .select()
              .single();

            if (allocError) {
              console.warn('Failed to create payment allocation:', allocError?.message);
              allocation_failed = true;
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
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['paymentAllocations'] });

      if (!result.fallback_used) {
        toast.success('Payment recorded successfully!');
      }
    },
    onError: (error: any) => {
      console.error('Error creating payment:', error);
      const errorMessage = error?.message || 'Failed to record payment. Please try again.';
      toast.error(errorMessage);
    },
  });
}

/**
 * Hook to update an existing payment
 * Updates payment details and recalculates invoice balances if amount changed
 */
export function useUpdatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      paymentId,
      paymentData,
      oldAmount
    }: {
      paymentId: string;
      paymentData: {
        amount: number;
        payment_date: string;
        payment_method: string;
        reference_number?: string;
        notes?: string;
      };
      oldAmount: number;
    }) => {
      // 1. Get payment allocations to know which invoices to update
      const { data: allocations, error: allocError } = await supabase
        .from('payment_allocations')
        .select('invoice_id, allocated_amount')
        .eq('payment_id', paymentId);

      if (allocError) {
        console.warn('Could not fetch payment allocations:', allocError?.message);
      }

      // 2. Update the payment record
      const { data: updatedPayment, error: updateError } = await supabase
        .from('payments')
        .update({
          amount: paymentData.amount,
          payment_date: paymentData.payment_date,
          payment_method: paymentData.payment_method,
          reference_number: paymentData.reference_number,
          notes: paymentData.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // 3. If amount changed, update invoice balances
      if (Math.abs(oldAmount - paymentData.amount) > 0.01 && allocations && allocations.length > 0) {
        const amountDifference = paymentData.amount - oldAmount;

        for (const allocation of allocations) {
          try {
            // Get current invoice data
            const { data: invoice, error: invoiceError } = await supabase
              .from('invoices')
              .select('id, total_amount, paid_amount, balance_due, status')
              .eq('id', allocation.invoice_id)
              .single();

            if (invoiceError) {
              console.warn(`Could not fetch invoice ${allocation.invoice_id}:`, invoiceError?.message);
              continue;
            }

            // Calculate new amounts
            const newPaidAmount = (invoice.paid_amount || 0) + amountDifference;
            const newBalanceDue = invoice.total_amount - newPaidAmount;

            // Determine new status with tolerance for floating-point precision
            let newStatus = invoice.status || 'draft';
            const tolerance = 0.01;

            if (Math.abs(newBalanceDue) < tolerance) {
              newStatus = 'paid';
            } else if (newPaidAmount > tolerance) {
              newStatus = 'partial';
            } else {
              newStatus = 'draft';
            }

            // Update invoice
            const { error: invoiceUpdateError } = await supabase
              .from('invoices')
              .update({
                paid_amount: Math.max(0, newPaidAmount),
                balance_due: Math.max(0, newBalanceDue),
                status: newStatus,
                updated_at: new Date().toISOString()
              })
              .eq('id', allocation.invoice_id);

            if (invoiceUpdateError) {
              console.warn(`Could not update invoice ${allocation.invoice_id}:`, invoiceUpdateError?.message);
            }
          } catch (error: any) {
            console.warn(`Error updating invoice ${allocation.invoice_id}:`, error?.message);
          }
        }
      }

      return updatedPayment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['customer_invoices'] });
      queryClient.invalidateQueries({ queryKey: ['paymentAllocations'] });
    },
    onError: (error: any) => {
      console.error('Error updating payment:', error);
      const errorMessage = error?.message || 'Failed to update payment. Please try again.';
      toast.error(errorMessage);
    },
  });
}

/**
 * Hook to create a credit note for overpayments
 */
export function useCreateOverpaymentCreditNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (overpaymentData: {
      invoice_id: string;
      company_id: string;
      customer_id?: string | null;
      overpayment_amount: number;
      payment_date: string;
      payment_reference: string;
    }) => {
      try {
        // Generate credit note number
        const db = getDatabase();
        const { data: creditNoteNumber, error: numberError } = await db.rpc<string>(
          'generate_credit_note_number',
          { company_uuid: overpaymentData.company_id }
        );

        if (numberError) {
          console.warn('Failed to generate credit note number via RPC, using fallback');
          // Fallback generation
          const timestamp = Date.now().toString().slice(-6);
          const year = new Date().getFullYear();
          var finalCreditNoteNumber = `CN-${year}-${timestamp}`;
        } else {
          var finalCreditNoteNumber = creditNoteNumber as string;
        }

        // Create the credit note
        const creditNoteRecord = {
          company_id: overpaymentData.company_id,
          customer_id: overpaymentData.customer_id || null,
          invoice_id: overpaymentData.invoice_id,
          credit_note_number: finalCreditNoteNumber,
          credit_note_date: overpaymentData.payment_date,
          status: 'draft' as const,
          reason: 'Overpayment from payment',
          subtotal: overpaymentData.overpayment_amount,
          tax_amount: 0,
          total_amount: overpaymentData.overpayment_amount,
          applied_amount: 0,
          balance: overpaymentData.overpayment_amount,
          affects_inventory: false,
          notes: `Overpayment credit note for payment reference: ${overpaymentData.payment_reference}`
        };

        const { data: creditNote, error: createError } = await supabase
          .from('credit_notes')
          .insert(creditNoteRecord)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        return {
          success: true,
          credit_note_number: finalCreditNoteNumber,
          credit_note_id: creditNote.id
        };
      } catch (error: any) {
        console.error('Error creating overpayment credit note:', error);
        throw error;
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
      queryClient.invalidateQueries({ queryKey: ['customerCreditNotes'] });
    },
    onError: (error: any) => {
      console.error('Error creating overpayment credit note:', error);
      throw error;
    },
  });
}

/**
 * Hook for dashboard statistics
 * Returns aggregated dashboard data based on company
 * @param companyId - Optional company ID to filter stats by
 */
export function useDashboardStats(companyId?: string) {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all required data
  const { data: invoices, error: invoicesError } = useInvoices(companyId);
  const { data: payments, error: paymentsError } = usePayments(companyId);
  const { data: customers, error: customersError } = useCustomers(companyId);
  const { data: products, error: productsError } = useProducts(companyId);

  // Determine if we're still loading any of the data
  const isAnyLoading = false; // We'll just check if data exists

  useEffect(() => {
    // Helper function to safely convert to number
    const toNumber = (value: any): number => {
      const num = Number(value);
      return isNaN(num) ? 0 : num;
    };

    // Calculate aggregated statistics from the fetched data
    const totalRevenue = (invoices || [])
      .filter((inv: any) => inv.status !== 'cancelled')
      .reduce((sum: number, inv: any) => sum + toNumber(inv.total_amount), 0);

    const totalInvoices = (invoices || [])
      .filter((inv: any) => inv.status !== 'cancelled')
      .length;

    const pendingInvoices = (invoices || [])
      .filter((inv: any) => inv.status === 'pending' || inv.status === 'draft')
      .length;

    const customerCount = (customers || []).length;

    const productCount = (products || []).length;

    const lowStockProducts = (products || [])
      .filter((prod: any) => toNumber(prod.stock_quantity) < (toNumber(prod.reorder_level) || 10))
      .length;

    const totalPayments = (payments || [])
      .reduce((sum: number, payment: any) => sum + toNumber(payment.amount), 0);

    const calculatedStats = {
      totalRevenue,
      totalInvoices,
      customerCount,
      productCount,
      lowStockProducts,
      totalPayments,
      pendingInvoices,
    };

    setStats(calculatedStats);

    // Only set error if we have one AND we have no data to display
    const anyError = invoicesError || paymentsError || customersError || productsError;
    if (anyError && !invoices && !payments && !customers && !products) {
      setError(anyError as Error);
    } else {
      setError(null);
    }

    setIsLoading(false);
  }, [invoices, payments, customers, products]);

  return { data: stats, isLoading, error };
}

// ============================================
// Company Settings Hooks
// ============================================

/**
 * Hook to create a new company
 */
export function useCreateCompany() {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  return useMutation({
    mutationFn: async (companyData: any) => {
      const result = await db.insert('companies', companyData);
      if (result.error) throw result.error;

      // Fetch the created record
      const { data } = await db.selectOne('companies', result.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company created successfully!');
    },
    onError: (error: any) => {
      console.error('Error creating company:', error);
      const message = error?.message || 'Failed to create company';
      toast.error(message);
    },
  });
}

/**
 * Hook to update a company
 */
export function useUpdateCompany() {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const result = await db.update('companies', id, data);
      if (result.error) throw result.error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company updated successfully!');
    },
    onError: (error: any) => {
      console.error('Error updating company:', error);
      const message = error?.message || 'Failed to update company';
      toast.error(message);
    },
  });
}

// ============================================
// Tax Settings Hook
// ============================================

/**
 * Hook to get tax settings for a company
 * @param companyId - Company ID
 * @returns Tax settings data, loading state, and error
 */
export function useTaxSettings(companyId?: string) {
  return useForceTaxSettings(companyId);
}

/**
 * Hook to create a new tax setting
 */
export function useCreateTaxSetting() {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  return useMutation({
    mutationFn: async (taxSettingData: any) => {
      const result = await db.insert('tax_settings', taxSettingData);
      if (result.error) throw result.error;

      // Fetch the created record
      const { data } = await db.selectOne('tax_settings', result.id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax_settings'] });
      toast.success('Tax setting created successfully!');
    },
    onError: (error: any) => {
      console.error('Error creating tax setting:', error);
      const message = error?.message || 'Failed to create tax setting';
      toast.error(message);
    },
  });
}

/**
 * Hook to update a tax setting
 */
export function useUpdateTaxSetting() {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const result = await db.update('tax_settings', id, data);
      if (result.error) throw result.error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax_settings'] });
      toast.success('Tax setting updated successfully!');
    },
    onError: (error: any) => {
      console.error('Error updating tax setting:', error);
      const message = error?.message || 'Failed to update tax setting';
      toast.error(message);
    },
  });
}

/**
 * Hook to delete a tax setting
 */
export function useDeleteTaxSetting() {
  const queryClient = useQueryClient();
  const { db } = useDatabase();

  return useMutation({
    mutationFn: async (taxSettingId: string) => {
      const result = await db.delete('tax_settings', taxSettingId);
      if (result.error) throw result.error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax_settings'] });
      toast.success('Tax setting deleted successfully!');
    },
    onError: (error: any) => {
      console.error('Error deleting tax setting:', error);
      const message = error?.message || 'Failed to delete tax setting';
      toast.error(message);
    },
  });
}

// ============================================
// Document Number Generation Hook
// ============================================

/**
 * Hook to generate document numbers (invoice, proforma, credit note, etc.)
 * @returns Mutation function that takes { companyId, type } and generates appropriate number
 */
export function useGenerateDocumentNumber() {
  return useMutation({
    mutationFn: async ({
      companyId,
      type = 'invoice'
    }: {
      companyId: string;
      type?: 'invoice' | 'proforma' | 'credit_note' | 'lpo' | 'delivery_note' | 'quotation';
    }) => {
      try {
        // Map document type to the appropriate RPC function
        const rpcFunctionMap: Record<string, string> = {
          invoice: 'generate_invoice_number',
          proforma: 'generate_proforma_number',
          credit_note: 'generate_credit_note_number',
          lpo: 'generate_lpo_number',
          delivery_note: 'generate_delivery_note_number',
          quotation: 'generate_quotation_number',
        };

        const rpcFunction = rpcFunctionMap[type] || 'generate_invoice_number';
        const db = getDatabase();

        const { data, error } = await db.rpc<string>(rpcFunction, {
          company_uuid: companyId
        });

        if (error) {
          throw error;
        }

        return data as string;
      } catch (error) {
        // Fallback to client-side generation
        const timestamp = Date.now().toString().slice(-6);
        const year = new Date().getFullYear();
        const typePrefix = type.toUpperCase().substring(0, 2);
        const fallbackNumber = `${typePrefix}-${year}-${timestamp}`;

        console.warn(`Document number generation (${type}) failed, using fallback:`, fallbackNumber);
        return fallbackNumber;
      }
    },
  });
}

// ============================================
// Audit Logs Hook
// ============================================

/**
 * Hook to get audit logs for a company
 * @param companyId - Company ID (optional, uses current company if not provided)
 * @returns Audit logs data, loading state, and error
 */
export function useAuditLogs(companyId?: string) {
  const filter = useMemo(() => {
    if (!companyId) return undefined;
    return { company_id: companyId };
  }, [companyId]);

  return useSelect('audit_logs', filter);
}

// ============================================
// Transport Management Hooks
// ============================================

/**
 * Hook to get drivers for a company
 */
export function useDrivers(companyId?: string) {
  const filter = useMemo(() => {
    if (!companyId) return undefined;
    return { company_id: companyId };
  }, [companyId]);

  return useSelect('drivers', filter);
}

/**
 * Hook to create a driver
 */
export function useCreateDriver() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: {
      name: string;
      phone?: string;
      license_number?: string;
      status: 'active' | 'inactive';
      company_id: string;
    }) => {
      const db = getDatabase();
      const { data, error } = await db.insert('drivers', formData);

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create driver');
    },
  });
}

/**
 * Hook to update a driver
 */
export function useUpdateDriver() {
  return useUpdate('drivers');
}

/**
 * Hook to delete a driver
 */
export function useDeleteDriver() {
  return useDelete('drivers');
}

/**
 * Hook to get vehicles for a company
 */
export function useVehicles(companyId?: string) {
  const filter = useMemo(() => {
    if (!companyId) return undefined;
    return { company_id: companyId };
  }, [companyId]);

  return useSelect('vehicles', filter);
}

/**
 * Hook to create a vehicle
 */
export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: {
      vehicle_number: string;
      vehicle_type?: string;
      capacity?: number;
      status: 'active' | 'inactive' | 'maintenance';
      company_id: string;
    }) => {
      const db = getDatabase();
      const { data, error } = await db.insert('vehicles', formData);

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create vehicle');
    },
  });
}

/**
 * Hook to update a vehicle
 */
export function useUpdateVehicle() {
  return useUpdate('vehicles');
}

/**
 * Hook to delete a vehicle
 */
export function useDeleteVehicle() {
  return useDelete('vehicles');
}

/**
 * Hook to get materials for a company
 */
export function useMaterials(companyId?: string) {
  const filter = useMemo(() => {
    if (!companyId) return undefined;
    return { company_id: companyId };
  }, [companyId]);

  return useSelect('materials', filter);
}

/**
 * Hook to create a material
 */
export function useCreateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: {
      name: string;
      description?: string;
      unit?: string;
      status: 'active' | 'inactive';
      company_id: string;
    }) => {
      const db = getDatabase();
      const { data, error } = await db.insert('materials', formData);

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create material');
    },
  });
}

/**
 * Hook to update a material
 */
export function useUpdateMaterial() {
  return useUpdate('materials');
}

/**
 * Hook to delete a material
 */
export function useDeleteMaterial() {
  return useDelete('materials');
}

/**
 * Hook to get transport finance records for a company
 */
export function useTransportFinance(companyId?: string) {
  const filter = useMemo(() => {
    if (!companyId) return undefined;
    return { company_id: companyId };
  }, [companyId]);

  return useSelect('transport_finance', filter);
}

/**
 * Hook to create a transport finance record
 */
export function useCreateTransportFinance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: {
      vehicle_id: string;
      material_id: string;
      buying_price: number;
      fuel_cost: number;
      driver_fees: number;
      other_expenses: number;
      selling_price: number;
      profit_loss: number;
      payment_status: 'paid' | 'unpaid' | 'pending';
      customer_name?: string;
      date: string;
      company_id: string;
    }) => {
      const db = getDatabase();
      const { data, error } = await db.insert('transport_finance', formData);

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport_finance'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create finance record');
    },
  });
}

/**
 * Hook to update a transport finance record
 */
export function useUpdateTransportFinance() {
  return useUpdate('transport_finance');
}

/**
 * Hook to delete a transport finance record
 */
export function useDeleteTransportFinance() {
  return useDelete('transport_finance');
}

/**
 * Hook to fetch transport payments for a trip
 */
export function useTransportPayments(tripId?: string) {
  const filter = useMemo(() => {
    if (!tripId) return undefined;
    return { trip_id: tripId };
  }, [tripId]);

  return useSelect('transport_payments', filter);
}

/**
 * Hook to fetch transport payments summary by company
 */
export function useTransportPaymentsSummary(companyId?: string) {
  const filter = useMemo(() => {
    if (!companyId) return undefined;
    return { company_id: companyId };
  }, [companyId]);

  return useSelect('transport_payments_summary', filter);
}

/**
 * Hook to create a transport payment
 */
export function useCreateTransportPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: {
      company_id: string;
      trip_id: string;
      payment_amount: number;
      payment_date: string;
      payment_method: 'cash' | 'check' | 'bank_transfer' | 'mobile_money' | 'card' | 'other';
      reference_number?: string;
      notes?: string;
      recorded_by?: string;
    }) => {
      const db = getDatabase();
      const { data, error } = await db.insert('transport_payments', formData);

      if (error) {
        throw error;
      }

      // Update transport_finance payment_status based on total paid vs selling_price
      const { data: tripData } = await db.selectOne('transport_finance', { id: formData.trip_id });
      if (tripData) {
        const { data: paymentsData } = await db.select('transport_payments', { trip_id: formData.trip_id });
        const totalPaid = (paymentsData || []).reduce((sum: number, p: any) => sum + (p.payment_amount || 0), 0);

        let newPaymentStatus: 'paid' | 'unpaid' | 'pending' = 'unpaid';
        if (totalPaid >= (tripData.selling_price || 0)) {
          newPaymentStatus = 'paid';
        } else if (totalPaid > 0) {
          newPaymentStatus = 'pending';
        }

        // Update trip payment status if it changed
        if (newPaymentStatus !== tripData.payment_status) {
          await db.update('transport_finance', { id: formData.trip_id }, { payment_status: newPaymentStatus });
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport_payments'] });
      queryClient.invalidateQueries({ queryKey: ['transport_finance'] });
      queryClient.invalidateQueries({ queryKey: ['transport_payments_summary'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create payment');
    },
  });
}

/**
 * Hook to update a transport payment
 */
export function useUpdateTransportPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formData: { id: string; [key: string]: any }) => {
      const db = getDatabase();
      const { id, ...updateData } = formData;
      const { data, error } = await db.update('transport_payments', { id }, updateData);

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport_payments'] });
      queryClient.invalidateQueries({ queryKey: ['transport_finance'] });
      queryClient.invalidateQueries({ queryKey: ['transport_payments_summary'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update payment');
    },
  });
}

/**
 * Hook to delete a transport payment
 */
export function useDeleteTransportPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const db = getDatabase();
      const { data, error } = await db.delete('transport_payments', { id });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport_payments'] });
      queryClient.invalidateQueries({ queryKey: ['transport_finance'] });
      queryClient.invalidateQueries({ queryKey: ['transport_payments_summary'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to delete payment');
    },
  });
}

// ============================================
// Types for export
// ============================================

export interface DeliveryNote {
  id?: string;
  [key: string]: any;
}

export interface Invoice {
  id?: string;
  [key: string]: any;
}

export interface Customer {
  id?: string;
  [key: string]: any;
}

export interface Company {
  id?: string;
  [key: string]: any;
}
