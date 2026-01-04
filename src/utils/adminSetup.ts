import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ||
                     import.meta.env.NEXT_PUBLIC_SUPABASE_URL;

const SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
                         import.meta.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

export interface CreateAdminOptions {
  email: string;
  password: string;
  fullName: string;
  onProgress?: (message: string) => void;
}

export async function createAdminUser(options: CreateAdminOptions) {
  const { email, password, fullName, onProgress } = options;

  if (!SUPABASE_URL) {
    throw new Error('Supabase URL not configured');
  }

  if (!SERVICE_ROLE_KEY) {
    throw new Error('Service Role Key not available. Please run: ./setup-admin.sh');
  }

  // Create a Supabase client with the service role key
  const supabaseAdmin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Step 1: Check if company exists
    onProgress?.('📋 Checking for default company...');
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, name')
      .limit(1);

    if (companiesError) {
      throw new Error(`Failed to check companies: ${companiesError.message}`);
    }

    let companyId: string | null = null;

    if (companies && companies.length > 0) {
      companyId = companies[0].id;
      onProgress?.(`✅ Found company: ${companies[0].name}`);
    } else {
      onProgress?.('📋 Creating default company...');
      const { data: newCompany, error: companyError } = await supabaseAdmin
        .from('companies')
        .insert({
          name: 'Medical Supplies',
          email: email,
          currency: 'KES',
        })
        .select('id')
        .single();

      if (companyError) {
        throw new Error(`Failed to create company: ${companyError.message}`);
      }

      if (newCompany) {
        companyId = newCompany.id;
        onProgress?.('✅ Created default company: Medical Supplies');
      }
    }

    if (!companyId) {
      throw new Error('Failed to get or create company ID');
    }

    // Step 2: Create auth user
    onProgress?.('🔐 Creating authentication user...');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message?.includes('already exists') || authError.message?.includes('already registered')) {
        onProgress?.('⚠️ User already exists, retrieving...');
        // Try to get existing user
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (!listError && users) {
          const existingUser = users.find(u => u.email === email);
          if (existingUser?.id) {
            // User exists, update their profile
            await supabaseAdmin
              .from('profiles')
              .update({
                role: 'admin',
                status: 'active',
                full_name: fullName,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingUser.id);
            onProgress?.('✅ Updated existing user to admin');
            return { success: true, userId: existingUser.id, message: 'Admin updated successfully' };
          }
        }
      }
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }

    const userId = authData.user?.id;
    if (!userId) {
      throw new Error('Failed to get user ID from auth creation');
    }

    onProgress?.(`✅ Auth user created (ID: ${userId.substring(0, 8)}...)`);

    // Step 3: Create or update profile (use upsert to handle auto-created profile from auth trigger)
    onProgress?.('📝 Creating user profile...');
    const now = new Date().toISOString();
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        full_name: fullName,
        role: 'admin',
        status: 'active',
        company_id: companyId,
        created_at: now,
        updated_at: now,
      }, {
        onConflict: 'id',
        returning: 'minimal'
      });

    if (profileError) {
      // Try to delete the auth user if profile creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      } catch (cleanup) {
        console.error('Cleanup failed:', cleanup);
      }
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    onProgress?.('✅ Profile created');

    // Step 4: Assign permissions
    onProgress?.('🔑 Assigning permissions...');
    try {
      const { error: permError } = await supabaseAdmin
        .from('user_permissions')
        .insert({
          user_id: userId,
          permission_name: 'view_dashboard_summary',
          granted: true,
        });

      if (permError && !permError.message?.includes('duplicate')) {
        console.warn('Permission assignment warning:', permError);
      } else {
        onProgress?.('✅ Permissions assigned');
      }
    } catch (permErr) {
      console.warn('Permission assignment error:', permErr);
      // Don't fail if permissions fail
    }

    onProgress?.('✅ Admin user created successfully!');
    return {
      success: true,
      userId: userId,
      message: `Admin user ${email} created successfully`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    onProgress?.(`❌ Error: ${errorMessage}`);
    throw error;
  }
}
