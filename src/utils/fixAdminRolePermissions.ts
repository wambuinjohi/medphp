/**
 * Utility to fix admin role permissions
 * Ensures the admin role has all necessary permissions including view_inventory
 */

import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_ROLE_PERMISSIONS } from '@/types/permissions';

export interface FixRolePermissionsResult {
  success: boolean;
  message: string;
  role?: any;
  addedPermissions?: string[];
  error?: string;
}

/**
 * Fix admin role permissions - add missing permissions
 */
export async function fixAdminRolePermissions(companyId: string): Promise<FixRolePermissionsResult> {
  try {
    // Get the admin role
    const { data: adminRole, error: fetchError } = await supabase
      .from('roles')
      .select('*')
      .eq('name', 'admin')
      .eq('company_id', companyId)
      .maybeSingle();

    if (fetchError) {
      return {
        success: false,
        message: 'Failed to fetch admin role',
        error: fetchError.message,
      };
    }

    if (!adminRole) {
      return {
        success: false,
        message: 'Admin role not found in database',
        error: `No admin role found for company ${companyId}`,
      };
    }

    // Get default admin permissions
    const defaultPermissions = DEFAULT_ROLE_PERMISSIONS.admin;

    // Get current permissions (handle both array and JSONB formats)
    let currentPermissions = adminRole.permissions || [];
    if (typeof currentPermissions === 'string') {
      try {
        currentPermissions = JSON.parse(currentPermissions);
      } catch {
        currentPermissions = [];
      }
    }

    // Find missing permissions
    const missingPermissions = defaultPermissions.filter(
      (perm) => !currentPermissions.includes(perm)
    );

    if (missingPermissions.length === 0) {
      return {
        success: true,
        message: 'Admin role already has all permissions',
        role: adminRole,
        addedPermissions: [],
      };
    }

    // Add missing permissions
    const updatedPermissions = [...currentPermissions, ...missingPermissions];

    const { data: updatedRole, error: updateError } = await supabase
      .from('roles')
      .update({
        permissions: updatedPermissions,
        updated_at: new Date().toISOString(),
      })
      .eq('id', adminRole.id)
      .select()
      .single();

    if (updateError) {
      return {
        success: false,
        message: 'Failed to update admin role permissions',
        error: updateError.message,
      };
    }

    return {
      success: true,
      message: `Successfully added ${missingPermissions.length} missing permissions to admin role`,
      role: updatedRole,
      addedPermissions: missingPermissions,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: 'Unexpected error while fixing admin role permissions',
      error: errorMessage,
    };
  }
}

/**
 * Check if admin role has view_inventory permission
 */
export async function checkAdminInventoryPermission(companyId: string): Promise<{
  hasPermission: boolean;
  role: any | null;
  error?: string;
}> {
  try {
    const { data: adminRole, error } = await supabase
      .from('roles')
      .select('*')
      .eq('name', 'admin')
      .eq('company_id', companyId)
      .maybeSingle();

    if (error) {
      return {
        hasPermission: false,
        role: null,
        error: error.message,
      };
    }

    if (!adminRole) {
      return {
        hasPermission: false,
        role: null,
        error: 'Admin role not found',
      };
    }

    let permissions = adminRole.permissions || [];
    if (typeof permissions === 'string') {
      try {
        permissions = JSON.parse(permissions);
      } catch {
        permissions = [];
      }
    }

    const hasPermission = Array.isArray(permissions) && permissions.includes('view_inventory');

    return {
      hasPermission,
      role: adminRole,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      hasPermission: false,
      role: null,
      error: errorMessage,
    };
  }
}
