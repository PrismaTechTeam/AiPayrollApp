import axiosInstance from '../axiosInstance';
import { ENDPOINTS } from '../endpoints';

export interface LeaveType {
  id: string;
  code: string;
  description: string;
  caption: string;
  allowHalfDay: boolean;
  allowHourly: boolean;
  isActive: boolean;
  color: string | null;
  requireAttachment: boolean;
  attachmentAfterDays: number | null;
  /**
   * Whether the type carries a yearly allowance at all.
   *
   * The server gates every balance check on `IsEntitle && !IsUnpaid`, so these two
   * decide whether a type shows a remaining number or "no entitlement limit". The
   * old mapper dropped both, which is why the apply form could not tell an unpaid
   * leave from one the employee had simply exhausted.
   */
  isEntitle: boolean;
  isUnpaid: boolean;
  /** Smallest request the type accepts. 0.5 lets a half day through; 1 does not. */
  minDays: number;
  maxDays: number | null;
  /** A separate ceiling from maxDays: how long one unbroken stretch may run. */
  maxConsecutiveDays: number | null;
  /** 'M', 'F', or null for everyone. */
  genderRestriction: string | null;
  /** Months on the payroll before the type may be taken at all. */
  minServiceMonths: number;
  /**
   * Whether holidays and weekends inside the range are charged to the employee.
   * The form does not compute the day count from these -- the server's answer is
   * asked for instead -- but they decide whether a half day may sit on a Saturday.
   */
  countPublicHoliday: boolean;
  countWeekend: boolean;
  carryForwardExpiryMonths: number;
  sortOrder: number;
}

export interface LeaveApprovalStep {
  id: string;
  applicationId: string;
  stepOrder: number;
  stepName: string;
  approverId: string | null;
  approverRoleId: string | null;
  /** Set on a department step: any approver of this department can decide it. */
  approverDepartmentId?: string | null;
  /** Every approver's name until someone decides the step, then the one who did. */
  approverName: string | null;
  status: string;
  approvedAt: string | null;
  comments: string | null;
}

export interface LeaveApplication {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  employeeDepartment: string | null;
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeDescription: string;
  leaveTypeColor: string | null;
  startDate: string;
  endDate: string;
  isHalfDayStart: boolean;
  isHalfDayEnd: boolean;
  startDayPeriod: string | null;
  endDayPeriod: string | null;
  totalDays: number;
  totalHours: number | null;
  status: string;
  reason: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  attachmentPath: string | null;
  attachmentFileName: string | null;
  submittedFrom: string;
  currentApprovalStep: number;
  totalApprovalSteps: number;
  approvedAt: string | null;
  approvedByEmployeeName: string | null;
  approvals: LeaveApprovalStep[];
  createdAt: string;
}

/**
 * One leave type on the employee's own entitlement page.
 *
 * The day counts are nullable because "no entitlement limit" is a real answer,
 * not a zero. Unpaid leave has no allowance to count down from, and neither does
 * a type HR never issued a row for — both arrive with nulls and must be shown as
 * a dash, never as "0 days remaining".
 */
export interface MyLeaveEntitlement {
  leaveTypeId: string;
  code: string;
  description: string;
  color: string | null;
  isEntitle: boolean;
  isUnpaid: boolean;
  isActive: boolean;
  hasEntitlement: boolean;
  entitledDays: number | null;
  carryForwardDays: number | null;
  remainingDays: number | null;
  /** Days already approved. Always a number, entitlement row or not. */
  usedDays: number;
  pendingDays: number;
  /**
   * What can actually be booked right now: remaining minus the days already
   * sitting in someone's approval queue.
   *
   * This is the number the server refuses against, so it is the number every
   * screen leads with. Leading with `remainingDays` produces the most common
   * leave support call there is — "it says 14 days left, why was 14 refused?" —
   * because days awaiting an answer cannot be spent twice. Null when there is
   * no entitlement row to count down from, and null must never be printed as 0.
   */
  availableDays: number | null;
}

