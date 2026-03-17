/**
 * Payroll User Role Constants
 *
 * The DB stores free-form role strings in TenantMember.role
 * (e.g. "admin", "ADMIN_A", "OWNER", "Employee").
 * We normalise them into two UI-level buckets: Owner and Employee.
 *
 * Rule: Only the exact role "Employee" (case-insensitive) is treated as Employee.
 *       Every other role (admin, ADMIN_A, OWNER, HR, etc.) is treated as Owner.
 */

export const USER_ROLES = {
  EMPLOYEE: 'Employee',
  OWNER: 'Owner',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/**
 * Check whether a DB role string maps to the Employee bucket.
 * Only the exact word "employee" (case-insensitive) is treated as employee.
 */
export const isEmployee = (role: string | null | undefined): boolean => {
  if (!role) return false;
  return role.trim().toLowerCase() === 'employee';
};

/**
 * Check whether a DB role string maps to owner-level access.
 * Any role that is NOT "employee" is treated as owner/admin.
 */
export const isOwner = (role: string | null | undefined): boolean => {
  if (!role) return false;
  return !isEmployee(role);
};

/**
 * Normalise a DB role string into a UI-level role for display purposes.
 */
export const normalizeRole = (role: string | null | undefined): UserRole =>
  isOwner(role) ? USER_ROLES.OWNER : USER_ROLES.EMPLOYEE;

// Role groups for permission checks
export const ROLE_GROUPS = {
  CAN_APPROVE_REQUESTS: [USER_ROLES.OWNER],
};

// Helper function to check if user has access
export const hasRoleAccess = (
  userRole: string | undefined,
  allowedRoles: string[]
): boolean => {
  if (!userRole) return false;
  const normalised = normalizeRole(userRole);
  return allowedRoles.includes(normalised);
};
