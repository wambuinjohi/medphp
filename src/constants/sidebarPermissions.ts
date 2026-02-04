/**
 * Sidebar Permission Mappings
 * Maps sidebar items to required permissions for visibility
 * 
 * If a sidebar item has multiple permissions, the user must have ANY of them to see it (OR logic)
 * For parent menu items, the menu is shown if user has ANY permission for ANY child item
 */

import { Permission } from '@/types/permissions';

export type SidebarPermissionMap = Record<string, {
  requiredPermissions?: Permission[];
  requiresAdminRole?: boolean;
  description?: string;
  childrenCanShowParent?: boolean; // If true, show parent if ANY child is accessible (default: true)
}>;

export const sidebarPermissionMap: SidebarPermissionMap = {
  // Dashboard - always visible to authenticated users
  'Dashboard': {
    requiredPermissions: [],
    description: 'Main dashboard accessible to all authenticated users'
  },

  // Sales Section
  'Sales': {
    childrenCanShowParent: true,
    description: 'Sales management section - shown if user has any sales-related permission'
  },
  'Quotations': {
    requiredPermissions: ['view_quotation', 'create_quotation', 'edit_quotation'],
    description: 'View and manage quotations'
  },
  'Proforma Invoices': {
    requiredPermissions: ['view_proforma', 'create_proforma', 'edit_proforma'],
    description: 'View and manage proforma invoices'
  },
  'Invoices': {
    requiredPermissions: ['view_invoice', 'create_invoice', 'edit_invoice'],
    description: 'View and manage invoices'
  },
  'Direct Receipts': {
    requiredPermissions: ['view_payment', 'create_payment'],
    description: 'Record direct payment receipts'
  },
  'Credit Notes': {
    requiredPermissions: ['view_credit_note', 'create_credit_note', 'edit_credit_note'],
    description: 'View and manage credit notes'
  },

  // Payments Section
  'Payments': {
    childrenCanShowParent: true,
    description: 'Payment management section'
  },
  'Payments': {
    requiredPermissions: ['view_payment', 'create_payment', 'edit_payment'],
    description: 'View and manage payments'
  },
  'Remittance Advice': {
    requiredPermissions: ['view_remittance', 'create_remittance', 'edit_remittance'],
    description: 'View and manage remittance advice'
  },

  // Inventory Section
  'Inventory': {
    childrenCanShowParent: true,
    description: 'Inventory management section'
  },
  'Inventory': {
    requiredPermissions: ['view_inventory', 'create_inventory', 'edit_inventory'],
    description: 'View and manage inventory'
  },
  'Stock Movements': {
    requiredPermissions: ['view_inventory'],
    description: 'Track stock movements'
  },

  // Delivery Notes
  'Delivery Notes': {
    requiredPermissions: ['view_delivery_note', 'create_delivery_note', 'edit_delivery_note'],
    description: 'View and manage delivery notes'
  },

  // Transport Section
  'Transport': {
    childrenCanShowParent: true,
    description: 'Transport management section'
  },
  'Drivers': {
    requiredPermissions: ['manage_transport'],
    description: 'Manage transport drivers'
  },
  'Vehicles': {
    requiredPermissions: ['manage_transport'],
    description: 'Manage transport vehicles'
  },
  'Materials': {
    requiredPermissions: ['manage_transport'],
    description: 'Manage transport materials'
  },
  'Finance': {
    requiredPermissions: ['manage_transport'],
    description: 'Transport finance management'
  },

  // Customers
  'Customers': {
    requiredPermissions: ['view_customer', 'create_customer', 'edit_customer'],
    description: 'View and manage customers'
  },

  // Purchase Orders Section
  'Purchase Orders': {
    childrenCanShowParent: true,
    description: 'Purchase order management'
  },
  'Local Purchase Orders': {
    requiredPermissions: ['view_lpo', 'create_lpo', 'edit_lpo'],
    description: 'View and manage local purchase orders'
  },
  'Suppliers': {
    requiredPermissions: ['view_supplier', 'create_supplier', 'edit_supplier'],
    description: 'View and manage suppliers'
  },

  // Reports Section
  'Reports': {
    childrenCanShowParent: true,
    description: 'Reporting section - shown if user can view any reports'
  },
  'Sales Reports': {
    requiredPermissions: ['view_reports'],
    description: 'View sales reports'
  },
  'Inventory Reports': {
    requiredPermissions: ['view_reports'],
    description: 'View inventory reports'
  },
  'Customer Statements': {
    requiredPermissions: ['view_reports'],
    description: 'View customer statements'
  },
  'Trading P&L': {
    requiredPermissions: ['view_reports'],
    description: 'View trading profit and loss'
  },
  'Transport P&L': {
    requiredPermissions: ['view_reports'],
    description: 'View transport profit and loss'
  },
  'Consolidated P&L': {
    requiredPermissions: ['view_reports'],
    description: 'View consolidated profit and loss'
  },

  // Settings Section (requires admin role for now)
  'Settings': {
    requiresAdminRole: true,
    childrenCanShowParent: true,
    description: 'System settings - admin only'
  },
  'Company Settings': {
    requiresAdminRole: true,
    description: 'Configure company settings'
  },
  'User Management': {
    requiresAdminRole: true,
    description: 'Manage users and roles'
  },
  'Payment Methods': {
    requiresAdminRole: true,
    description: 'Configure payment methods'
  },
  'Database & Roles': {
    requiresAdminRole: true,
    description: 'Manage database and role definitions'
  },

  // Admin Section (requires admin role)
  'Admin': {
    requiresAdminRole: true,
    childrenCanShowParent: true,
    description: 'Admin tools - admin only'
  },
  'Image Management': {
    requiresAdminRole: true,
    description: 'Manage system images'
  },
  'Audit Logs': {
    requiresAdminRole: true,
    description: 'View audit logs'
  },
  'Database': {
    requiresAdminRole: true,
    description: 'Database management tools'
  }
};

