/**
 * External MySQL API Adapter
 * Communicates with med.wayrus.co.ke/api.php MySQL backend
 */

import type {
  IDatabase,
  AuthContext,
  QueryResult,
  ListQueryResult,
  InsertResult,
  UpdateResult,
  DeleteResult,
} from './types';

export class ExternalAPIAdapter implements IDatabase {
  private apiBase: string;
  private authToken: string | null = null;

  constructor(apiUrl: string = import.meta.env.VITE_EXTERNAL_API_URL || 'https://med.wayrus.co.ke/api.php') {
    this.apiBase = apiUrl;
    // Load token from localStorage if available
    const storedToken = localStorage.getItem('med_api_token');
    if (storedToken) {
      this.authToken = storedToken;
    }
  }

  setAuthToken(token: string) {
    this.authToken = token;
    localStorage.setItem('med_api_token', token);
  }

  clearAuthToken() {
    this.authToken = null;
    localStorage.removeItem('med_api_token');
  }

  private async apiCall<T>(
    method: string,
    action: string,
    table?: string,
    data?: any,
    where?: any
  ): Promise<{ data: T; error: Error | null; status: number }> {
    try {
      const params = new URLSearchParams();
      params.append('action', action);
      if (table) params.append('table', table);

      // Log the API call attempt
      const logPrefix = `📡 [${method.toUpperCase()}] ${action}${table ? ` on ${table}` : ''}`;
      console.log(`${logPrefix} - Starting request to ${this.apiBase}...`);

      // For update and delete operations, backend expects 'where' parameter
      if ((action === 'update' || action === 'delete') && where && typeof where === 'object') {
        // Convert where object to SQL WHERE clause format for the backend
        // e.g., {id: 123} becomes id=123
        const whereParts: string[] = [];
        Object.entries(where).forEach(([key, value]) => {
          if (typeof value === 'string') {
            whereParts.push(`${key}='${String(value).replace(/'/g, "''")}'`);
          } else {
            whereParts.push(`${key}=${value}`);
          }
        });
        params.append('where', whereParts.join(' AND '));
      }

      const url = `${this.apiBase}?${params.toString()}`;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      // Build request body
      let body: any = null;

      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        body = data;
      }
      // For read operations, include where clause in body if not in URL
      else if ((action === 'read') && where && typeof where === 'object') {
        body = where;
      }

      // Add timeout for fetch requests
      const controller = new AbortController();
      let timeoutId: NodeJS.Timeout | null = null;
      let isTimedOut = false;

      timeoutId = setTimeout(() => {
        isTimedOut = true;
        controller.abort();
      }, 10000); // 10 second timeout

      let response: Response;
      let result: any;

      try {
        response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
          credentials: 'include', // Include credentials for CORS
        });

        if (timeoutId) clearTimeout(timeoutId);

