/**
 * Centralized document numbering utility
 * Provides sequential, globally unique number generation for all document types
 * Ensures consistency across the application using backend API
 */

/**
 * Document type mapping from internal names to 3-letter prefixes
 */
const DOCUMENT_TYPE_MAP: Record<string, string> = {
  'receipt': 'REC',
  'invoice': 'INV',
  'payment': 'PAY',
  'proforma': 'PRO',
  'quotation': 'QT',
  'delivery_note': 'DN',
  'credit_note': 'CN',
  'po': 'PO',
  'lpo': 'LPO',
};

/**
 * Valid document types for the API
 */
const VALID_DOCUMENT_TYPES = ['INV', 'PRO', 'QT', 'PO', 'LPO', 'DN', 'CN', 'PAY', 'REC'] as const;
export type DocumentType = typeof VALID_DOCUMENT_TYPES[number];

/**
 * Response from the document number API
 */
export interface DocumentNumberResponse {
  success: boolean;
  number?: string;
  type?: string;
  year?: number;
  sequence?: number;
  error?: string;
}

/**
 * Generate a unique document number via the backend API
 * Format: TYPE-YYYY-NNNN (e.g., INV-2026-0001)
 *
 * @param type - Document type (e.g., 'invoice', 'proforma', 'quotation')
 * @param year - Optional year (defaults to current year)
 * @returns Promise resolving to the generated document number
 */
export async function generateDocumentNumberAPI(
  type: string,
  year?: number
): Promise<string> {
  try {
    // Map internal type name to API type code
    const apiType = DOCUMENT_TYPE_MAP[type];
    if (!apiType) {
      throw new Error(`Unknown document type: ${type}`);
    }

    const currentYear = year || new Date().getFullYear();

    // Get API base URL with proper environment detection
    // This handles both local (/api.php) and cloud (external API URL) setups
    let apiUrl = '/api.php';
    try {
      const { getAPIBaseURL } = await import('./environment-detection');
      apiUrl = getAPIBaseURL();
    } catch {
      // Fallback to relative path if environment detection fails
      console.warn('Could not detect API base URL, using /api.php fallback');
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'get_next_document_number',
        type: apiType,
        year: currentYear,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.warn(`Failed to generate document number (${response.status}):`, errorData);
      // Return fallback format on API error
      return generateFallbackNumber(apiType, currentYear);
    }

    const data = await response.json() as DocumentNumberResponse;

    if (!data.success || !data.number) {
      console.warn('API returned unsuccessful response:', data);
      return generateFallbackNumber(apiType, currentYear);
    }

    return data.number;
  } catch (error) {
    console.warn('Error generating document number via API:', error);
    // Return fallback format on network/parsing error
    const apiType = DOCUMENT_TYPE_MAP[type] || type.toUpperCase().substring(0, 3);
    const currentYear = year || new Date().getFullYear();
    return generateFallbackNumber(apiType, currentYear);
  }
}

/**
 * Generate a fallback document number when API is unavailable
 * Format: TYPE-YYYY-XXXX where XXXX is random alphanumeric
 * 
 * @param type - Document type code (e.g., 'INV', 'PRO')
 * @param year - Year for the number
 * @returns Fallback number string
 */
function generateFallbackNumber(type: string, year: number): string {
  // Generate 4 random alphanumeric characters for fallback
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let random = '';
  for (let i = 0; i < 4; i++) {
    random += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${type}-${year}-${random}`;
}

/**
 * Legacy function exports for backward compatibility
 * These now use the API-based generation
 */

/**
 * @deprecated Use generateDocumentNumberAPI('receipt') instead
 */
export const generateReceiptNumber = async (companyId?: string): Promise<string> => {
  return generateDocumentNumberAPI('receipt');
};

/**
 * @deprecated Use generateDocumentNumberAPI('invoice') instead
 */
export const generateInvoiceNumber = async (companyId?: string): Promise<string> => {
  return generateDocumentNumberAPI('invoice');
};

/**
 * @deprecated Use generateDocumentNumberAPI('payment') instead
 */
export const generatePaymentNumber = async (companyId?: string): Promise<string> => {
  return generateDocumentNumberAPI('payment');
};

/**
 * @deprecated Use generateDocumentNumberAPI('proforma') instead
 */
export const generateProformaNumber = async (companyId?: string): Promise<string> => {
  return generateDocumentNumberAPI('proforma');
};

/**
 * @deprecated Use generateDocumentNumberAPI('quotation') instead
 */
export const generateQuotationNumber = async (companyId?: string): Promise<string> => {
  return generateDocumentNumberAPI('quotation');
};

/**
 * @deprecated Use generateDocumentNumberAPI('delivery_note') instead
 */
export const generateDeliveryNoteNumber = async (companyId?: string): Promise<string> => {
  return generateDocumentNumberAPI('delivery_note');
};

/**
 * @deprecated Use generateDocumentNumberAPI('credit_note') instead
 */
export const generateCreditNoteNumber = async (companyId?: string): Promise<string> => {
  return generateDocumentNumberAPI('credit_note');
};

/**
 * @deprecated Use generateDocumentNumberAPI('po') instead
 */
export const generatePONumber = async (companyId?: string): Promise<string> => {
  return generateDocumentNumberAPI('po');
};

/**
 * Type-safe document number generator (async version)
 * Usage: await generateDocumentNumber('receipt') or await generateDocumentNumber('invoice')
 * 
 * @deprecated Use generateDocumentNumberAPI instead
 */
export const generateDocumentNumber = async (
  type: 'receipt' | 'invoice' | 'payment' | 'proforma' | 'quotation' | 'delivery_note' | 'credit_note' | 'po',
  companyId?: string
): Promise<string> => {
  return generateDocumentNumberAPI(type);
};
