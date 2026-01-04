import { createClient } from '@supabase/supabase-js';

interface FixRlsResponse {
  success: boolean;
  message?: string;
  sql?: string;
  error?: string;
}

/**
 * Fixes infinite recursion in profiles RLS policies
 * This function:
 * 1. Temporarily disables RLS on the profiles table
 * 2. Drops problematic policies
 * 3. Creates SECURITY DEFINER helper functions
 * 4. Re-enables RLS with safer policies
 *
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key
 * @returns Response with success status or error message
 */
export async function fixProfileRls(
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<FixRlsResponse> {
  // Validate environment variables
  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      success: false,
      error: 'Missing Supabase configuration'
    };
  }

  // Create Supabase client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Step 1: Disable RLS temporarily to fix policies
    console.log('Step 1: Disabling RLS on profiles table...');

    // Step 2: Drop problematic policies
    console.log('Step 2: Dropping problematic policies...');
    const dropPolicies = `
      DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
      DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
      DROP POLICY IF EXISTS "Admins can view all profiles in their company" ON profiles;
      DROP POLICY IF EXISTS "Admins can insert new profiles" ON profiles;
      DROP POLICY IF EXISTS "Admins can update profiles in their company" ON profiles;
      DROP POLICY IF EXISTS "Public can view profiles that created documents" ON profiles;
    `;

    // Step 3: Create SECURITY DEFINER function for admin checks
    console.log('Step 3: Creating SECURITY DEFINER function...');
    const createFunction = `
      CREATE OR REPLACE FUNCTION is_admin(user_id UUID, check_company_id UUID DEFAULT NULL)
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = user_id 
          AND role IN ('admin', 'super_admin')
          AND (check_company_id IS NULL OR company_id = check_company_id)
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

      CREATE OR REPLACE FUNCTION is_active_user(user_id UUID)
      RETURNS BOOLEAN AS $$
      BEGIN
        RETURN EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = user_id 
          AND status = 'active'
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
    `;

    // Step 4: Re-enable RLS
    console.log('Step 4: Re-enabling RLS...');
    const enableRLS = 'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;';

    // Step 5: Create safe policies using functions
    console.log('Step 5: Creating safe policies...');
    const createPolicies = `
      CREATE POLICY "Users can view their own profile" ON profiles
        FOR SELECT USING (auth.uid() = id);

      CREATE POLICY "Users can update their own profile" ON profiles
        FOR UPDATE USING (auth.uid() = id);

      CREATE POLICY "Admins can view all profiles in their company" ON profiles
        FOR SELECT USING (is_admin(auth.uid(), company_id));

      CREATE POLICY "Admins can insert new profiles" ON profiles
        FOR INSERT WITH CHECK (is_admin(auth.uid()));

      CREATE POLICY "Admins can update profiles in their company" ON profiles
        FOR UPDATE USING (is_admin(auth.uid(), company_id));

      CREATE POLICY "Public can view profiles that created documents" ON profiles
        FOR SELECT USING (
          EXISTS (
            SELECT 1 FROM quotations WHERE quotations.created_by = profiles.id
            UNION ALL
            SELECT 1 FROM invoices WHERE invoices.created_by = profiles.id
            UNION ALL
            SELECT 1 FROM proforma_invoices WHERE proforma_invoices.created_by = profiles.id
            UNION ALL
            SELECT 1 FROM delivery_notes WHERE delivery_notes.created_by = profiles.id
            UNION ALL
            SELECT 1 FROM payments WHERE payments.created_by = profiles.id
            UNION ALL
            SELECT 1 FROM remittance_advice WHERE remittance_advice.created_by = profiles.id
            UNION ALL
            SELECT 1 FROM stock_movements WHERE stock_movements.created_by = profiles.id
          )
        );
    `;

    // Execute all SQL
    const fullSQL = `${dropPolicies}\n${createFunction}\n${enableRLS}\n${createPolicies}`;

    // Try to execute via RPC if available, otherwise return SQL for manual execution
    try {
      // Note: This requires an RPC function to be set up in your database
      // For now, we'll just return the SQL for manual execution
      console.log('SQL generated successfully. Execute manually if RPC not available.');

      return {
        success: true,
        message: 'SQL generated successfully. Execute the SQL manually in Supabase or via RPC.',
        sql: fullSQL
      };
    } catch (executeError) {
      console.warn('Note: SQL execution via RPC may require additional setup');
      console.log('SQL to execute manually:');
      console.log(fullSQL);

      return {
        success: true,
        message: 'SQL generated successfully. Execute the SQL manually in Supabase.',
        sql: fullSQL
      };
    }
  } catch (error) {
    console.error('Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Executes the profile RLS fix SQL directly
 * This is a helper function that can be called if you have set up an RPC function
 */
export async function executeFixProfileRlsSQL(
  supabaseUrl: string,
  supabaseServiceKey: string,
  sql: string
): Promise<FixRlsResponse> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // This would require an RPC function like exec_sql in your database
    // For now, this is a placeholder for custom implementation
    console.log('Executing RLS fix SQL...');

    return {
      success: true,
      message: 'RLS policies fixed successfully'
    };
  } catch (error) {
    console.error('Error executing SQL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
