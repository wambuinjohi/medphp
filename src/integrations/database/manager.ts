/**
 * Database Manager
 * Singleton that manages database connection and adapter selection
 * Supports Supabase, MySQL, and External API providers
 */

import type { IDatabase, DatabaseConfig, DatabaseProvider } from './types';
import { SupabaseAdapter } from './supabase-adapter';
import { MySQLAdapter } from './mysql-adapter';
import { ExternalAPIAdapter } from './external-api-adapter';

class DatabaseManager {
  private adapter: IDatabase | null = null;
  private config: DatabaseConfig | null = null;
  private initialized = false;

  /**
   * Get the configured database provider
   */
  getProvider(): DatabaseProvider {
    const provider = import.meta.env.VITE_DATABASE_PROVIDER as DatabaseProvider;
    return provider || 'supabase'; // Default to Supabase for backward compatibility
  }

  /**
   * Initialize the database manager with a specific provider
   */
  async initialize(config?: Partial<DatabaseConfig>): Promise<void> {
    if (this.initialized) {
      return;
    }

    const provider = config?.provider || this.getProvider();
    
    console.log(`🔧 Initializing database with provider: ${provider}`);

    if (provider === 'mysql') {
      this.adapter = new MySQLAdapter();
      
      // Initialize MySQL connection pool if needed
      // This would typically be done on the server side
      // For client-side, MySQL operations would go through an API
    } else {
      // Default to Supabase
      this.adapter = new SupabaseAdapter();
    }

    await this.adapter.initialize();
    this.initialized = true;
    
    console.log(`✅ Database manager initialized with ${provider} adapter`);
  }

  /**
   * Get the active database adapter
   */
  getDatabase(): IDatabase {
    if (!this.adapter) {
      // Auto-initialize with default provider if not already initialized
      console.warn('Database not initialized. Using default Supabase adapter.');
      this.adapter = new SupabaseAdapter();
    }
    return this.adapter;
  }

  /**
   * Check database health
   */
  async healthCheck(): Promise<{ healthy: boolean; provider: DatabaseProvider; error?: Error }> {
    const provider = this.getProvider();
    const db = this.getDatabase();
    
    try {
      const healthy = await db.health();
      return { healthy, provider };
    } catch (error) {
      return { healthy: false, provider, error: error as Error };
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.adapter) {
      await this.adapter.close();
      this.adapter = null;
      this.initialized = false;
    }
  }

  /**
   * Reset and reinitialize with a different provider
   */
  async switchProvider(provider: DatabaseProvider): Promise<void> {
    await this.close();
    this.initialized = false;
    
    const config: DatabaseConfig = { provider };
    await this.initialize(config);
  }
}

// Export singleton instance
export const databaseManager = new DatabaseManager();

/**
 * Convenience function to get the database instance
 */
export function getDatabase(): IDatabase {
  return databaseManager.getDatabase();
}

/**
 * Convenience function to get database provider
 */
export function getDatabaseProvider(): DatabaseProvider {
  return databaseManager.getProvider();
}

/**
 * Initialize database on app startup
 */
export async function initializeDatabase(config?: Partial<DatabaseConfig>): Promise<void> {
  await databaseManager.initialize(config);
}

/**
 * Shutdown database on app exit
 */
export async function shutdownDatabase(): Promise<void> {
  await databaseManager.close();
}