export interface MyLeaveEntitlements {
  year: number;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  items: MyLeaveEntitlement[];
}

export interface CreateLeaveRequest {
  leaveTypeId: string;
  /** Plain YYYY-MM-DD. Never an ISO timestamp: a zone shift moves the day. */
  startDate: string;
  endDate: string;
  isHalfDayStart: boolean;
  isHalfDayEnd: boolean;
  /** 'AM' | 'PM' — which half is taken. Only meaningful with the matching half-day flag. */
  startDayPeriod?: string;
  endDayPeriod?: string;
  /** HH:mm, for leave types that allow it to be taken by the hour. */
  startTime?: string;
  endTime?: string;
  reason: string;
  isDraft?: boolean;
}

/** What the picker produced, in the shape React Native's FormData needs. */
export interface UploadableLeaveFile {
  uri: string;
  name: string;
  mimeType: string;
}

/**
 * One reason the server would refuse the application, addressed to a control on
 * the form. `field` is what makes the message land under the date row rather
 * than in a box after a round trip; `code` lets the screen key off the rule
 * rather than parse English.
 */
export interface LeaveRuleIssue {
  field: 'leaveType' | 'dates' | 'startDate' | 'endDate' | 'halfDay' | 'time' | 'attachment' | 'balance' | string;
  code: string;
  message: string;
}

/**
 * The server's own verdict on a leave that has not been submitted yet.
 *
 * The day count cannot be worked out on the phone: it comes from the employee's
 * shift roster and the tenant's public holiday calendar, and neither is here.
 * The old form guessed at end-minus-start and was corrected after submitting.
 */
export interface LeavePreview {
  totalDays: number;
  totalHours: number | null;
  /** Dates inside the range that were not charged, 'yyyy-MM-dd: name'. */
  excludedHolidays: string[];
  /** Whether a file must accompany THIS request, its length taken into account. */
  requiresAttachment: boolean;
  /** The type carries a yearly allowance at all. */
  isEntitled: boolean;
  /** An entitlement row exists for this year. False with isEntitled true means "not set up". */
  hasEntitlement: boolean;
  /** Allowance left, as My Leaves shows it. Null when there is no limit. */
  remainingDays: number | null;
  /** Remaining minus days already awaiting approval. Null when there is no limit. */
  availableDays: number | null;
  /** Everything wrong with it, at once. Empty means it would be accepted. */
  issues: LeaveRuleIssue[];
}

export interface PreviewLeaveRequest {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  isHalfDayStart: boolean;
  isHalfDayEnd: boolean;
  startDayPeriod?: string;
  endDayPeriod?: string;
  startTime?: string;
  endTime?: string;
  hasAttachment: boolean;
}

/** Whether the employee approves leave for a department, and which. */
export interface DepartmentApproverStatus {
  isDepartmentApprover: boolean;
  departmentIds: string[];
}

