/**
 * Payroll User Role Constants
 * 2-role system: Employee and Manager
 */

export const USER_ROLES = {
  EMPLOYEE: 'Employee',
  MANAGER: 'Manager',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// Helper functions for role checks
export const isEmployee = (role: string): boolean => role === USER_ROLES.EMPLOYEE;
export const isManager = (role: string): boolean => role === USER_ROLES.MANAGER;

// Role groups for feature access
export const ROLE_GROUPS: Record<string, string[]> = {
  // Manager-only features
  MANAGER_ONLY: [USER_ROLES.MANAGER],
  
  // Employee-only features (if any)
  EMPLOYEE_ONLY: [USER_ROLES.EMPLOYEE],
  
  // Features available to all
  ALL_USERS: [USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER],
  
  // Feature-specific permissions
  CAN_APPROVE_REQUESTS: [USER_ROLES.MANAGER],
  CAN_APPROVE_LEAVES: [USER_ROLES.MANAGER],
  CAN_APPROVE_PAYSLIPS: [USER_ROLES.MANAGER],
  CAN_VIEW_ALL_ATTENDANCE: [USER_ROLES.MANAGER],
  
  // Employee permissions
  CAN_SUBMIT_REQUESTS: [USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER],
  CAN_VIEW_OWN_PAYSLIPS: [USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER],
  CAN_VIEW_OWN_ATTENDANCE: [USER_ROLES.EMPLOYEE, USER_ROLES.MANAGER],
};

// Helper function to check if user has access
export const hasRoleAccess = (
  userRole: string | undefined,
  allowedRoles: string[]
): boolean => {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
};
