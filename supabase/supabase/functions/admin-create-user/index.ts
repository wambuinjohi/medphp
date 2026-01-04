import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: corsHeaders }
      );
    }

    const body = await req.json();

    if (!body.email || !body.password || !body.role || !body.company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Configuration error' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check company exists
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('id', body.company_id)
      .maybeSingle();

    if (!company) {
      return new Response(
        JSON.stringify({ success: false, error: 'Company not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    let userId: string;
    let userCreatedNow = false;

    // Try to create auth user with minimal data to avoid trigger issues
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
      });

      if (authError) {
        // If user already exists, try to get them
        if (authError.message?.includes('already exists') || authError.message?.includes('already registered')) {
          console.log('User already exists, retrieving existing user');

          try {
            const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

            if (listError || !users) {
              console.error('Could not retrieve existing user:', listError);
              return new Response(
                JSON.stringify({ success: false, error: 'User exists but could not be retrieved' }),
                { status: 400, headers: corsHeaders }
              );
            }

            const existingUser = users.find(u => u.email === body.email);
            if (!existingUser?.id) {
              return new Response(
                JSON.stringify({ success: false, error: 'User exists but has no ID' }),
                { status: 400, headers: corsHeaders }
              );
            }

            userId = existingUser.id;
            userCreatedNow = false;
          } catch (retrieveErr) {
            console.error('Error retrieving existing user:', retrieveErr);
            return new Response(
              JSON.stringify({ success: false, error: 'User exists but could not be retrieved' }),
              { status: 400, headers: corsHeaders }
            );
          }
        } else {
          console.error('Auth creation error:', authError);
          return new Response(
            JSON.stringify({ success: false, error: `Auth error: ${authError.message}` }),
            { status: 400, headers: corsHeaders }
          );
        }
      } else if (authData.user?.id) {
        userId = authData.user.id;
        userCreatedNow = true;
      } else {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to create or retrieve user' }),
          { status: 500, headers: corsHeaders }
        );
      }
    } catch (err) {
      console.error('Unexpected auth error:', err);
      return new Response(
        JSON.stringify({ success: false, error: `Auth error: ${err instanceof Error ? err.message : String(err)}` }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Handle profile - using upsert to avoid conflicts
    try {
      const now = new Date().toISOString();

      // Use upsert which handles both insert and update cases
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: body.email,
          full_name: body.full_name || null,
          phone: body.phone || null,
          department: body.department || null,
          position: body.position || null,
          company_id: body.company_id,
          role: body.role,
          status: 'active',
          invited_by: body.invited_by || null,
          invited_at: body.invited_by ? now : null,
          created_at: now,
          updated_at: now,
        }, {
          onConflict: 'id',
          returning: 'minimal'
        });

      if (profileError) {
        console.error('Profile upsert error:', profileError);
        console.error('Error details:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details
        });

        // If profile fails but user was just created, clean up
        if (userCreatedNow) {
          try {
            await supabase.auth.admin.deleteUser(userId);
          } catch (cleanup) {
            console.error('Cleanup failed:', cleanup);
          }
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: `Database error: ${profileError.message}`,
            code: profileError.code
          }),
          { status: 400, headers: corsHeaders }
        );
      }

      // Assign permissions based on role
      try {
        if (body.role === 'admin' || body.role === 'super_admin') {
          // Grant dashboard permission to admin and super_admin roles
          const { error: permissionError } = await supabase
            .from('user_permissions')
            .insert({
              user_id: userId,
              permission_name: 'view_dashboard_summary',
              granted: true,
            })
            .select()
            .single();

          if (permissionError && !permissionError.message?.includes('duplicate')) {
            console.error('Permission assignment error:', permissionError);
          }
        }
      } catch (permErr) {
        console.error('Error assigning permissions:', permErr);
        // Don't fail the user creation if permission assignment fails
      }
    } catch (err) {
      console.error('Profile error:', err);
      // If profile fails but user was just created, clean up
      if (userCreatedNow) {
        try {
          await supabase.auth.admin.deleteUser(userId);
        } catch (cleanup) {
          console.error('Cleanup failed:', cleanup);
        }
      }
      return new Response(
        JSON.stringify({ success: false, error: `Profile error: ${err instanceof Error ? err.message : String(err)}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ success: false, error: `Error: ${error instanceof Error ? error.message : String(error)}` }),
      { status: 500, headers: corsHeaders }
    );
  }
});
