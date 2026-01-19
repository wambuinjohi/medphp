import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { RoleDefinition, Permission, DEFAULT_ROLE_PERMISSIONS } from '@/types/permissions';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getMissingPermissions,
} from '@/utils/permissionChecker';

/**
 * Hook to check permissions for the current user
 * Fetches the user's role and provides permission checking utilities
 */
export const usePermissions = () => {
  const { profile: currentUser } = useAuth();
  const [role, setRole] = useState<RoleDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch the user's role definition
   */
  const fetchUserRole = useCallback(async () => {
    if (!currentUser) {
      setRole(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, get the user's role string
      const userRole = currentUser.role;

      if (!userRole) {
        setRole(null);
        setLoading(false);
        return;
      }

      // Fetch the full role definition from the roles table
      const { data, error: fetchError } = await supabase
        .from('roles')
        .select('*')
        .eq('name', userRole)
        .eq('company_id', currentUser.company_id)
        .maybeSingle();

      if (fetchError) {
        const errorMessage = fetchError instanceof Error ? fetchError.message : JSON.stringify(fetchError);
        console.error('Error fetching user role:', errorMessage);
        setError(errorMessage);

        // Fallback: Use default permissions based on role type if available
        if (userRole in DEFAULT_ROLE_PERMISSIONS) {
          const roleType = userRole as keyof typeof DEFAULT_ROLE_PERMISSIONS;
          const fallbackRole: RoleDefinition = {
            id: `fallback-${userRole}`,
            name: userRole,
            role_type: roleType,
            description: `Fallback ${userRole} role`,
            permissions: DEFAULT_ROLE_PERMISSIONS[roleType],
            company_id: currentUser.company_id || '',
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setRole(fallbackRole);
        } else {
          setRole(null);
        }
      } else if (data) {
        setRole(data);
      } else {
        // Role not found in roles table, use default permissions as fallback
        console.warn(`Role ${userRole} not found in roles table, using default fallback`);

        if (userRole in DEFAULT_ROLE_PERMISSIONS) {
          const roleType = userRole as keyof typeof DEFAULT_ROLE_PERMISSIONS;
          const fallbackRole: RoleDefinition = {
            id: `fallback-${userRole}`,
            name: userRole,
            role_type: roleType,
            description: `Fallback ${userRole} role`,
            permissions: DEFAULT_ROLE_PERMISSIONS[roleType],
            company_id: currentUser.company_id || '',
            is_default: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setRole(fallbackRole);
        } else {
          setRole(null);
        }
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');

      // Fallback: Use default permissions if user role type is recognized
      const userRole = currentUser?.role;
      if (userRole && userRole in DEFAULT_ROLE_PERMISSIONS) {
        const roleType = userRole as keyof typeof DEFAULT_ROLE_PERMISSIONS;
        const fallbackRole: RoleDefinition = {
          id: `fallback-${userRole}`,
          name: userRole,
          role_type: roleType,
          description: `Fallback ${userRole} role`,
          permissions: DEFAULT_ROLE_PERMISSIONS[roleType],
          company_id: currentUser?.company_id || '',
          is_default: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setRole(fallbackRole);
      } else {
        setRole(null);
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Fetch user role on mount or when user changes
  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  /**
   * Check if current user has a specific permission
   * DISABLED: Role enforcement disabled - always returns true
   */
  const can = useCallback(
    (permission: Permission): boolean => {
      // Role enforcement disabled - allow all permissions
      return true;
    },
    []
  );

  /**
   * Check if current user has any of the specified permissions
   * DISABLED: Role enforcement disabled - always returns true
   */
  const canAny = useCallback(
    (permissions: Permission[]): boolean => {
      // Role enforcement disabled - allow all permissions
      return true;
    },
    []
  );

  /**
   * Check if current user has all specified permissions
   * DISABLED: Role enforcement disabled - always returns true
   */
  const canAll = useCallback(
    (permissions: Permission[]): boolean => {
      // Role enforcement disabled - allow all permissions
      return true;
    },
    []
  );

  /**
   * Get permissions missing from current user's role
   */
  const getMissing = useCallback(
    (requiredPermissions: Permission[]): Permission[] => {
      return getMissingPermissions(role, requiredPermissions);
    },
    [role]
  );

  /**
   * Check if user can delete a specific entity type
   */
  const canDelete = useCallback(
    (entityType: 'quotation' | 'invoice' | 'credit_note' | 'proforma' | 'customer' | 'inventory' | 'delivery_note' | 'lpo' | 'remittance' | 'payment'): boolean => {
      const deletePermissionMap: Record<string, Permission> = {
        quotation: 'delete_quotation',
        invoice: 'delete_invoice',
        credit_note: 'delete_credit_note',
        proforma: 'delete_proforma',
        customer: 'delete_customer',
        inventory: 'delete_inventory',
        delivery_note: 'delete_delivery_note',
        lpo: 'delete_lpo',
        remittance: 'delete_remittance',
        payment: 'delete_payment',
      };

      const permission = deletePermissionMap[entityType];
      return permission ? hasPermission(role, permission) : false;
    },
    [role]
  );

  /**
   * Check if user can create a specific entity type
   */
  const canCreate = useCallback(
    (entityType: 'quotation' | 'invoice' | 'credit_note' | 'proforma' | 'customer' | 'inventory' | 'delivery_note' | 'lpo' | 'remittance' | 'payment'): boolean => {
      const createPermissionMap: Record<string, Permission> = {
        quotation: 'create_quotation',
        invoice: 'create_invoice',
        credit_note: 'create_credit_note',
        proforma: 'create_proforma',
        customer: 'create_customer',
        inventory: 'create_inventory',
        delivery_note: 'create_delivery_note',
        lpo: 'create_lpo',
        remittance: 'create_remittance',
        payment: 'create_payment',
      };

      const permission = createPermissionMap[entityType];
      return permission ? hasPermission(role, permission) : false;
    },
    [role]
  );

  /**
   * Check if user can edit a specific entity type
   */
  const canEdit = useCallback(
    (entityType: 'quotation' | 'invoice' | 'credit_note' | 'proforma' | 'customer' | 'inventory' | 'delivery_note' | 'lpo' | 'remittance' | 'payment'): boolean => {
      const editPermissionMap: Record<string, Permission> = {
        quotation: 'edit_quotation',
        invoice: 'edit_invoice',
        credit_note: 'edit_credit_note',
        proforma: 'edit_proforma',
        customer: 'edit_customer',
        inventory: 'edit_inventory',
        delivery_note: 'edit_delivery_note',
        lpo: 'edit_lpo',
        remittance: 'edit_remittance',
        payment: 'edit_payment',
      };

      const permission = editPermissionMap[entityType];
      return permission ? hasPermission(role, permission) : false;
    },
    [role]
  );

  /**
   * Check if user can view a specific entity type
   */
  const canView = useCallback(
    (entityType: 'quotation' | 'invoice' | 'credit_note' | 'proforma' | 'customer' | 'inventory' | 'delivery_note' | 'lpo' | 'remittance' | 'payment' | 'reports'): boolean => {
      const viewPermissionMap: Record<string, Permission> = {
        quotation: 'view_quotation',
        invoice: 'view_invoice',
        credit_note: 'view_credit_note',
        proforma: 'view_proforma',
        customer: 'view_customer',
        inventory: 'view_inventory',
        delivery_note: 'view_delivery_note',
        lpo: 'view_lpo',
        remittance: 'view_remittance',
        payment: 'view_payment',
        reports: 'view_reports',
      };

      const permission = viewPermissionMap[entityType];
      return permission ? hasPermission(role, permission) : false;
    },
    [role]
  );

  return {
    role,
    loading,
    error,
    can,
    canAny,
    canAll,
    canDelete,
    canCreate,
    canEdit,
    canView,
    getMissing,
    refetch: fetchUserRole,
  };
};

export default usePermissions;
