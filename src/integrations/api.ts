/**
 * Unified API Client
 * Direct integration with https://med.wayrus.co.ke/api.php
 * Replaces all Supabase calls
 */

import { ExternalAPIAdapter } from './database/external-api-adapter';

// Create a singleton instance
const apiAdapter = new ExternalAPIAdapter();

export const api = {
  /**
   * Authentication methods
   */
  auth: {
    login: (email: string, password: string) => apiAdapter.login(email, password),
    logout: () => apiAdapter.logout(),
    checkAuth: () => apiAdapter.checkAuth(),
    getAuthToken: () => localStorage.getItem('med_api_token'),
    setAuthToken: (token: string) => apiAdapter.setAuthToken(token),
    clearAuthToken: () => apiAdapter.clearAuthToken(),
  },

  /**
   * Database query methods
   */
  from: (table: string) => ({
    select: async (fields?: string) => {
      // For now, we fetch all and return
      const result = await apiAdapter.select(table);
      return { data: result.data, error: result.error };
    },
    selectOne: async (id: string) => {
      const result = await apiAdapter.selectOne(table, id);
      return { data: result.data, error: result.error };
    },
    selectBy: async (filter: Record<string, any>) => {
      const result = await apiAdapter.selectBy(table, filter);
      return { data: result.data, error: result.error };
    },
    insert: async (data: any) => {
      const result = await apiAdapter.insert(table, data);
      return { data: result, error: result.error };
    },
    update: async (id: string, data: any) => {
      const result = await apiAdapter.update(table, id, data);
      return { data: null, error: result.error };
    },
    delete: async (id: string) => {
      const result = await apiAdapter.delete(table, id);
      return { data: null, error: result.error };
    },
  }),

  /**
   * Direct adapter access for advanced queries
   */
  adapter: apiAdapter,
};

// Helper to build filters from chainable calls
export class QueryBuilder {
  private table: string;
  private filters: Record<string, any> = {};
  private selectFields: string = '*';

  constructor(table: string) {
    this.table = table;
  }

  select(fields?: string) {
    if (fields) this.selectFields = fields;
    return this;
  }

  eq(column: string, value: any) {
    this.filters[column] = value;
    return this;
  }

  in(column: string, values: any[]) {
    this.filters[`${column}_in`] = values;
    return this;
  }

  gt(column: string, value: any) {
    this.filters[`${column}_gt`] = value;
    return this;
  }

  lt(column: string, value: any) {
    this.filters[`${column}_lt`] = value;
    return this;
  }

  gte(column: string, value: any) {
    this.filters[`${column}_gte`] = value;
    return this;
  }

  lte(column: string, value: any) {
    this.filters[`${column}_lte`] = value;
    return this;
  }

  like(column: string, pattern: string) {
    this.filters[`${column}_like`] = pattern;
    return this;
  }

  order(column: string, direction: 'asc' | 'desc' = 'asc') {
    this.filters[`_order`] = { column, direction };
    return this;
  }

  limit(count: number) {
    this.filters[`_limit`] = count;
    return this;
  }

  async single() {
    const result = await apiAdapter.selectBy(this.table, this.filters);
    const data = Array.isArray(result.data) ? result.data[0] || null : result.data;
    return { data, error: result.error };
  }

  async maybeSingle() {
    const result = await apiAdapter.selectBy(this.table, this.filters);
    const data = Array.isArray(result.data) ? result.data[0] || null : result.data || null;
    return { data, error: result.error };
  }

  async execute() {
    const result = await apiAdapter.selectBy(this.table, this.filters);
    return { data: result.data, error: result.error };
  }
}

export const apiClient = {
  /**
   * Chainable query builder
   * Usage: apiClient.query('table').select().eq('id', 1).single()
   */
  query: (table: string) => new QueryBuilder(table),

  /**
   * Direct methods
   */
  select: async (table: string, filter?: Record<string, any>) => {
    const result = await apiAdapter.selectBy(table, filter || {});
    return { data: result.data, error: result.error };
  },

  selectOne: async (table: string, id: string) => {
    const result = await apiAdapter.selectOne(table, id);
    return { data: result.data, error: result.error };
  },

  insert: async (table: string, data: any) => {
    const result = await apiAdapter.insert(table, data);
    return { data: result.id, error: result.error };
  },

  insertMany: async (table: string, data: any[]) => {
    const result = await apiAdapter.insertMany(table, data);
    return { data: result.id, error: result.error };
  },

  update: async (table: string, id: string, data: any) => {
    const result = await apiAdapter.update(table, id, data);
    return { data: null, error: result.error };
  },

  updateMany: async (table: string, filter: Record<string, any>, data: any) => {
    const result = await apiAdapter.updateMany(table, filter, data);
    return { data: null, error: result.error };
  },

  delete: async (table: string, id: string) => {
    const result = await apiAdapter.delete(table, id);
    return { data: null, error: result.error };
  },

  deleteMany: async (table: string, filter: Record<string, any>) => {
    const result = await apiAdapter.deleteMany(table, filter);
    return { data: null, error: result.error };
  },

  /**
   * Authentication
   */
  auth: {
    login: (email: string, password: string) => apiAdapter.login(email, password),
    logout: () => apiAdapter.logout(),
    checkAuth: () => apiAdapter.checkAuth(),
    getToken: () => localStorage.getItem('med_api_token'),
    setToken: (token: string) => apiAdapter.setAuthToken(token),
    clearToken: () => apiAdapter.clearAuthToken(),
    getSession: async () => {
      const token = localStorage.getItem('med_api_token');
      const userId = localStorage.getItem('med_api_user_id');
      const email = localStorage.getItem('med_api_user_email');

      if (token && userId) {
        return {
          session: {
            user: { id: userId, email },
            access_token: token,
          },
        };
      }
      return { session: null };
    },
  },
};

