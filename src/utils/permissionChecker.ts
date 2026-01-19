import { Permission, RoleDefinition } from '@/types/permissions';

/**
 * DISABLED: Role enforcement is disabled
 * All permission checks now return true to allow all access
 */

/**
 * Check if a role has a specific permission
 * DISABLED: Always returns true
 */
export function hasPermission(
  role: RoleDefinition | null | undefined,
  permission: Permission
): boolean {
  // Role enforcement disabled - allow all permissions
  return true;
}

/**
 * Check if a role has any of the specified permissions
 * DISABLED: Always returns true
 */
export function hasAnyPermission(
  role: RoleDefinition | null | undefined,
  permissions: Permission[]
): boolean {
  // Role enforcement disabled - allow all permissions
  return true;
}

/**
 * Check if a role has all specified permissions
 * DISABLED: Always returns true
 */
export function hasAllPermissions(
  role: RoleDefinition | null | undefined,
  permissions: Permission[]
): boolean {
  // Role enforcement disabled - allow all permissions
  return true;
}

/**
 * Get the count of permissions a role has
 */
export function getPermissionCount(role: RoleDefinition | null | undefined): number {
  if (!role || !role.permissions) {
    return 0;
  }
  return role.permissions.length;
}

/**
 * Filter a list of permissions based on what a role can do
 * DISABLED: Returns all permissions
 */
export function filterPermissionsByRole(
  allPermissions: Permission[],
  role: RoleDefinition | null | undefined
): Permission[] {
  // Role enforcement disabled - return all permissions
  return allPermissions;
}

/**
 * Get permissions missing from a role
 * DISABLED: Always returns empty array
 */
export function getMissingPermissions(
  role: RoleDefinition | null | undefined,
  requiredPermissions: Permission[]
): Permission[] {
  // Role enforcement disabled - no missing permissions
  return [];
}
