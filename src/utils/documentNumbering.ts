/**
 * Centralized document numbering utility
 * Provides consistent number generation for all document types
 * Ensures uniqueness and format consistency across the application
 */

/**
 * Generate a unique receipt number in format: REC-XXXXXX where XXXXXX is timestamp + random
 * @param companyId - Company ID (for future multi-company number sequences)
 * @returns Receipt number string
 */
export const generateReceiptNumber = (companyId?: string): string => {
  const timestamp = Date.now().toString();
  // Use MD5-style hash for better uniqueness than simple random
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `REC-${timestamp.slice(-6)}${randomPart}`;
};

/**
 * Generate a unique invoice number in format: INV-XXXXXXXX where XXXXXXXX is timestamp
 * @param companyId - Company ID (for future multi-company invoice number sequences)
 * @returns Invoice number string
 */
export const generateInvoiceNumber = (companyId?: string): string => {
  return `INV-${Date.now()}`;
};

/**
 * Generate a unique payment number in format: PAY-XXXXXXXX where XXXXXXXX is timestamp
 * @param companyId - Company ID (for future multi-company payment number sequences)
 * @returns Payment number string
 */
export const generatePaymentNumber = (companyId?: string): string => {
  return `PAY-${Date.now()}`;
};

/**
 * Generate a unique proforma invoice number in format: PROFORMA-XXXXXXXX
 * @param companyId - Company ID
 * @returns Proforma invoice number string
 */
export const generateProformaNumber = (companyId?: string): string => {
  return `PROFORMA-${Date.now()}`;
};

/**
 * Generate a unique quotation number in format: QT-XXXXXXXX
 * @param companyId - Company ID
 * @returns Quotation number string
 */
export const generateQuotationNumber = (companyId?: string): string => {
  return `QT-${Date.now()}`;
};

/**
 * Generate a unique delivery note number in format: DN-XXXXXXXX
 * @param companyId - Company ID
 * @returns Delivery note number string
 */
export const generateDeliveryNoteNumber = (companyId?: string): string => {
  return `DN-${Date.now()}`;
};

/**
 * Generate a unique credit note number in format: CN-XXXXXXXX
 * @param companyId - Company ID
 * @returns Credit note number string
 */
export const generateCreditNoteNumber = (companyId?: string): string => {
  return `CN-${Date.now()}`;
};

/**
 * Generate a unique PO (Purchase Order) number in format: PO-XXXXXXXX
 * @param companyId - Company ID
 * @returns PO number string
 */
export const generatePONumber = (companyId?: string): string => {
  return `PO-${Date.now()}`;
};

/**
 * Type-safe document number generator
 * Usage: generateDocumentNumber('receipt') or generateDocumentNumber('invoice')
 */
export const generateDocumentNumber = (
  type: 'receipt' | 'invoice' | 'payment' | 'proforma' | 'quotation' | 'delivery_note' | 'credit_note' | 'po',
  companyId?: string
): string => {
  switch (type) {
    case 'receipt':
      return generateReceiptNumber(companyId);
    case 'invoice':
      return generateInvoiceNumber(companyId);
    case 'payment':
      return generatePaymentNumber(companyId);
    case 'proforma':
      return generateProformaNumber(companyId);
    case 'quotation':
      return generateQuotationNumber(companyId);
    case 'delivery_note':
      return generateDeliveryNoteNumber(companyId);
    case 'credit_note':
      return generateCreditNoteNumber(companyId);
    case 'po':
      return generatePONumber(companyId);
    default:
      throw new Error(`Unknown document type: ${type}`);
  }
};
