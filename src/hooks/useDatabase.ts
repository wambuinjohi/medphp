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
