import { Permission, RoleDefinition } from '@/types/permissions';

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  role: RoleDefinition | null | undefined,
  permission: Permission
): boolean {
  if (!role || !role.permissions) {
    return false;
  }
  return role.permissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(
  role: RoleDefinition | null | undefined,
  permissions: Permission[]
): boolean {
  if (!role || !role.permissions) {
    return false;
  }
  return permissions.some(permission => role.permissions.includes(permission));
}

/**
 * Check if a role has all specified permissions
 */
export function hasAllPermissions(
  role: RoleDefinition | null | undefined,
  permissions: Permission[]
): boolean {
  if (!role || !role.permissions) {
    return false;
  }
  return permissions.every(permission => role.permissions.includes(permission));
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
