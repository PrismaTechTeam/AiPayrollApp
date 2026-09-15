/**
 * Every route in the app, and what it expects to be handed.
 *
 * Before this existed the navigator was untyped, so every call site that passed
 * params had to launder both arguments through `as never` to get past the
 * compiler. That silenced real mistakes: a route name that no longer existed
 * looked exactly like one that did, and three screens sat registered but
 * unreachable for months without a single error. Naming the routes here makes a
 * wrong name a build failure and a missing param a red squiggle.
 *
 * Adding a screen means adding a line here. That is the point -- the list is the
 * one place you can read the whole app's shape.
 */

export type RootStackParamList = {
  // ── Auth ────────────────────────────────────────────────────────────
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  EmailVerification: { email?: string } | undefined;

  // ── Tenant picker and joining ───────────────────────────────────────
  UserHome: undefined;
  /** Kept as a separate name from UserHome: both are entry points and old links use it. */
  TenantHub: undefined;
  JoinTenant: undefined;
  MyJoinRequests: undefined;
  JoinRequestPending: { requestId?: string; companyId: string; companyName: string };

  // ── Shell ───────────────────────────────────────────────────────────
  PayrollHome: undefined;
  Search: undefined;
  Activity: undefined;
  Notifications: undefined;

  // ── Requests ────────────────────────────────────────────────────────
  MyRequests: undefined;
  Requests: undefined;
  RequestDetails: { requestId: string; canApprove?: boolean };
  CreateRequest: undefined;
  RequestTypes: undefined;

  // ── Leave ───────────────────────────────────────────────────────────
  MyLeaves: undefined;
  Leaves: undefined;
  LeaveDetails: { leaveId?: string; leave?: unknown; canApprove?: boolean };
  /** A type may be pre-chosen when the apply form is opened from that type's own page. */
  CreateLeave: { leaveTypeId?: string } | undefined;
  LeaveHistory: { year?: number } | undefined;
  LeaveType: { leaveTypeId: string; code?: string; description?: string; year?: number };

  // ── Attendance ──────────────────────────────────────────────────────
  Attendance: undefined;
  AttendanceCheckIn: undefined;
  AttendanceDetails: { attendance: unknown };

  // ── Claims ──────────────────────────────────────────────────────────
  Claims: undefined;
  ClaimsApproval: undefined;
  ClaimDetails: { claimId?: string; claim?: unknown; canApprove?: boolean };
  /** Doubles as the edit form: passing claimId loads that claim instead of a blank one. */
  CreateClaim: { claimId?: string } | undefined;
  ClaimTypes: undefined;

  // ── Payslip ─────────────────────────────────────────────────────────
  MyPayslip: undefined;
  PayslipDetails: { payrollRunId: string; payslip?: unknown };

  // ── Documents ───────────────────────────────────────────────────────
  MyDocuments: undefined;

  // ── Training ────────────────────────────────────────────────────────
  MyTraining: undefined;

  // ── Employees ───────────────────────────────────────────────────────
  EmployeeList: undefined;
  EmployeeMap: { employees?: unknown; employee?: unknown } | undefined;

  // ── Account (the current settings tree) ─────────────────────────────
  AccountSettings: undefined;
  AccountProfile: undefined;
  AccountPassword: undefined;
  AccountTwoFactor: undefined;
  AccountDevices: undefined;

  // ── Support and legal ───────────────────────────────────────────────
  // What is left of the original settings tree. The rest -- Profile,
  // EditProfile, ChangePassword, Settings -- was deleted: every one of them
  // duplicated an Account* page. Theme and Language went with them because the
  // choice they saved was read by almost nothing, so the switch was a promise
  // the app did not keep.
  Help: undefined;
  About: undefined;
  PrivacyPolicy: undefined;
};

/**
 * `navigation.navigate` typed for this stack, for the many components that take
 * navigation loosely rather than through a screen prop.
 */
export type AppNavigation = {
  navigate: <T extends keyof RootStackParamList>(
    ...args: RootStackParamList[T] extends undefined
      ? [screen: T] | [screen: T, params: undefined]
      : [screen: T, params: RootStackParamList[T]]
  ) => void;
  goBack: () => void;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // Makes useNavigation() default to this stack everywhere, so a screen that
    // does not take a navigation prop still gets checked route names.
    interface RootParamList extends RootStackParamList {}
  }
}
