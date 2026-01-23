/**
 * Shared ExternalAPIAdapter Singleton
 * This module ensures all parts of the application use the same authenticated adapter instance
 * This solves the issue where multiple adapter instances would lose authentication state
 */

import { ExternalAPIAdapter } from './external-api-adapter';

let sharedAdapter: ExternalAPIAdapter | null = null;

/**
 * Get or create the shared ExternalAPIAdapter instance
 * All database operations should use this single instance to ensure consistent authentication
 */
export function getSharedExternalAdapter(): ExternalAPIAdapter {
  if (!sharedAdapter) {
    const apiUrl = import.meta.env.VITE_EXTERNAL_API_URL || 'https://med.wayrus.co.ke/api.php';
    sharedAdapter = new ExternalAPIAdapter(apiUrl);
    console.log('🎯 Shared ExternalAPIAdapter instance created - all DB operations will use this');
  }
  return sharedAdapter;
}

/**
 * For testing: reset the shared adapter
 */
export function resetSharedAdapter(): void {
  sharedAdapter = null;
}
