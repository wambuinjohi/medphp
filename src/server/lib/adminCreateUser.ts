/**
 * Admin Create User - External API Version
 * Uses med.layonsconstruction.com/api.php for user creation
 */

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
 * Creates a new user account via external API
 * This function calls med.layonsconstruction.com/api.php with the admin_create_user action
 *
 * @param request - User creation request with email, password, role, company_id, etc.
 * @param apiUrl - External API URL (med.layonsconstruction.com/api.php)
 * @param authToken - Admin authentication token for the API
 * @returns Response with success status and user_id or error message
 */
export async function adminCreateUser(
  request: CreateUserRequest,
  apiUrl: string = 'https://med.layonsconstruction.com/api.php',
  authToken?: string
): Promise<CreateUserResponse> {
  // Validate required fields
  if (!request.email || !request.password || !request.role || !request.company_id) {
    return {
      success: false,
      error: 'Missing required fields: email, password, role, company_id'
    };
  }

  // Validate API URL
  if (!apiUrl) {
    return {
      success: false,
      error: 'Missing API URL configuration'
    };
  }

  try {
    // Prepare headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    // Call external API to create user
    const response = await fetch(`${apiUrl}?action=admin_create_user`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: request.email,
        password: request.password,
        role: request.role,
        company_id: request.company_id,
        full_name: request.full_name || null,
        phone: request.phone || null,
        department: request.department || null,
        position: request.position || null,
        invited_by: request.invited_by || null
      })
    });

    // Defensively parse JSON
    const result = await response.json().catch(() => {
      if (!response.ok) {
        throw new Error(`Server error: HTTP ${response.status}. Failed to create user.`);
      }
      throw new Error('Invalid response from server: Expected valid JSON');
    });

    if (!response.ok || result.status === 'error') {
      console.error('API user creation error:', result);
      return {
        success: false,
        error: result.message || `API error: ${response.status}`
      };
    }

    if (result.success && result.user_id) {
      return {
        success: true,
        user_id: result.user_id
      };
    }

    return {
      success: false,
      error: result.message || 'Failed to create user'
    };
  } catch (error) {
    console.error('User creation error:', error);
    return {
      success: false,
      error: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
