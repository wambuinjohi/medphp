import { useState, useEffect, useCallback } from 'react';
import { getDatabase } from '@/integrations/database';
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
      // If role definition is already loaded in the profile, use it
      if (currentUser.roleDefinition) {
        console.log('✅ Using role definition from profile:', currentUser.roleDefinition.name);
        setRole(currentUser.roleDefinition);
        setLoading(false);
        return;
      }

      // Otherwise, fetch the full role definition from the roles table
      const userRole = currentUser.role;

      if (!userRole) {
        setRole(null);
        setLoading(false);
        return;
      }

      // Fetch the full role definition from the roles table
      const db = getDatabase();
      const result = await db.selectBy('roles', {
        name: userRole,
        company_id: currentUser.company_id
      });

      const fetchError = result.error;
      const data = result.data?.[0] || null;

      if (fetchError) {
        const errorMessage = fetchError instanceof Error ? fetchError.message : JSON.stringify(fetchError);
        console.error('Error fetching user role:', errorMessage);
        setError(errorMessage);

        // Fallback: Use default permissions based on role type if available
        // Try exact match first, then case-insensitive match
        let roleType: keyof typeof DEFAULT_ROLE_PERMISSIONS | null = null;
        if (userRole in DEFAULT_ROLE_PERMISSIONS) {
          roleType = userRole as keyof typeof DEFAULT_ROLE_PERMISSIONS;
        } else {
          // Try case-insensitive match for roles like "Administrator" → "admin"
          const normalizedRole = userRole.toLowerCase();
          const matchedRole = Object.keys(DEFAULT_ROLE_PERMISSIONS).find(
            r => r.toLowerCase() === normalizedRole
          );
          if (matchedRole) {
            roleType = matchedRole as keyof typeof DEFAULT_ROLE_PERMISSIONS;
          }
        }

        if (roleType) {
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

        // Try exact match first, then case-insensitive match
        let roleType: keyof typeof DEFAULT_ROLE_PERMISSIONS | null = null;
        if (userRole in DEFAULT_ROLE_PERMISSIONS) {
          roleType = userRole as keyof typeof DEFAULT_ROLE_PERMISSIONS;
        } else {
          // Try case-insensitive match for roles like "Administrator" → "admin"
          const normalizedRole = userRole.toLowerCase();
          const matchedRole = Object.keys(DEFAULT_ROLE_PERMISSIONS).find(
            r => r.toLowerCase() === normalizedRole
          );
          if (matchedRole) {
            roleType = matchedRole as keyof typeof DEFAULT_ROLE_PERMISSIONS;
          }
        }

        if (roleType) {
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
      if (userRole) {
        // Try exact match first, then case-insensitive match
        let roleType: keyof typeof DEFAULT_ROLE_PERMISSIONS | null = null;
        if (userRole in DEFAULT_ROLE_PERMISSIONS) {
          roleType = userRole as keyof typeof DEFAULT_ROLE_PERMISSIONS;
        } else {
          // Try case-insensitive match for roles like "Administrator" → "admin"
          const normalizedRole = userRole.toLowerCase();
          const matchedRole = Object.keys(DEFAULT_ROLE_PERMISSIONS).find(
            r => r.toLowerCase() === normalizedRole
          );
          if (matchedRole) {
            roleType = matchedRole as keyof typeof DEFAULT_ROLE_PERMISSIONS;
          }
        }

        if (roleType) {
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
   * Entity type to permission mapping
   */
  const getEntityPermissions = useCallback(
    (entityType: string, action: 'create' | 'view' | 'edit' | 'delete'): Permission[] => {
      const baseType = entityType.toLowerCase();

      const permissionMap: Record<string, Record<'create' | 'view' | 'edit' | 'delete', Permission>> = {
        'quotation': {
          'create': 'create_quotation',
          'view': 'view_quotation',
          'edit': 'edit_quotation',
          'delete': 'delete_quotation',
        },
        'invoice': {
          'create': 'create_invoice',
          'view': 'view_invoice',
          'edit': 'edit_invoice',
          'delete': 'delete_invoice',
        },
        'credit_note': {
          'create': 'create_credit_note',
          'view': 'view_credit_note',
          'edit': 'edit_credit_note',
          'delete': 'delete_credit_note',
        },
        'proforma': {
          'create': 'create_proforma',
          'view': 'view_proforma',
          'edit': 'edit_proforma',
          'delete': 'delete_proforma',
        },
        'payment': {
          'create': 'create_payment',
          'view': 'view_payment',
          'edit': 'edit_payment',
          'delete': 'delete_payment',
        },
        'inventory': {
          'create': 'create_inventory',
          'view': 'view_inventory',
          'edit': 'edit_inventory',
          'delete': 'delete_inventory',
        },
        'customer': {
          'create': 'create_customer',
          'view': 'view_customer',
          'edit': 'edit_customer',
          'delete': 'delete_customer',
        },
        'delivery_note': {
          'create': 'create_delivery_note',
          'view': 'view_delivery_note',
          'edit': 'edit_delivery_note',
          'delete': 'delete_delivery_note',
        },
        'lpo': {
          'create': 'create_lpo',
          'view': 'view_lpo',
          'edit': 'edit_lpo',
          'delete': 'delete_lpo',
        },
        'remittance': {
          'create': 'create_remittance',
          'view': 'view_remittance',
          'edit': 'edit_remittance',
          'delete': 'delete_remittance',
        },
        'reports': {
          'create': 'view_reports',
          'view': 'view_reports',
          'edit': 'export_reports',
          'delete': 'view_reports',
        },
      };

      return [permissionMap[baseType]?.[action]].filter(Boolean) as Permission[];
    },
    []
  );

  /**
   * Check if current user has a specific permission
   */
  const can = useCallback(
    (permission: Permission): boolean => {
      return hasPermission(role, permission);
    },
    [role]
  );

  /**
   * Check if current user has any of the specified permissions
   */
  const canAny = useCallback(
    (permissions: Permission[]): boolean => {
      return hasAnyPermission(role, permissions);
    },
    [role]
  );

  /**
   * Check if current user has all specified permissions
   */
  const canAll = useCallback(
    (permissions: Permission[]): boolean => {
      return hasAllPermissions(role, permissions);
    },
    [role]
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
      const requiredPermissions = getEntityPermissions(entityType, 'delete');
      return hasAnyPermission(role, requiredPermissions);
    },
    [role, getEntityPermissions]
  );

  /**
   * Check if user can create a specific entity type
   */
  const canCreate = useCallback(
    (entityType: 'quotation' | 'invoice' | 'credit_note' | 'proforma' | 'customer' | 'inventory' | 'delivery_note' | 'lpo' | 'remittance' | 'payment'): boolean => {
      const requiredPermissions = getEntityPermissions(entityType, 'create');
      return hasAnyPermission(role, requiredPermissions);
    },
    [role, getEntityPermissions]
  );

  /**
   * Check if user can edit a specific entity type
   */
  const canEdit = useCallback(
    (entityType: 'quotation' | 'invoice' | 'credit_note' | 'proforma' | 'customer' | 'inventory' | 'delivery_note' | 'lpo' | 'remittance' | 'payment'): boolean => {
      const requiredPermissions = getEntityPermissions(entityType, 'edit');
      return hasAnyPermission(role, requiredPermissions);
    },
    [role, getEntityPermissions]
  );

  /**
   * Check if user can view a specific entity type
   */
  const canView = useCallback(
    (entityType: 'quotation' | 'invoice' | 'credit_note' | 'proforma' | 'customer' | 'inventory' | 'delivery_note' | 'lpo' | 'remittance' | 'payment' | 'reports'): boolean => {
      const requiredPermissions = getEntityPermissions(entityType, 'view');
      return hasAnyPermission(role, requiredPermissions);
    },
    [role, getEntityPermissions]
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