/**
 * Backward-compatible Supabase-like interface
 * This allows existing code to work with minimal changes
 */
export const supabaseCompat = {
  from: (table: string) => ({
    select: (fields?: string) => ({
      eq: (column: string, value: any) => ({
        maybeSingle: async () => {
          const result = await apiAdapter.selectBy(table, { [column]: value });
          const data = Array.isArray(result.data) ? result.data[0] || null : result.data;
          return { data, error: result.error };
        },
        single: async () => {
          const result = await apiAdapter.selectBy(table, { [column]: value });
          const data = Array.isArray(result.data) ? result.data[0] || null : result.data;
          return { data, error: result.error };
        },
        execute: async () => {
          const result = await apiAdapter.selectBy(table, { [column]: value });
          return { data: result.data, error: result.error };
        },
      }),
      order: (column: string, opts?: any) => ({
        limit: (count: number) => ({
          maybeSingle: async () => {
            const result = await apiAdapter.selectBy(table, {});
            const data = Array.isArray(result.data) ? result.data[0] || null : result.data;
            return { data, error: result.error };
          },
          execute: async () => {
            const result = await apiAdapter.selectBy(table, {});
            return { data: result.data, error: result.error };
          },
        }),
      }),
      limit: (count: number) => ({
        maybeSingle: async () => {
          const result = await apiAdapter.selectBy(table, {});
          const data = Array.isArray(result.data) ? result.data[0] || null : result.data;
          return { data, error: result.error };
        },
      }),
    }),
    insert: (data: any) => ({
      select: () => ({
        single: async () => {
          const result = await apiAdapter.insert(table, data);
          return { data: result.id, error: result.error };
        },
      }),
    }),
    update: (data: any) => ({
      eq: (column: string, value: any) => ({
        select: async () => {
          const result = await apiAdapter.update(table, String(value), data);
          return { data: null, error: result.error };
        },
        execute: async () => {
          const result = await apiAdapter.update(table, String(value), data);
          return { data: null, error: result.error };
        },
      }),
    }),
    delete: () => ({
      eq: (column: string, value: any) => ({
        execute: async () => {
          const result = await apiAdapter.delete(table, String(value));
          return { data: null, error: result.error };
        },
      }),
    }),
  }),

  auth: {
    getSession: async () => {
      const token = localStorage.getItem('med_api_token');
      const userId = localStorage.getItem('med_api_user_id');
      if (token && userId) {
        return {
          data: {
            session: {
              user: { id: userId },
              access_token: token,
            },
          },
        };
      }
      return { data: { session: null } };
    },

    signInWithPassword: async (credentials: { email: string; password: string }) => {
      const result = await apiAdapter.login(credentials.email, credentials.password);
      if (result.error) {
        return { error: result.error, data: null };
      }
      return {
        data: {
          session: {
            user: result.user,
            access_token: result.token,
          },
          user: result.user,
        },
        error: null,
      };
    },

    signUp: async (params: any) => {
      return {
        error: new Error('Sign up not supported - use admin invitation'),
        data: null,
      };
    },

    signOut: async () => {
      const result = await apiAdapter.logout();
      return { error: result.error };
    },

    getUser: async () => {
      const userId = localStorage.getItem('med_api_user_id');
      if (userId) {
        return {
          data: {
            user: { id: userId },
          },
        };
      }
      return { data: { user: null } };
    },

    onAuthStateChange: (callback: any) => {
      const handleStorageChange = () => {
        const token = localStorage.getItem('med_api_token');
        const userId = localStorage.getItem('med_api_user_id');
        if (token && userId) {
          callback('SIGNED_IN', {
            user: { id: userId },
            access_token: token,
          });
        } else {
          callback('SIGNED_OUT', null);
        }
      };
      window.addEventListener('storage', handleStorageChange);
      return {
        data: {
          subscription: {
            unsubscribe: () => window.removeEventListener('storage', handleStorageChange),
          },
        },
      };
    },

    resetPasswordForEmail: async (email: string) => {
      return {
        error: new Error('Password reset not supported'),
        data: null,
      };
    },
  },
};

export default apiClient;
