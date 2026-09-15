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
    // The employee's own year: one row per leave type, entitled or not. Bound to
    // the caller's linked employee server-side, so there is no id to pass.
    // This, not /balance, is where a remaining number comes from: /balance reads
    // EmployeeLeaveBalances, which the entitlement engine never writes.
    MY_ENTITLEMENTS: '/api/mobile/leave/my-entitlements',
    APPLICATIONS: '/api/mobile/leave/applications',
    // What the server would make of a leave before it is submitted: the day count
    // it will compute, and every rule it would refuse it on. The phone cannot work
    // the day count out -- it comes from the shift roster and the holiday calendar.
    PREVIEW: '/api/mobile/leave/applications/preview',
    // The leave and the file that supports it, in one call. Creating first and
    // uploading after cannot work when the leave type requires the file.
    WITH_ATTACHMENT: '/api/mobile/leave/applications/with-attachment',
    // Take back a leave that is PENDING **or APPROVED**, restoring the balance
    // and the entitlement in one server-side transaction. Withdraw is DELETE and
    // PENDING-only, so leave approved in October for a December trip that fell
    // through had no route in the app at all -- the employee phoned HR and
    // somebody adjusted the numbers by hand. Refused once the period has ended.
    APPLICATION_CANCEL: (id: string) => `/api/mobile/leave/applications/${id}/cancel`,
    PENDING_APPROVALS: '/api/mobile/leave/pending-approvals',
    APPROVER_LEAVES: '/api/mobile/leave/approver-leaves',
  },
  ATTENDANCE: {
    CLOCK: '/api/mobile/attendance/clock',
    // Multipart twin of CLOCK, for when a selfie has to go with the punch.
    CLOCK_VERIFIED: '/api/mobile/attendance/clock/verified',
    LOCATIONS: '/api/mobile/attendance/locations',
    TODAY: '/api/mobile/attendance/today',
    HISTORY: '/api/mobile/attendance/history',
    SUMMARY: '/api/mobile/attendance/summary',
    // The employee's own month, in the same detail HR sees in the Work Card grid.
    WORK_CARD: '/api/mobile/attendance/work-card',
    TEAM_TODAY: '/api/mobile/attendance/team-today',
  },
  PAYSLIP: {
    LIST: '/api/mobile/payslip/list',
    // Base for the two per-run reads: /{payrollRunId} for the payslip itself and
    // /{payrollRunId}/html for the printable version of the same object.
    DETAIL: '/api/mobile/payslip',
  },
  CLAIM: {
    TYPES: '/api/mobile/claim/types',
    APPLICATIONS: '/api/mobile/claim/applications',
    BALANCE: '/api/mobile/claim/balance',
    PENDING_APPROVALS: '/api/mobile/claim/pending-approvals',
    // POST /{id}/approve and /{id}/reject sit on the controller root, not under
    // /applications, so the decision calls are built from this rather than APPLICATIONS.
    BASE: '/api/mobile/claim',
  },
  REQUEST: {
    TYPES: '/api/mobile/request/types',
    APPLICATIONS: '/api/mobile/request/applications',
    PENDING_APPROVALS: '/api/mobile/request/pending-approvals',
    // Files on a request. The employee routes are scoped to their own record
    // server-side; a crafted id reaches nothing.
    ATTACHMENTS: '/api/mobile/request/attachments', // /{id}/content, DELETE /{id}
  },
  // The employee's own document checklist. No route here takes an employee id:
  // the server resolves it from the token, so a crafted id reaches nothing.
  COMPLIANCE_DOCUMENTS: {
    CHECKLIST: '/api/mobile/compliance-documents',
    // One integer for the home tile badge, so the employee sees there is
    // something to do without opening the screen.
    SUMMARY: '/api/mobile/compliance-documents/summary',
    // /{documentTypeId}/submit (POST multipart), /{documentId}/content (GET bytes)
    BASE: '/api/mobile/compliance-documents',
    // /{documentTypeId}/template -> a short-lived URL for HR's blank form
    TYPES: '/api/mobile/compliance-documents/types',
  },
  // The employee's own training record. Like the document routes above, no
  // path here takes an employee id -- the server resolves it from the token,
  // because the HR controller that does take one is right-gated and an
  // employee token would only ever get a 403 from it.
  TRAINING: {
    CHECKLIST: '/api/mobile/training/my-checklist',
    SESSIONS: '/api/mobile/training/my-sessions',
    // /sessions/{sessionId}/certificate -> the attendance sheet, if one was filed
    SESSIONS_BASE: '/api/mobile/training/sessions',
  },
  PROFILE: {
    GET: '/api/mobile/profile/profile',
    UPDATE: '/api/mobile/profile/profile',
    CHANGE_PASSWORD: '/api/mobile/profile/change-password',
    DEVICES: '/api/mobile/profile/devices',
    COMPANY_INFO: '/api/mobile/profile/company-info',
  },
  // Web controllers shared with the dashboard: the person's own account, not
  // tied to any company. ValidateUserAccess compares the userId in the request
  // with the JWT, so every call carries the caller's own id.
  USER_PROFILE: {
    GET_AVATAR: '/api/User-Profile/get-avatar',          // GET ?UserId=
    UPLOAD_AVATAR: '/api/User-Profile/upload-avatar',    // POST multipart UserId + Picture
    REMOVE_AVATAR: '/api/User-Profile/remove-avatar',    // DELETE { userId }
    UPDATE_DETAILS: '/api/User-Profile/update-profile-details', // PUT { userId, fullName }
  },
  TWO_FACTOR: {
    STATUS: '/api/Auth/get-2FA-info',   // GET /{userId} -> content: boolean
    ENABLE: '/api/Auth/enable',         // POST { userId } -> { qrCodeUri }
    VERIFY: '/api/Auth/verify',         // POST { userId, code }
    DISABLE: '/api/Auth/disable-2fa',   // POST { userId, code }
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
  // The signed-in person's access rights in the current company (the web app reads the same)
  ACCESS_CONTROL: {
    MY_PERMISSIONS: '/api/AccessControl/user-permissions',
  },
  // Web API endpoints (Owner/HR role - same as web dashboard)
  WEB_LEAVE: {
    APPLICATIONS: '/api/Leave/applications',         // GET (list), POST (create)
    APPLICATION_BY_ID: '/api/Leave/applications',    // GET /{id}, PUT /{id}, DELETE /{id}
    APPROVE: '/api/Leave/applications',              // POST /{id}/approve
    REJECT: '/api/Leave/applications',               // POST /{id}/reject
  },
  WEB_REQUEST: {
    APPLICATIONS: '/api/employee-requests',
    TYPES: '/api/request-types',
  },
  WEB_CLAIM: {
    APPLICATIONS: '/api/claim-applications',
    TYPES: '/api/Claim',
  },
} as const;