        // Defensively parse JSON - handle cases where server returns non-JSON (e.g., 500 error)
        result = await response.json().catch(() => {
          if (!response.ok) {
            throw new Error(`Server error: HTTP ${response.status}. The API server may be experiencing issues.`);
          }
          throw new Error('Invalid response from server: Expected valid JSON');
        });
      } catch (fetchError: any) {
        if (timeoutId) clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          if (isTimedOut) {
            throw new Error(`API request timeout (${this.apiBase}). The server may be unresponsive.`);
          } else {
            // Signal was aborted for another reason (e.g., component unmount)
            throw new Error(`API request was cancelled. Please try again.`);
          }
        }

        // Network errors - provide detailed diagnostics
        if (fetchError instanceof TypeError) {
          const errorMessage = fetchError.message || '';

          // Check if this might be a CORS error (very common with cross-origin requests)
          if (errorMessage.includes('Failed to fetch') || errorMessage.includes('fetch')) {
            console.error(`❌ Network Error for ${action} on ${table || 'API'}:`, errorMessage);
            console.error(`API Endpoint: ${this.apiBase}`);
            console.error('🔍 Troubleshooting:');
            console.error('1. CORS Issue (Most Common):');
            console.error('   - Backend needs: Access-Control-Allow-Origin header');
            console.error('   - Backend needs to allow methods: GET, POST, PUT, DELETE, OPTIONS');
            console.error('2. Network/Connectivity:');
            console.error('   - Check if API endpoint is reachable');
            console.error('   - Verify internet connection');
            console.error('3. Firewall/Proxy:');
            console.error('   - Check if network firewall blocks requests');
            console.error('   - Check if corporate proxy is interfering');

            throw new Error(`Unable to reach API: ${this.apiBase}. This is commonly a CORS issue. Please ensure the backend has proper CORS headers configured. Error: ${errorMessage}`);
          }

          throw new Error(`Network error: ${errorMessage}`);
        }

        throw fetchError;
      }

      if (!response.ok) {
        const errorMsg = result.message || `HTTP ${response.status}`;
        console.warn(`${logPrefix} - HTTP Error ${response.status}: ${errorMsg}`);
        return {
          data: null as any,
          error: new Error(errorMsg),
          status: response.status,
        };
      }

      console.log(`${logPrefix} - Success (${response.status})`);
      return { data: result.data || result, error: null, status: response.status };
    } catch (error) {
      return {
        data: null as any,
        error: error as Error,
        status: 500,
      };
    }
  }

  async login(email: string, password: string): Promise<{ token: string; user: any; error: Error | null }> {
    try {
      console.log(`🔐 Attempting login with external API: ${this.apiBase}?action=login`);

      const loginUrl = `${this.apiBase}?action=login`;

      try {
        const response = await fetch(loginUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include', // Include cookies for CORS
        });

        // Defensively parse JSON
        const result = await response.json().catch(() => {
          if (!response.ok) {
            throw new Error(`Server error: HTTP ${response.status}. The API server may be experiencing issues.`);
          }
          throw new Error('Invalid response from server: Expected valid JSON');
        });
        console.log('📝 Login response status:', response.status, 'Result:', result);

        if (!response.ok || result.status === 'error') {
          const errorMsg = result.message || result.error || `Login failed with status ${response.status}`;
          console.error('❌ Login error:', errorMsg);
          return {
            token: '',
            user: null,
            error: new Error(errorMsg),
          };
        }

        if (result.token) {
          this.setAuthToken(result.token);
          console.log('✅ Token stored successfully');

          // Store user info in localStorage for consistent access
          if (result.user && result.user.id) {
            localStorage.setItem('med_api_user_id', result.user.id);
            localStorage.setItem('med_api_user_email', email);
            console.log('✅ User info stored:', { id: result.user.id, email });
          }
        }

        return {
          token: result.token || '',
          user: result.user,
          error: null,
        };
      } catch (fetchError: any) {
        // Enhanced error handling for login-specific issues
        if (fetchError instanceof TypeError && fetchError.message.includes('Failed to fetch')) {
          console.error('❌ Login failed - Network/CORS error:');
          console.error('API Endpoint:', loginUrl);
          console.error('This is likely a CORS issue.');
          console.error('💡 Solution: Backend needs to configure CORS headers:');
          console.error('   Access-Control-Allow-Origin: * (or specific domain)');
          console.error('   Access-Control-Allow-Methods: POST, OPTIONS');
          console.error('   Access-Control-Allow-Headers: Content-Type');

          return {
            token: '',
            user: null,
            error: new Error(`Unable to connect to login endpoint: ${loginUrl}. This is likely a CORS issue. Please check the browser console for details.`),
          };
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('❌ Login exception:', error);
      return {
        token: '',
        user: null,
        error: error as Error,
      };
    }
  }

  async logout(): Promise<{ error: Error | null }> {
    try {
      const response = await fetch(`${this.apiBase}?action=logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        // Defensively parse JSON
        const result = await response.json().catch(() => ({}));
        return { error: new Error(result.message || 'Logout failed') };
      }

      this.clearAuthToken();

      // Also clear user info from localStorage
      localStorage.removeItem('med_api_user_id');
      localStorage.removeItem('med_api_user_email');

      return { error: null };
    } catch (error) {
      // Clear tokens even if logout fails
      this.clearAuthToken();
      localStorage.removeItem('med_api_user_id');
      localStorage.removeItem('med_api_user_email');

      return { error: error as Error };
    }
  }

  async checkAuth(): Promise<{ user: any; error: Error | null }> {
    try {
      const controller = new AbortController();
      let timeoutId: NodeJS.Timeout | null = null;
      let isTimedOut = false;

      timeoutId = setTimeout(() => {
        isTimedOut = true;
        controller.abort();
      }, 10000); // 10 second timeout

      try {
        const response = await fetch(`${this.apiBase}?action=check_auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: this.authToken }),
          signal: controller.signal,
        });

        if (timeoutId) clearTimeout(timeoutId);

        // Defensively parse JSON
        const result = await response.json().catch(() => {
          if (!response.ok) {
            throw new Error(`Server error: HTTP ${response.status}. Authentication check failed.`);
          }
          throw new Error('Invalid response from server: Expected valid JSON');
        });

        if (!response.ok) {
          this.clearAuthToken();
          return {
            user: null,
            error: new Error(result.message || 'Not authenticated'),
          };
        }

        return { user: result, error: null };
      } catch (fetchError: any) {
        if (timeoutId) clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          if (isTimedOut) {
            return {
              user: null,
              error: new Error(`Authentication check timeout. The server may be unresponsive.`),
            };
          } else {
            return {
              user: null,
              error: new Error(`Authentication check was cancelled.`),
            };
          }
        }

        if (fetchError instanceof TypeError && fetchError.message === 'Failed to fetch') {
          return {
            user: null,
            error: new Error(`Unable to reach authentication endpoint: ${this.apiBase}. Check your connection.`),
          };
        }

        throw fetchError;
      }
    } catch (error) {
      return { user: null, error: error as Error };
    }
  }

  async getAuthContext(userId: string): Promise<AuthContext | null> {
    // For external API, auth context is simpler
    const { user, error } = await this.checkAuth();
    if (error || !user) return null;

    return {
      user_id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  async select<T>(table: string, filter?: Record<string, any>): Promise<ListQueryResult<T>> {
    try {
      const { data, error } = await this.apiCall('POST', 'read', table, null, filter);

      if (error) {
        return { data: [], error, count: 0 };
      }

      const rows = Array.isArray(data) ? data : [];
      return {
        data: rows,
        error: null,
        count: rows.length,
      };
    } catch (error) {
      return { data: [], error: error as Error, count: 0 };
    }
  }

  async selectOne<T>(table: string, id: string): Promise<QueryResult<T>> {
    try {
      const { data, error } = await this.apiCall('POST', 'read', table, null, { id });

      if (error) {
        return { data: null, error };
      }

      const rows = Array.isArray(data) ? data : [];
      return { data: rows[0] || null, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async selectBy<T>(table: string, filter: Record<string, any>): Promise<ListQueryResult<T>> {
    return this.select<T>(table, filter);
  }

  async insert<T>(table: string, data: Partial<T>): Promise<InsertResult> {
    try {
      const { data: result, error } = await this.apiCall('POST', 'create', table, data);

      if (error) {
        return { id: '', error };
      }

      return { id: result?.id || '', error: null };
    } catch (error) {
      return { id: '', error: error as Error };
    }
  }

  async insertMany<T>(table: string, data: Partial<T>[]): Promise<InsertResult> {
    try {
      // For bulk insert, we'll insert each record and track the first ID
      let firstId = '';
      for (const record of data) {
        const { data: result, error } = await this.apiCall('POST', 'create', table, record);
        if (!error && result?.id && !firstId) {
          firstId = result.id;
        }
      }

      return { id: firstId, error: null };
    } catch (error) {
      return { id: '', error: error as Error };
    }
  }

  async update<T>(table: string, id: string, data: Partial<T>): Promise<UpdateResult> {
    try {
      const { error } = await this.apiCall('PUT', 'update', table, data, { id });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async updateMany<T>(table: string, filter: Record<string, any>, data: Partial<T>): Promise<UpdateResult> {
    try {
      // External API requires updating one by one
      // First get all matching records
      const { data: records, error: selectError } = await this.select(table, filter);
      if (selectError) {
        return { error: selectError };
      }

      // Update each record
      for (const record of records as any[]) {
        await this.update(table, record.id, data);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async delete(table: string, id: string): Promise<DeleteResult> {
    try {
      const { error } = await this.apiCall('DELETE', 'delete', table, null, { id });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async deleteMany(table: string, filter: Record<string, any>): Promise<DeleteResult> {
    try {
      // Get matching records first
      const { data: records, error: selectError } = await this.select(table, filter);
      if (selectError) {
        return { error: selectError };
      }

      // Delete each record
      for (const record of records as any[]) {
        await this.delete(table, record.id);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async raw<T>(sql: string, params?: any[]): Promise<ListQueryResult<T>> {
    try {
      const response = await fetch(`${this.apiBase}?action=raw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, params }),
      });

      // Defensively parse JSON
      const result = await response.json().catch(() => {
        if (!response.ok) {
          throw new Error(`Server error: HTTP ${response.status}. Query execution failed.`);
        }
        throw new Error('Invalid response from server: Expected valid JSON');
      });

      if (!response.ok) {
        return {
          data: [],
          error: new Error(result.message || 'Query failed'),
        };
      }

      const rows = Array.isArray(result.data) ? result.data : [];
      return { data: rows, error: null };
    } catch (error) {
      return { data: [], error: error as Error };
    }
  }

  async rpc<T>(functionName: string, params?: Record<string, any>): Promise<{ data: T | null; error: Error | null }> {
    try {
      const response = await fetch(`${this.apiBase}?action=rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ function: functionName, params: params || {} }),
      });

      // Defensively parse JSON
      const result = await response.json().catch(() => {
        if (!response.ok) {
          throw new Error(`Server error: HTTP ${response.status}. RPC call failed.`);
        }
        throw new Error('Invalid response from server: Expected valid JSON');
      });

      if (!response.ok) {
        return {
          data: null,
          error: new Error(result.message || `RPC call to ${functionName} failed`),
        };
      }

      return { data: result.data || result, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async rpcList<T>(functionName: string, params?: Record<string, any>): Promise<{ data: T[]; error: Error | null; count?: number }> {
    try {
      const response = await fetch(`${this.apiBase}?action=rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ function: functionName, params: params || {} }),
      });

      // Defensively parse JSON
      const result = await response.json().catch(() => {
        if (!response.ok) {
          throw new Error(`Server error: HTTP ${response.status}. RPC call failed.`);
        }
        throw new Error('Invalid response from server: Expected valid JSON');
      });

      if (!response.ok) {
        return {
          data: [],
          error: new Error(result.message || `RPC call to ${functionName} failed`),
        };
      }

      const data = Array.isArray(result.data) ? result.data : [];
      return { data, error: null, count: data.length };
    } catch (error) {
      return { data: [], error: error as Error };
    }
  }

  async canRead(table: string, recordId: string, auth: AuthContext): Promise<boolean> {
    // Simple authorization - admin can read everything
    // Users can only read their own records or public records
    if (auth?.role === 'admin') {
      return true;
    }

    // For now, allow all authenticated users to read
    // This should be enhanced based on actual business logic
    return !!auth?.user_id;
  }

  async canWrite(table: string, recordId: string | null, companyId: string, auth: AuthContext): Promise<boolean> {
    // Only admins can write for now
    return auth?.role === 'admin';
  }

  async canDelete(table: string, recordId: string, auth: AuthContext): Promise<boolean> {
    // Only admins can delete
    return auth?.role === 'admin';
  }

  async transaction<T>(callback: (db: IDatabase) => Promise<T>): Promise<T> {
    // External API transactions handled server-side
    return callback(this);
  }

  async initialize(): Promise<void> {
    console.log('✅ External API adapter initialized for:', this.apiBase);
    // Verify connection
    const { error } = await this.checkAuth().catch(() => ({ error: new Error('Not authenticated yet') }));
    if (error) {
      console.warn('⚠️  API not yet authenticated. Login required.');
    }
  }

  async close(): Promise<void> {
    console.log('External API adapter closed');
  }

  async health(): Promise<boolean> {
    try {
      const controller = new AbortController();
      let timeoutId: NodeJS.Timeout | null = null;
      let isTimedOut = false;

      timeoutId = setTimeout(() => {
        isTimedOut = true;
        controller.abort();
      }, 5000); // 5 second timeout for health check

      try {
        const response = await fetch(`${this.apiBase}?action=health`, {
          method: 'GET',
          signal: controller.signal,
          credentials: 'include',
        });

        if (timeoutId) clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn(`🔗 External API health check returned HTTP ${response.status}:`, this.apiBase);
          return false;
        }

        console.log('✅ External API health check passed:', this.apiBase);
        return true;
      } catch (fetchError: any) {
        if (timeoutId) clearTimeout(timeoutId);

        if (fetchError.name === 'AbortError') {
          if (isTimedOut) {
            console.warn('⏱️  External API health check timeout (5s):', this.apiBase);
            console.warn('💡 The server may be slow or unresponsive. Check your connection and API endpoint.');
          } else {
            console.warn('🔗 External API health check was cancelled:', this.apiBase);
          }
          return false;
        }

        // Handle all TypeError cases (network errors, CORS issues, etc.)
        if (fetchError instanceof TypeError) {
          const errorMessage = fetchError.message || '';
          if (errorMessage.includes('Failed to fetch')) {
            console.warn('🔗 Failed to fetch from External API:', this.apiBase);
            console.warn('💡 Common causes:');
            console.warn('   1. CORS: Backend needs Access-Control-Allow-Origin headers');
            console.warn('   2. Network: Check if the API endpoint is reachable');
            console.warn('   3. DNS: Verify the domain can be resolved');
            console.warn('   4. Firewall: Check if your network blocks external requests');
            return false;
          }
          console.warn('🔗 External API fetch error:', this.apiBase, errorMessage);
          return false;
        }

        // For any other error type, return false instead of throwing
        console.warn('🔗 External API health check error:', this.apiBase, fetchError);
        return false;
      }
    } catch (error) {
      console.warn('🔗 External API health check failed:', error);
      return false;
    }
  }
}

export const externalApiAdapter = new ExternalAPIAdapter();
