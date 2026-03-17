/**
 * Endpoint paths only (no base URL).
 * e.g. '/api/mobile/auth/firebase-login'. Used with config baseUrl.
 * See endpoint.ts for base URL; config.ts for final API_CONFIG.baseUrl.
 */
export const ENDPOINTS = {
  AUTH: {
    FIREBASE_LOGIN: '/api/mobile/auth/firebase-login',
    FIREBASE_SIGNUP: '/api/auth/firebase/signup',
    REFRESH: '/api/mobile/auth/refresh',
    LOGOUT: '/api/mobile/auth/logout',
    SWITCH_TENANT: '/api/mobile/auth/switch-tenant',
    MY_TENANTS: '/api/mobile/auth/my-tenants',
    REGISTER: '/api/mobile/auth/register',
    RESEND_VERIFICATION: '/api/mobile/auth/resend-verification',
    FORGOT_PASSWORD: '/api/auth/firebase/forgot-password',
  },
  ME: {
    EMPLOYEE: '/api/mobile/me/employee',
  },
  COMPANY: {
    SEARCH: '/api/mobile/company/search',
    JOIN_REQUEST: '/api/mobile/company/join-request',
    JOIN_REQUESTS: '/api/mobile/company/join-requests',
    JOIN_VIA_CODE: '/api/mobile/company/join-via-code',
  },
  // Mobile-only leave endpoints (no web permissions like LEAVE_TYPE.VIEW; uses JWT + tenant + employee/manager)
  LEAVE: {
    TYPES: '/api/mobile/leave/types',
    BALANCE: '/api/mobile/leave/balance',
    APPLICATIONS: '/api/mobile/leave/applications',
    PENDING_APPROVALS: '/api/mobile/leave/pending-approvals',
  },
  ATTENDANCE: {
    CLOCK: '/api/mobile/attendance/clock',
    TODAY: '/api/mobile/attendance/today',
    HISTORY: '/api/mobile/attendance/history',
    SUMMARY: '/api/mobile/attendance/summary',
    TEAM_TODAY: '/api/mobile/attendance/team-today',
  },
  PAYSLIP: {
    LIST: '/api/mobile/payslip/list',
    HTML: '/api/mobile/payslip', // /{payrollRunId}/html
  },
  CLAIM: {
    TYPES: '/api/mobile/claim/types',
    APPLICATIONS: '/api/mobile/claim/applications',
    BALANCE: '/api/mobile/claim/balance',
    PENDING_APPROVALS: '/api/mobile/claim/pending-approvals',
  },
  REQUEST: {
    TYPES: '/api/mobile/request/types',
    APPLICATIONS: '/api/mobile/request/applications',
    PENDING_APPROVALS: '/api/mobile/request/pending-approvals',
  },
  PROFILE: {
    GET: '/api/mobile/profile/profile',
    UPDATE: '/api/mobile/profile/profile',
    CHANGE_PASSWORD: '/api/mobile/profile/change-password',
    DEVICES: '/api/mobile/profile/devices',
    COMPANY_INFO: '/api/mobile/profile/company-info',
  },
  NOTIFICATIONS: {
    REGISTER_TOKEN: '/api/Notifications/register-token',
    UNREGISTER_TOKEN: '/api/Notifications/unregister-token',
    LIST: '/api/mobile/notifications/list',
    LIST_BASE: '/api/mobile/notifications',
    MARK_ALL_READ: '/api/mobile/notifications/mark-all-read',
    CLEAR: '/api/mobile/notifications/clear',
    UNREAD_COUNT: '/api/mobile/notifications/unread-count',
    PREFERENCES: '/api/mobile/notifications/preferences',
  },
  // Web API endpoints (Owner/HR role - same as web dashboard)
  WEB_REQUEST: {
    APPLICATIONS: '/api/employee-requests',
    TYPES: '/api/request-types',
  },
  WEB_CLAIM: {
    APPLICATIONS: '/api/claim-applications',
    TYPES: '/api/Claim',
  },
} as const;
