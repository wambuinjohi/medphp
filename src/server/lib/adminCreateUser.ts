import { createClient } from '@supabase/supabase-js';

interface CreateUserRequest {
  email: string;
  password: string;
  role: 'admin' | 'accountant' | 'stock_manager' | 'user' | 'super_admin';
  company_id: string;
  full_name?: string;
  phone?: string;
  department?: string;
  position?: string;
  invited_by?: string;
}

interface CreateUserResponse {
  success: boolean;
  user_id?: string;
  error?: string;
}

/**
 * Creates a new user account and profile
 * This function:
 * 1. Creates a Supabase Auth user
 * 2. Creates a corresponding profile record
 * 3. Assigns initial permissions based on role
 * 4. Logs the action in audit logs
 *
 * @param request - User creation request with email, password, role, company_id, etc.
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key
 * @returns Response with success status and user_id or error message
 */
export async function adminCreateUser(
  request: CreateUserRequest,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<CreateUserResponse> {
  // Validate required fields
  if (!request.email || !request.password || !request.role || !request.company_id) {
    return {
      success: false,
      error: 'Missing required fields: email, password, role, company_id'
    };
  }

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
    // Check company exists
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('id', request.company_id)
      .maybeSingle();

    if (companyError || !company) {
      return {
        success: false,
        error: 'Company not found'
      };
    }

    let userId: string;
    let userCreatedNow = false;

    // Try to create auth user
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: request.email,
        password: request.password,
        email_confirm: true
      });

      if (authError) {
        // If user already exists, try to get them
        if (
          authError.message?.includes('already exists') ||
          authError.message?.includes('already registered')
        ) {
          console.log('User already exists, retrieving existing user');

          try {
            const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

            if (listError || !users) {
              console.error('Could not retrieve existing user:', listError);
              return {
                success: false,
                error: 'User exists but could not be retrieved'
              };
            }

            const existingUser = users.find(u => u.email === request.email);
            if (!existingUser?.id) {
              return {
                success: false,
                error: 'User exists but has no ID'
              };
            }

            userId = existingUser.id;
            userCreatedNow = false;
          } catch (retrieveErr) {
            console.error('Error retrieving existing user:', retrieveErr);
            return {
              success: false,
              error: 'User exists but could not be retrieved'
            };
          }
        } else {
          // Safely extract error message
          const errorMsg = authError instanceof Error ? authError.message :
                          (authError && typeof authError === 'object' && 'message' in authError)
                            ? (authError as any).message
                            : String(authError);
          console.error('Auth creation error:', errorMsg);
          return {
            success: false,
            error: `Auth error: ${errorMsg}`
          };
        }
      } else if (authData.user?.id) {
        userId = authData.user.id;
        userCreatedNow = true;
      } else {
        return {
          success: false,
          error: 'Failed to create or retrieve user'
        };
      }
    } catch (err) {
      console.error('Unexpected auth error:', err);
      return {
        success: false,
        error: `Auth error: ${err instanceof Error ? err.message : String(err)}`
      };
    }

    // Handle profile - using upsert to avoid conflicts
    try {
      const now = new Date().toISOString();

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: userId,
            email: request.email,
            full_name: request.full_name || null,
            phone: request.phone || null,
            department: request.department || null,
            position: request.position || null,
            company_id: request.company_id,
            role: request.role,
            status: 'active',
            invited_by: request.invited_by || null,
            invited_at: request.invited_by ? now : null,
            created_at: now,
            updated_at: now
          },
          {
            onConflict: 'id'
          }
        );

      if (profileError) {
        console.error('Profile upsert error:', profileError);

        // If profile fails but user was just created, clean up
        if (userCreatedNow) {
          try {
            await supabase.auth.admin.deleteUser(userId);
          } catch (cleanup) {
            console.error('Cleanup failed:', cleanup);
          }
        }

        return {
          success: false,
          error: `Database error: ${profileError.message}`
        };
      }

      // Assign permissions based on role
      try {
        if (request.role === 'admin' || request.role === 'super_admin') {
          await supabase
            .from('user_permissions')
            .insert({
              user_id: userId,
              permission_name: 'view_dashboard_summary',
              granted: true
            });
        }
      } catch (permErr) {
        console.error('Error assigning permissions:', permErr);
        // Don't fail the user creation if permission assignment fails
      }

      // Log the action in audit logs
      try {
        await supabase
          .from('audit_logs')
          .insert({
            action: 'CREATE',
            entity_type: 'user_creation',
            record_id: userId,
            company_id: request.company_id,
            actor_user_id: request.invited_by || null,
            details: {
              email: request.email,
              role: request.role,
              full_name: request.full_name
            }
          });
      } catch (auditErr) {
        console.warn('Failed to log user creation:', auditErr);
      }

      return {
        success: true,
        user_id: userId
      };
    } catch (err) {
      console.error('Profile error:', err);

      if (userCreatedNow) {
        try {
          await supabase.auth.admin.deleteUser(userId);
        } catch (cleanup) {
          console.error('Cleanup failed:', cleanup);
        }
      }

      return {
        success: false,
        error: `Profile error: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  } catch (error) {
    console.error('Function error:', error);
    return {
      success: false,
      error: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
