/**
 * Database Client - External API Only
 * This file now exclusively uses the external API (med.wayrus.co.ke/api.php)
 * All Supabase dependencies have been removed
 */

import { ExternalAPIAdapter } from '../database/external-api-adapter';

// Force external API provider - no longer supporting Supabase
const DATABASE_PROVIDER = 'external-api';
const EXTERNAL_API_URL = import.meta.env.VITE_EXTERNAL_API_URL || 'https://med.wayrus.co.ke/api.php';

console.log(`✅ Using external API provider: ${EXTERNAL_API_URL}`);

// Initialize the external API adapter
let adapterInstance: ExternalAPIAdapter | null = null;

function getExternalAPIAdapter(): ExternalAPIAdapter {
  if (adapterInstance) {
    return adapterInstance;
  }

  adapterInstance = new ExternalAPIAdapter(EXTERNAL_API_URL);
  console.log('✅ External API adapter initialized');

  return adapterInstance;
}

/**
 * Mock Supabase-like interface for backward compatibility
 * Maps to external API calls
 */
function createCompatibilityClient() {
  const adapter = getExternalAPIAdapter();

  return {
    auth: {
      onAuthStateChange: (callback: any) => {
        // Listen to localStorage changes for auth state
        const handleStorageChange = () => {
          const token = localStorage.getItem('med_api_token');
          if (token) {
            callback('SIGNED_IN', {
              user: {
                id: localStorage.getItem('med_api_user_id') || '',
                email: localStorage.getItem('med_api_user_email') || '',
              },
            });
          } else {
            callback('SIGNED_OUT', { user: null });
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

      getSession: async () => {
        const token = localStorage.getItem('med_api_token');
        if (token) {
          return {
            data: {
              session: {
                user: {
                  id: localStorage.getItem('med_api_user_id') || '',
                  email: localStorage.getItem('med_api_user_email') || '',
                },
                access_token: token,
              },
            },
          };
        }
        return { data: { session: null } };
      },

      signInWithPassword: async ({ email, password }: any) => {
        // Use external API auth
        const response = await fetch(`${EXTERNAL_API_URL}?action=login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (!response.ok || result.status === 'error') {
          return { error: new Error(result.message || 'Login failed'), data: null };
        }

        // Store token and user info
        const token = result.token;
        const user = result.user;

        if (token) {
          localStorage.setItem('med_api_token', token);
          localStorage.setItem('med_api_user_id', user?.id || '');
          localStorage.setItem('med_api_user_email', user?.email || '');
          adapter.setAuthToken(token);

          return {
            data: {
              user: user || { id: '', email: '' },
              session: { access_token: token, user },
            },
          };
        }

        return { error: new Error('No token received'), data: null };
      },

      signUp: async ({ email, password }: any) => {
        // Use external API to create user
        const response = await fetch(`${EXTERNAL_API_URL}?action=signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const result = await response.json();

        if (!response.ok || result.status === 'error') {
          return { error: new Error(result.message || 'Sign up failed'), data: null };
        }

        return {
          data: {
            user: result.user,
            session: result.session,
          },
        };
      },

      signOut: async () => {
        // Clear auth tokens from localStorage
        localStorage.removeItem('med_api_token');
        localStorage.removeItem('med_api_user_id');
        localStorage.removeItem('med_api_user_email');
        adapter.clearAuthToken();

        return { error: null };
      },

      admin: {
        createUser: async () => {
          throw new Error('Admin operations not supported in client. Use server API.');
        },
        listUsers: async () => {
          throw new Error('Admin operations not supported in client. Use server API.');
        },
        resetUserPassword: async () => {
          throw new Error('Admin operations not supported in client. Use server API.');
        },
      },
    },

    from: (table: string) => ({
      select: async (fields: string = '*') => {
        try {
          const result = await adapter.list(table);
          return { data: result, error: null };
        } catch (error) {
          return { error: error as Error };
        }
      },

      insert: async (data: any) => {
        try {
          const result = await adapter.insert(table, data);
          return { data: result, error: null };
        } catch (error) {
          return { error: error as Error };
        }
      },

      update: async (data: any) => {
        try {
          const result = await adapter.update(table, data);
          return { data: result, error: null };
        } catch (error) {
          return { error: error as Error };
        }
      },

      delete: async () => {
        try {
          const result = await adapter.delete(table);
          return { data: result, error: null };
        } catch (error) {
          return { error: error as Error };
        }
      },

      eq: (column: string, value: any) => ({
        single: async () => {
          try {
            const result = await adapter.readOne(table, { [column]: value });
            return { data: result, error: null };
          } catch (error) {
            return { error: error as Error };
          }
        },
      }),

      match: async (filters: any) => {
        try {
          const result = await adapter.list(table, filters);
          return { data: result, error: null };
        } catch (error) {
          return { error: error as Error };
        }
      },

      range: () => ({ data: [], error: null }),
    }),

    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: File) => {
          return { error: new Error('Storage not supported') };
        },
        download: async (path: string) => {
          return { error: new Error('Storage not supported') };
        },
        getPublicUrl: (path: string) => {
          return { data: { publicUrl: '' }, error: null };
        },
      }),
    },
  };
}

// Export the compatibility client
export const supabase = createCompatibilityClient();

// Also export adapter for direct use
export const externalAPIAdapter = getExternalAPIAdapter();