const leaveService = {
  async getLeaveTypes(): Promise<LeaveType[]> {
    const response = await axiosInstance.get(ENDPOINTS.LEAVE.TYPES);
    const content = response.data?.content ?? response.data;
    const list = Array.isArray(content) ? content : [];
    // Both casings are accepted because the two endpoints behind this have differed
    // before; the server sends camelCase today. Everything the DTO carries is passed
    // through -- the previous version hardcoded allowHourly, isActive, requireAttachment
    // and attachmentAfterDays, so an attachment-required leave type looked optional and
    // an inactive one still appeared in the picker.
    const pick = <T,>(row: Record<string, unknown>, key: string, fallback: T): T => {
      const upper = key.charAt(0).toUpperCase() + key.slice(1);
      const value = row[key] ?? row[upper];
      return (value ?? fallback) as T;
    };

    return list.map((row: Record<string, unknown>) => ({
      id: pick(row, 'id', ''),
      code: pick(row, 'code', ''),
      description: pick(row, 'description', ''),
      caption: pick(row, 'caption', pick(row, 'description', '')),
      allowHalfDay: pick(row, 'allowHalfDay', true),
      allowHourly: pick(row, 'allowHourly', false),
      isActive: pick(row, 'isActive', true),
      color: pick<string | null>(row, 'color', null),
      requireAttachment: pick(row, 'requireAttachment', false),
      attachmentAfterDays: pick<number | null>(row, 'attachmentAfterDays', null),
      isEntitle: pick(row, 'isEntitle', false),
      isUnpaid: pick(row, 'isUnpaid', false),
      // The rules the apply form has to respect. Defaults match the server's own
      // column defaults, so a type saved before a column existed behaves as the
      // server would treat it rather than as unrestricted.
      minDays: pick(row, 'minDays', 0.5),
      maxDays: pick<number | null>(row, 'maxDays', null),
      maxConsecutiveDays: pick<number | null>(row, 'maxConsecutiveDays', null),
      genderRestriction: pick<string | null>(row, 'genderRestriction', null),
      minServiceMonths: pick(row, 'minServiceMonths', 0),
      countPublicHoliday: pick(row, 'countPublicHoliday', false),
      countWeekend: pick(row, 'countWeekend', false),
      carryForwardExpiryMonths: pick(row, 'carryForwardExpiryMonths', 3),
      sortOrder: pick(row, 'sortOrder', 0),
    }));
  },

  /**
   * The caller's own entitlements for one year.
   *
   * The only source of a remaining number anywhere in the app. The retired
   * /leave/balance read EmployeeLeaveBalances, which the entitlement engine
   * never writes and which only ever held types that already had a balance row
   * -- so a type the employee is not entitled to simply vanished from the list
   * instead of saying "no entitlement limit". This returns every type they
   * could take and says which of them have a limit.
   */
  async getMyEntitlements(year: number): Promise<MyLeaveEntitlements> {
    const response = await axiosInstance.get(ENDPOINTS.LEAVE.MY_ENTITLEMENTS, { params: { year } });
    const content = response.data?.content;
    const raw: unknown[] = Array.isArray(content?.items) ? content.items : [];

    return {
      year: content?.year ?? year,
      employeeId: content?.employeeId ?? '',
      employeeCode: content?.employeeCode ?? '',
      employeeName: content?.employeeName ?? '',
      items: raw.map((entry) => {
        const row = entry as Record<string, unknown>;
        // Same two-casing read as getLeaveTypes: the server sends camelCase today,
        // but the endpoints behind these lists have differed before and a PascalCase
        // payload must not silently blank the whole row.
        const pick = <T,>(key: string, fallback: T): T => {
          const upper = key.charAt(0).toUpperCase() + key.slice(1);
          const value = row[key] ?? row[upper];
          return (value ?? fallback) as T;
        };
        // A missing count and a count of zero mean opposite things here, so
        // undefined has to survive as null rather than collapse to 0.
        const orNull = (key: string): number | null => {
          const value = pick<number | null>(key, null);
          return typeof value === 'number' ? value : null;
        };

        return {
          leaveTypeId: pick('leaveTypeId', ''),
          code: pick('code', ''),
          description: pick<string>('description', '') || pick<string>('code', '') || 'Leave',
          color: pick<string | null>('color', null),
          // Read as unknown and compared, not cast: a server that ever answers
          // "true" or 1 must not turn a boolean field into a truthy string.
          isEntitle: pick<unknown>('isEntitle', false) === true,
          isUnpaid: pick<unknown>('isUnpaid', false) === true,
          isActive: pick<unknown>('isActive', true) !== false,
          hasEntitlement: pick<unknown>('hasEntitlement', false) === true,
          entitledDays: orNull('entitledDays'),
          carryForwardDays: orNull('carryForwardDays'),
          remainingDays: orNull('remainingDays'),
          usedDays: pick('usedDays', 0),
          pendingDays: pick('pendingDays', 0),
          // Null here is "no entitlement to count down from", which reads as
          // "not set up" on screen — never as zero days available.
          availableDays: orNull('availableDays'),
        };
      }),
    };
  },

  async getApplications(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    year?: number;
    leaveTypeId?: string;
  }): Promise<{ items: LeaveApplication[]; total: number }> {
    const response = await axiosInstance.get(ENDPOINTS.LEAVE.APPLICATIONS, { params });
    const content = response.data?.content;
    return {
      items: Array.isArray(content?.items) ? content.items : [],
      total: content?.total ?? 0,
    };
  },

  async getApplicationById(id: string): Promise<LeaveApplication> {
    const response = await axiosInstance.get(`${ENDPOINTS.LEAVE.APPLICATIONS}/${id}`);
    return response.data.content;
  },

  async createApplication(data: CreateLeaveRequest): Promise<LeaveApplication> {
    const response = await axiosInstance.post(ENDPOINTS.LEAVE.APPLICATIONS, data);
    return response.data.content;
  },

  /**
   * The leave and the file that supports it, in one call.
   *
   * Not create-then-upload the way requests do it: a leave type can REQUIRE the
   * file, so creating first is refused for the missing attachment, and creating
   * as a draft first leaves a half-made application behind whenever the upload
   * then fails. The server stores the file, creates the leave, and deletes the
   * file again if the leave is refused.
   */
  async createApplicationWithAttachment(
    data: CreateLeaveRequest,
    file: UploadableLeaveFile,
  ): Promise<LeaveApplication> {
    const form = new FormData();
    form.append('LeaveTypeId', data.leaveTypeId);
    form.append('StartDate', data.startDate);
    form.append('EndDate', data.endDate);
    form.append('IsHalfDayStart', String(data.isHalfDayStart));
    form.append('IsHalfDayEnd', String(data.isHalfDayEnd));
    if (data.startDayPeriod) form.append('StartDayPeriod', data.startDayPeriod);
    if (data.endDayPeriod) form.append('EndDayPeriod', data.endDayPeriod);
    if (data.startTime) form.append('StartTime', data.startTime);
    if (data.endTime) form.append('EndTime', data.endTime);
    if (data.reason) form.append('Reason', data.reason);
    form.append('IsDraft', String(data.isDraft ?? false));
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);

    // A photographed certificate on a slow connection outlives the default timeout.
    const response = await axiosInstance.post(ENDPOINTS.LEAVE.WITH_ATTACHMENT, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return response.data.content;
  },

  /**
   * What the server would make of this leave if it were submitted now.
   * Called as the form is filled in so the day count on screen is the one that
   * will be recorded, and so a rule is refused under its own field rather than
   * in a box after the round trip.
   */
  async previewApplication(data: PreviewLeaveRequest): Promise<LeavePreview> {
    const response = await axiosInstance.post(ENDPOINTS.LEAVE.PREVIEW, data);
    const content = response.data?.content ?? {};
    return {
      totalDays: typeof content.totalDays === 'number' ? content.totalDays : 0,
      totalHours: typeof content.totalHours === 'number' ? content.totalHours : null,
      excludedHolidays: Array.isArray(content.excludedHolidays) ? content.excludedHolidays : [],
      requiresAttachment: content.requiresAttachment === true,
      isEntitled: content.isEntitled === true,
      hasEntitlement: content.hasEntitlement === true,
      // A missing number and a zero mean opposite things: null is "no limit".
      remainingDays: typeof content.remainingDays === 'number' ? content.remainingDays : null,
      availableDays: typeof content.availableDays === 'number' ? content.availableDays : null,
      issues: Array.isArray(content.issues) ? content.issues : [],
    };
  },

  /** Attach or replace the file on a leave that is still open. */
  async uploadAttachment(applicationId: string, file: UploadableLeaveFile): Promise<void> {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    await axiosInstance.post(`${ENDPOINTS.LEAVE.APPLICATIONS}/${applicationId}/attachment`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  },

  async deleteAttachment(applicationId: string): Promise<void> {
    await axiosInstance.delete(`${ENDPOINTS.LEAVE.APPLICATIONS}/${applicationId}/attachment`);
  },

  /** Server path of the file's bytes, for the download helper. */
  attachmentContentUrl(applicationId: string): string {
    return `${ENDPOINTS.LEAVE.APPLICATIONS}/${applicationId}/attachment/content`;
  },

  async withdrawApplication(id: string, reason?: string): Promise<void> {
    await axiosInstance.delete(`${ENDPOINTS.LEAVE.APPLICATIONS}/${id}/withdraw`, {
      data: reason ? { reason } : undefined,
    });
  },

  /**
   * Take back a leave that has already been approved.
   *
   * Not the same act as withdrawing, and deliberately not merged with it:
   * withdraw pulls an application out of an approver's queue before anyone has
   * answered it, cancel undoes a decision that was already made. The server
   * accepts PENDING or APPROVED, refuses one whose period has already ended
   * (those days may have been paid already — HR adjusts them by hand), and
   * restores the balance and the entitlement in one transaction. Ownership is
   * checked server-side, so a leave that is not the caller's own is a 403.
   */
  async cancelApplication(id: string, reason?: string): Promise<void> {
    // An empty object, never no body: the action binds [FromBody] and the server
    // fills in its own default reason when the field is absent.
    await axiosInstance.post(ENDPOINTS.LEAVE.APPLICATION_CANCEL(id), reason ? { reason } : {});
  },

  async getPendingApprovals(params?: { page?: number; pageSize?: number }): Promise<{ items: LeaveApplication[]; total: number }> {
    const response = await axiosInstance.get(ENDPOINTS.LEAVE.PENDING_APPROVALS, { params });
    return response.data.content;
  },

  async getApproverStatus(): Promise<DepartmentApproverStatus> {
    const response = await axiosInstance.get(ENDPOINTS.LEAVE.APPROVER_STATUS);
    const content = response.data?.content;
    return {
      isDepartmentApprover: content?.isDepartmentApprover === true,
      departmentIds: Array.isArray(content?.departmentIds) ? content.departmentIds : [],
    };
  },

  async getApproverLeaves(params?: { page?: number; pageSize?: number; status?: string }): Promise<{ items: LeaveApplication[]; total: number }> {
    const response = await axiosInstance.get(ENDPOINTS.LEAVE.APPROVER_LEAVES, { params });
    return response.data.content;
  },

  /**
   * Get ALL leave applications in the tenant (HR/Owner view).
   * Uses the same web API as the web dashboard: GET /api/Leave/applications
   */
  async getAllLeaveApplications(params?: { page?: number; pageSize?: number; status?: string }): Promise<{ items: LeaveApplication[]; total: number }> {
    const response = await axiosInstance.get(ENDPOINTS.WEB_LEAVE.APPLICATIONS, { params });
    return response.data.content;
  },

  /**
   * Get a leave application by ID using the web API (HR/Owner view).
   * No employee-level access check — just requires LEAVE_APPLICATION.VIEW right.
   */
  async getApplicationByIdAsHR(id: string): Promise<LeaveApplication> {
    const response = await axiosInstance.get(`${ENDPOINTS.WEB_LEAVE.APPLICATION_BY_ID}/${id}`);
    return response.data.content;
  },

  async approveLeave(id: string, comments?: string): Promise<void> {
    await axiosInstance.post(`${ENDPOINTS.LEAVE.APPLICATIONS}/${id}/approve`, { comments });
  },

  async rejectLeave(id: string, reason: string): Promise<void> {
    await axiosInstance.post(`${ENDPOINTS.LEAVE.APPLICATIONS}/${id}/reject`, { reason });
  },
};

export default leaveService;