/**
 * Check if a sidebar item should be visible to the current user
 * 
 * @param itemTitle - The title of the sidebar item
 * @param canPermission - Function to check if user has a specific permission
 * @param isAdmin - Whether the user is an admin
 * @returns true if item should be visible, false otherwise
 */
export function shouldShowSidebarItem(
  itemTitle: string,
  canPermission: (permission: string) => boolean,
  isAdmin: boolean
): boolean {
  const itemConfig = sidebarPermissionMap[itemTitle];
  
  if (!itemConfig) {
    // Item not in map, show to everyone
    return true;
  }

  // Check if requires admin role
  if (itemConfig.requiresAdminRole && !isAdmin) {
    return false;
  }

  // If no required permissions specified, show to everyone (who passed admin check)
  if (!itemConfig.requiredPermissions || itemConfig.requiredPermissions.length === 0) {
    return true;
  }

  // User must have ANY of the required permissions
  return itemConfig.requiredPermissions.some(permission => canPermission(permission));
}

/**
 * Check if a parent menu item should be shown based on visibility of children
 * This is used for compound menu items to show parent if ANY child is visible
 * 
 * @param parentTitle - The title of the parent menu item
 * @param childItems - Array of child item titles
 * @param canPermission - Function to check if user has a specific permission
 * @param isAdmin - Whether the user is an admin
 * @returns true if parent should be shown, false otherwise
 */
export function shouldShowParentMenu(
  parentTitle: string,
  childItems: string[],
  canPermission: (permission: string) => boolean,
  isAdmin: boolean
): boolean {
  const parentConfig = sidebarPermissionMap[parentTitle];
  
  // If childrenCanShowParent is false, use standard logic
  if (parentConfig && parentConfig.childrenCanShowParent === false) {
    return shouldShowSidebarItem(parentTitle, canPermission, isAdmin);
  }

  // Otherwise, show if ANY child is visible
  return childItems.some(childTitle => 
    shouldShowSidebarItem(childTitle, canPermission, isAdmin)
  );
}
