/**
 * useDatabase Hook
 * Provides easy access to database operations in React components
 */

import { useEffect, useState } from 'react';
import { getDatabase, getDatabaseProvider } from '@/integrations/database';
import type { IDatabase, DatabaseProvider } from '@/integrations/database';

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

  const db = getDatabase();
  const provider = getDatabaseProvider();

  useEffect(() => {
    async function checkHealth() {
      try {
        setIsLoading(true);
        const healthy = await db.health();
        setIsHealthy(healthy);
        setError(null);
      } catch (err) {
        setError(err as Error);
        setIsHealthy(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkHealth();
  }, [db]);

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

  const { db } = useDatabase();

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const result = await db.select<T>(table, filter);
        setData(result.data);
        setError(result.error);
      } catch (err) {
        setError(err as Error);
        setData([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [db, table, filter]);

  return { data, isLoading, error };
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
  const filter = companyId ? { id: companyId } : undefined;
  return useSelect('companies', filter);
}

/**
 * Hook to get customers
 * @param companyId - Optional company ID for filtering
 */
export function useCustomers(companyId?: string) {
  const filter = companyId ? { company_id: companyId } : undefined;
  return useSelect('customers', filter);
}

/**
 * Hook to get products/inventory items
 * @param companyId - Optional company ID for filtering
 */
export function useProducts(companyId?: string) {
  const filter = companyId ? { company_id: companyId } : undefined;
  return useSelect('products', filter);
}

/**
 * Hook to get quotations
 * @param companyId - Optional company ID for filtering
 */
export function useQuotations(companyId?: string) {
  const filter = companyId ? { company_id: companyId } : undefined;
  return useSelect('quotations', filter);
}

/**
 * Hook to get invoices
 * @param companyId - Optional company ID for filtering
 */
export function useInvoices(companyId?: string) {
  const filter = companyId ? { company_id: companyId } : undefined;
  return useSelect('invoices', filter);
}

/**
 * Hook to get payments
 * @param companyId - Optional company ID for filtering
 */
export function usePayments(companyId?: string) {
  const filter = companyId ? { company_id: companyId } : undefined;
  return useSelect('payments', filter);
}

/**
 * Hook to get delivery notes
 * @param companyId - Optional company ID for filtering
 */
export function useDeliveryNotes(companyId?: string) {
  const filter = companyId ? { company_id: companyId } : undefined;
  return useSelect('delivery_notes', filter);
}

/**
 * Hook to get LPOs (Local Purchase Orders)
 * @param companyId - Optional company ID for filtering
 */
export function useLPOs(companyId?: string) {
  const filter = companyId ? { company_id: companyId } : undefined;
  return useSelect('lpos', filter);
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
 * Hook for dashboard statistics
 * Returns aggregated dashboard data
 */
export function useDashboardStats() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setIsLoading(true);
        // Dashboard stats aggregation would typically be done server-side
        // For now, we'll just return null as it should be implemented based on business logic
        setStats({});
        setError(null);
      } catch (err) {
        setError(err as Error);
        setStats(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  return { data: stats, isLoading, error };
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
