/**
 * RPC Error Handler
 * Provides graceful fallbacks when Supabase RPC functions are not available
 * (which is the case when using external MySQL API)
 *
 * @deprecated Document number generation RPC functions have been replaced with API-based generation.
 * See DEPRECATION NOTES below for details on each fallback function.
 *
 * DOCUMENT NUMBER GENERATION MIGRATION:
 * - ❌ OLD: db.rpc('generate_invoice_number'), db.rpc('generate_proforma_number'), etc.
 * - ✅ NEW: generateDocumentNumberAPI() from src/utils/documentNumbering.ts
 * - 📍 Endpoint: /backend/api.php?action=get_next_document_number
 *
 * The fallback functions below are kept for reference but should NOT be used.
 * They used to be RPC function fallbacks but are now obsolete with the new API system.
 * The new generateDocumentNumberAPI() has its own robust fallback mechanism.
 */

export interface RPCCallOptions {
  functionName: string;
  fallbackValue?: any;
  onError?: (error: any) => void;
  logError?: boolean;
}

export interface RPCResult {
  data: any;
  error: Error | null;
  isRPCAvailable: boolean;
}

/**
 * Checks if an error is due to RPC function not being available
 */
export function isRPCNotAvailableError(error: any): boolean {
  if (!error) return false;

  const errorMessage = error?.message || error?.toString() || '';
  const errorCode = error?.code || '';

  return (
    errorCode === 'PGRST202' || // PostgreSQL function not found
    errorMessage.includes('function') &&
      (errorMessage.includes('does not exist') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('unknown')) ||
    errorMessage.includes('RPC') ||
    errorMessage.includes('external API')
  );
}

/**
 * Wraps an RPC call with error handling and graceful fallback
 */
export async function callRPCWithFallback(
  rpcCall: () => Promise<any>,
  options: RPCCallOptions
): Promise<RPCResult> {
  try {
    const result = await rpcCall();

    // Check if the result indicates RPC error
    if (result?.error) {
      if (isRPCNotAvailableError(result.error)) {
        console.warn(
          `⚠️ RPC function '${options.functionName}' not available (expected with external API)`
        );

        if (options.onError) {
          options.onError(result.error);
        }

        return {
          data: options.fallbackValue ?? null,
          error: result.error,
          isRPCAvailable: false
        };
      }

      // Other error - pass through
      if (options.onError) {
        options.onError(result.error);
      }

      return {
        data: null,
        error: result.error,
        isRPCAvailable: false
      };
    }

    // Success
    return {
      data: result.data,
      error: null,
      isRPCAvailable: true
    };
  } catch (error) {
    if (options.logError !== false) {
      console.warn(
        `⚠️ RPC call '${options.functionName}' failed:`,
        error
      );
    }

    if (options.onError) {
      options.onError(error);
    }

    return {
      data: options.fallbackValue ?? null,
      error: error instanceof Error ? error : new Error(String(error)),
      isRPCAvailable: false
    };
  }
}

/**
 * Fallback implementations for commonly used RPC functions
 */
export const RPCFallbacks = {
  /**
   * Fallback for generate_invoice_number
   * Returns a simple sequential number based on current date/time
   */
  generateInvoiceNumber: (companyId?: string) => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `INV-${year}${month}-${timestamp}`;
  },

  /**
   * Fallback for generate_quotation_number
   */
  generateQuotationNumber: (companyId?: string) => {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-5);
    return `QT-${year}-${timestamp}`;
  },

  /**
   * Fallback for generate_proforma_number (deprecated - use API-based generation)
   * Updated to use PRO prefix instead of PF
   */
  generateProformaNumber: (companyId?: string) => {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-5);
    return `PRO-${year}-${timestamp}`;
  },

  /**
   * Fallback for generate_credit_note_number
   */
  generateCreditNoteNumber: (companyId?: string) => {
    const timestamp = Date.now().toString().slice(-6);
    return `CN-${timestamp}`;
  },

  /**
   * Fallback for generate_payment_number
   */
  generatePaymentNumber: (companyId?: string) => {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `PAY-${year}-${timestamp}`;
  },

  /**
   * Fallback for generate_delivery_number
   */
  generateDeliveryNumber: (companyId?: string) => {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-5);
    return `DN-${year}${month}-${timestamp}`;
  },

  /**
   * Fallback for record_payment_with_allocation
   * Cannot perform actual allocation without database access
   * Should be handled by creating proper API endpoints
   */
  recordPaymentWithAllocation: () => {
    return {
      success: false,
      error: 'Payment allocation requires API endpoint implementation'
    };
  },

  /**
   * Fallback for update_product_stock
   * Stock updates should be handled by API endpoints
   */
  updateProductStock: () => {
    return {
      success: false,
      error: 'Stock updates require API endpoint implementation'
    };
  }
};

/**
 * Safe wrapper for hooks that use RPC functions
 * Prevents hook errors from crashing the component
 */
export function useSafeRPC(rpcCall: () => Promise<any>, fallback: any = null) {
  return async () => {
    try {
      const result = await rpcCall();
      return {
        data: result?.data,
        error: result?.error
      };
    } catch (error) {
      console.warn('RPC call failed, using fallback:', error);
      return {
        data: fallback,
        error: new Error('RPC not available')
      };
    }
  };
}

/**
 * Log RPC availability status for debugging
 */
export function logRPCStatus() {
  console.group('🔍 RPC Function Status');
  console.warn(
    '⚠️ Using external MySQL API at med.wayrus.co.ke'
  );
  console.warn('❌ Supabase RPC functions NOT available');
  console.warn('✅ Use API endpoints and directFileUpload.ts utilities instead');
  console.warn('📚 See RPC_REMOVAL_AND_CLEANUP_SUMMARY.md for migration guide');
  console.groupEnd();
}

// Log status on module load
if (typeof window !== 'undefined') {
  // Only log in development or when explicitly enabled
  if (import.meta.env.DEV) {
    logRPCStatus();
  }
}
