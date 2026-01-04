import { adminCreateUser } from '../lib/adminCreateUser';
import { adminResetPassword } from '../lib/adminResetPassword';
import { fixProfileRls } from '../lib/fixProfileRls';

const EXTERNAL_API_URL = process.env.VITE_EXTERNAL_API_URL || 'https://med.wayrus.co.ke/api.php';
const API_AUTH_TOKEN = process.env.API_AUTH_TOKEN || '';

/**
 * API Route Handler for creating users
 * Calls the external API (med.wayrus.co.ke/api.php)
 *
 * Usage:
 * POST /api/admin/users/create
 * Content-Type: application/json
 *
 * Body:
 * {
 *   "email": "user@example.com",
 *   "password": "securepassword123",
 *   "role": "admin|accountant|stock_manager|user",
 *   "company_id": "uuid",
 *   "full_name": "John Doe",
 *   "phone": "+1234567890",
 *   "department": "Sales",
 *   "position": "Manager",
 *   "invited_by": "admin-user-id"
 * }
 */
export async function handleCreateUser(body: any) {
  try {
    const result = await adminCreateUser(
      {
        email: body.email,
        password: body.password,
        role: body.role,
        company_id: body.company_id,
        full_name: body.full_name,
        phone: body.phone,
        department: body.department,
        position: body.position,
        invited_by: body.invited_by
      },
      EXTERNAL_API_URL,
      API_AUTH_TOKEN
    );

    return {
      status: result.success ? 200 : 400,
      body: result
    };
  } catch (error) {
    console.error('Error in handleCreateUser:', error);
    return {
      status: 500,
      body: {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }
    };
  }
}

/**
 * API Route Handler for password reset
 * Calls the external API (med.wayrus.co.ke/api.php)
 *
 * Usage:
 * POST /api/admin/users/reset-password
 * Content-Type: application/json
 *
 * Body:
 * {
 *   "email": "user@example.com",
 *   "user_id": "uuid",
 *   "admin_id": "admin-user-id",
 *   "redirectUrl": "https://yourapp.com/reset-password" (optional)
 * }
 */
export async function handleResetPassword(body: any) {
  try {
    const result = await adminResetPassword(
      {
        email: body.email,
        user_id: body.user_id,
        admin_id: body.admin_id,
        redirectUrl: body.redirectUrl
      },
      EXTERNAL_API_URL,
      API_AUTH_TOKEN
    );

    return {
      status: result.success ? 200 : 400,
      body: result
    };
  } catch (error) {
    console.error('Error in handleResetPassword:', error);
    return {
      status: 500,
      body: {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }
    };
  }
}

/**
 * API Route Handler for fixing profile RLS
 * Calls the external API (med.wayrus.co.ke/api.php)
 *
 * Usage:
 * POST /api/admin/database/fix-rls
 * Content-Type: application/json
 *
 * Body:
 * {} (no body needed)
 *
 * RLS management is handled by the external API
 */
export async function handleFixProfileRls() {
  try {
    const result = await fixProfileRls(EXTERNAL_API_URL, API_AUTH_TOKEN);

    return {
      status: result.success ? 200 : 400,
      body: result
    };
  } catch (error) {
    console.error('Error in handleFixProfileRls:', error);
    return {
      status: 500,
      body: {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }
    };
  }
}

/**
 * Express-style route handler (if using Express/Node backend)
 * Import and use this if you have an Express server
 */
export function setupAdminUserRoutes(app: any) {
  // Create user endpoint
  app.post('/api/admin/users/create', async (req: any, res: any) => {
    const { status, body } = await handleCreateUser(req.body);
    res.status(status).json(body);
  });

  // Reset password endpoint
  app.post('/api/admin/users/reset-password', async (req: any, res: any) => {
    const { status, body } = await handleResetPassword(req.body);
    res.status(status).json(body);
  });

  // Fix RLS endpoint
  app.post('/api/admin/database/fix-rls', async (req: any, res: any) => {
    const { status, body } = await handleFixProfileRls();
    res.status(status).json(body);
  });
}

/**
 * Utility functions for frontend to call these endpoints
 */
export const adminUserAPI = {
  /**
   * Create a new user
   */
  async createUser(params: {
    email: string;
    password: string;
    role: 'admin' | 'accountant' | 'stock_manager' | 'user' | 'super_admin';
    company_id: string;
    full_name?: string;
    phone?: string;
    department?: string;
    position?: string;
    invited_by?: string;
  }) {
    const response = await fetch('/api/admin/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return response.json();
  },

  /**
   * Request a password reset for a user
   */
  async resetPassword(params: {
    email: string;
    user_id: string;
    admin_id: string;
    redirectUrl?: string;
  }) {
    const response = await fetch('/api/admin/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return response.json();
  },

  /**
   * Fix profile RLS issues
   */
  async fixProfileRls() {
    const response = await fetch('/api/admin/database/fix-rls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    return response.json();
  }
};
