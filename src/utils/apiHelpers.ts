/**
 * API Helper Functions
 * Centralizes common patterns of supabase calls for easy migration to external API
 * These helpers abstract the underlying API call details
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Get the current authenticated user ID
 * Replaces: supabase.auth.getUser()
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch (error) {
    console.warn('Failed to get current user:', error);
    return null;
  }
}

/**
 * Get the current session
 * Replaces: supabase.auth.getSession()
 */
export async function getCurrentSession() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session || null;
  } catch (error) {
    console.warn('Failed to get session:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const userId = await getCurrentUserId();
  return !!userId;
}

/**
 * Generic query builder for database operations
 * Replaces: supabase.from(table).select().eq().maybeSingle()
 */
export async function queryOne<T>(
  table: string,
  column: string,
  value: any
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(column, value)
      .maybeSingle();
    return { data, error };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Query multiple rows
 * Replaces: supabase.from(table).select().eq()
 */
export async function queryMany<T>(
  table: string,
  filters?: Record<string, any>
): Promise<{ data: T[] | null; error: Error | null }> {
  try {
    let query = supabase.from(table).select('*');
    
    if (filters) {
      for (const [column, value] of Object.entries(filters)) {
        query = query.eq(column, value) as any;
      }
    }
    
    const { data, error } = await query;
    return { data: data as T[], error };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Insert a single record
 * Replaces: supabase.from(table).insert(data).select().single()
 */
export async function insertOne<T>(
  table: string,
  data: any
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();
    return { data: result, error };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Insert multiple records
 * Replaces: supabase.from(table).insert(dataArray).select()
 */
export async function insertMany<T>(
  table: string,
  data: any[]
): Promise<{ data: T[] | null; error: Error | null }> {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select();
    return { data: result as T[], error };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Update a single record by ID
 * Replaces: supabase.from(table).update(data).eq('id', id)
 */
export async function updateOne(
  table: string,
  id: string | number,
  data: any
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from(table)
      .update(data)
      .eq('id', id);
    return { error };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Update multiple records by filter
 * Replaces: supabase.from(table).update(data).eq(column, value)
 */
export async function updateMany(
  table: string,
  filters: Record<string, any>,
  data: any
): Promise<{ error: Error | null }> {
  try {
    let query = supabase.from(table).update(data);
    
    for (const [column, value] of Object.entries(filters)) {
      query = query.eq(column, value) as any;
    }
    
    const { error } = await query;
    return { error };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Delete a single record by ID
 * Replaces: supabase.from(table).delete().eq('id', id)
 */
export async function deleteOne(
  table: string,
  id: string | number
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    return { error };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Delete multiple records by filter
 * Replaces: supabase.from(table).delete().eq(column, value)
 */
export async function deleteMany(
  table: string,
  filters: Record<string, any>
): Promise<{ error: Error | null }> {
  try {
    let query = supabase.from(table).delete();
    
    for (const [column, value] of Object.entries(filters)) {
      query = query.eq(column, value) as any;
    }
    
    const { error } = await query;
    return { error };
  } catch (error) {
    return { error: error as Error };
  }
}

/**
 * Check if a table exists
 * Replaces: supabase.from(table).select('id').limit(1)
 */
export async function tableExists(table: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.from(table).select('id').limit(1);
    return !error && data !== null;
  } catch {
    return false;
  }
}

/**
 * Check if a record exists
 * Replaces: supabase.from(table).select('id').eq(column, value).limit(1)
 */
export async function recordExists(
  table: string,
  column: string,
  value: any
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .eq(column, value)
      .limit(1);
    return !error && data && data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Count records matching a filter
 * Replaces: supabase.from(table).select('id', { count: 'exact' })
 */
export async function countRecords(
  table: string,
  filters?: Record<string, any>
): Promise<number> {
  try {
    let query = supabase.from(table).select('id');
    
    if (filters) {
      for (const [column, value] of Object.entries(filters)) {
        query = query.eq(column, value) as any;
      }
    }
    
    const { data, error } = await query;
    return !error && data ? data.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Batch operation helper with error handling
 */
export async function batchOperation<T>(
  operations: Array<() => Promise<{ data?: T; error?: Error | null }>>,
  stopOnError: boolean = false
): Promise<{ results: any[]; errors: Error[] }> {
  const results: any[] = [];
  const errors: Error[] = [];

  for (const operation of operations) {
    try {
      const result = await operation();
      results.push(result.data);
      if (result.error && stopOnError) {
        errors.push(result.error);
        break;
      }
    } catch (error) {
      errors.push(error as Error);
      if (stopOnError) break;
    }
  }

  return { results, errors };
}

/**
 * Retry helper for transient failures
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError || new Error('Operation failed after retries');
}
