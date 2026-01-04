import { createClient } from '@supabase/supabase-js';

interface ResetPasswordRequest {
  email: string;
  user_id: string;
  admin_id: string;
  redirectUrl?: string;
}

interface ResetPasswordResponse {
  success: boolean;
  error?: string;
}

/**
 * Sends a password reset email to a user
 * This function:
 * 1. Verifies the admin user has permission to reset passwords
 * 2. Verifies the target user exists
 * 3. Sends a password reset email
 * 4. Logs the action in audit logs
 *
 * @param request - Password reset request with email, user_id, admin_id
 * @param supabaseUrl - Supabase project URL
 * @param supabaseServiceKey - Supabase service role key
 * @returns Response with success status or error message
 */
export async function adminResetPassword(
  request: ResetPasswordRequest,
  supabaseUrl: string,
  supabaseServiceKey: string
): Promise<ResetPasswordResponse> {
  // Validate required fields
  if (!request.email || !request.user_id || !request.admin_id) {
    return {
      success: false,
      error: 'Missing required fields: email, user_id, admin_id'
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
    // Verify admin user exists and is admin
    const { data: adminUser, error: adminError } = await supabase
      .from('profiles')
      .select('id, role, email')
      .eq('id', request.admin_id)
      .maybeSingle();

    if (adminError || !adminUser || adminUser.role !== 'admin') {
      return {
        success: false,
        error: 'Unauthorized: Only admins can reset passwords'
      };
    }

    // Verify target user exists
    const { data: targetUser, error: targetError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', request.user_id)
      .maybeSingle();

    if (targetError || !targetUser) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    // Send password reset email using Supabase auth
    try {
      const redirectUrl = request.redirectUrl ||
        `${supabaseUrl.replace(/\/$/, '')}/auth/v1/callback`;

      const { error } = await supabase.auth.resetPasswordForEmail(request.email, {
        redirectTo: redirectUrl
      });

      if (error) {
        console.error('Password reset email error:', error);
        return {
          success: false,
          error: `Failed to send password reset email: ${error.message}`
        };
      }
    } catch (err) {
      console.error('Error sending password reset email:', err);
      return {
        success: false,
        error: `Failed to send password reset email: ${err instanceof Error ? err.message : String(err)}`
      };
    }

    // Log password reset request in audit trail
    try {
      await supabase
        .from('audit_logs')
        .insert({
          action: 'APPROVE',
          entity_type: 'user_creation',
          record_id: request.user_id,
          company_id: null,
          actor_user_id: request.admin_id,
          actor_email: adminUser.email,
          details: {
            action_type: 'password_reset',
            target_user_email: request.email,
            timestamp: new Date().toISOString()
          }
        });
    } catch (auditErr) {
      console.warn('Failed to log password reset to audit trail:', auditErr);
    }

    return {
      success: true
    };
  } catch (error) {
    console.error('Unexpected error:', error);
    return {
      success: false,
      error: `Server error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
