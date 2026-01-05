/**
 * ADD CURRENCY COLUMN - DISABLED
 * 
 * This module attempted to alter table schema using Supabase RPC,
 * which is not available with external MySQL API.
 * 
 * To add currency support:
 * 1. Modify PHP backend code
 * 2. Use MySQL ALTER TABLE commands directly
 * 3. Implement custom API endpoint for schema modifications
 */

export async function addCurrencyColumn() {
  console.warn('⚠️ addCurrencyColumn is disabled');
  return {
    success: false,
    message: 'Please execute SQL directly or ask backend administrator'
  };
}
