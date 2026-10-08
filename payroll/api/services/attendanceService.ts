import axiosInstance from '../axiosInstance';
import { ENDPOINTS } from '../endpoints';

export type PunchType = 'IN' | 'OUT' | 'BREAK_OUT' | 'BREAK_IN';

export interface ClockRequest {
  punchType: PunchType;
  /** Null when the phone could not get a fix — never 0, which is a real place. */
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  biometricVerified: boolean;
  isMockLocation?: boolean;
}

/** A place the company allows punching from. */
export interface PunchLocation {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
}

/** Where this company takes attendance from. Chosen in Attendance Settings on the web. */
export type PunchSourceMode = 'BOTH' | 'ADMS' | 'MOBILE';

export interface PunchLocationsResponse {
  items: PunchLocation[];
  /** False when the company has drawn no zones — punching is then unrestricted. */
  enforced: boolean;
  /**
   * False when the company records attendance on the office device only. The punch would
   * be refused by the server and would not count towards the day even if it were not, so
   * the screen says so instead of offering a button that cannot work.
   */
  mobileAllowed: boolean;
  punchSourceMode: PunchSourceMode;
}

/** One punch as the work card reports it. */
export interface WorkCardPunch {
  id: string;
  /** ISO with offset, e.g. "2026-09-09T09:01:00+08:00". */
  punchTime: string;
  punchType: string;
  sourceType: string;
  status: string | null;
  deviceName: string | null;
}

/**
 * One day of the work card.
 *
 * Field for field what the HR grid receives. Times come as "HH:mm:ss" with no
 * date (the server sends TimeOnly); `punches[].punchTime` is a full timestamp.
 * Only the fields the phone actually shows are declared -- the server sends
 * more, and adding them here as they are needed beats declaring fields nothing
 * reads.
 */
export interface WorkCardDay {
  date: string;
  dayOfWeek: string;
  shiftCode: string | null;
  timetableCode: string | null;
  firstPunchIn: string | null;
  lastPunchOut: string | null;
  workedHours: number;
  requiredWorkHours: number;
  workedMinutes: number;
  requiredWorkMinutes: number;
  lateMinutes: number;
  earlyOutMinutes: number;
  breakMinutes: number;
  ot15Hours: number;
  ot20Hours: number;
  ot30Hours: number;
  /** WORKING | REST | HOLIDAY | LEAVE | NOT_EMPLOYED */
  dayType: string;
  /** OK | LATE | ABSENT | LEAVE | REST | PH | EXCEPTION | NOT_PROCESSED | ... */
  status: string;
  /** "AL", "MC", "UP", "OTHER" -- null when the day is not leave. */
  leaveType: string | null;
  hasException: boolean;
  exceptionNotes: string | null;
  isAbsent: boolean;
  punches: WorkCardPunch[];
}

export interface WorkCard {
  employeeId: string;
  employeeCode: string | null;
  employeeName: string | null;
  from: string;
  to: string;
  days: WorkCardDay[];
  isFinalized: boolean;
}

/** The photo taken to prove who is punching. */
export interface SelfieUpload {
  uri: string;
  mimeType: string;
}

export interface ClockResponse {
  /** The server names it punchId, not id. */
  punchId: string;
  punchTime: string;
  punchType: string;
  status: string;
  locationName: string | null;
  distanceMeters: number | null;
  /** BIOMETRIC / SELFIE / NONE — what the server recorded as proof of identity. */
  verifiedBy: string;
}

export interface TodayPunch {
  id: string;
  punchTime: string;
  punchType: string;
  sourceType: string;
  status: string | null;
}

/** The processed day, when the engine has already built it. Null until then. */
export interface TodayDailyRecord {
  workDate: string;
  firstPunchIn: string | null;
  lastPunchOut: string | null;
  workedMinutes: number;
  breakMinutes: number;
  otMinutes: number;
  lateMinutes: number;
  earlyOutMinutes: number;
  dayType: string;
  status: string;
}

/**
 * Field for field what GET /mobile/attendance/today answers.
 *
 * The old shape declared clockIn / clockOut / totalWorkHours / status, none of which the
 * server has ever sent — every one of them read `undefined` at runtime. Anything the
 * screen needs comes from `punches` or `dailyRecord`.
 */
export interface TodayAttendance {
  date: string;
  punches: TodayPunch[];
  dailyRecord: TodayDailyRecord | null;
}

// GET /history and /summary had wrappers here that nothing called: My Attendance reads the
// work card, the same record HR sees. Removed rather than left to drift from the server.

/** REQUESTED is waiting for HR; CANCELLED is one the employee withdrew. */
export type PunchRequestStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

/** One "I forgot to punch" request, as GET /mobile/attendance/punch-requests lists it. */
export interface PunchRequest {
  id: string;
  punchType: PunchType;
  /** ISO with offset, e.g. "2026-09-09T09:01:00+08:00". */
  punchTime: string;
  reason: string;
  status: PunchRequestStatus;
  /** HR's note on an approval, or the reason for a rejection. */
  approverNotes: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface CreatePunchRequest {
  /** ISO carrying the phone's own UTC offset, so the server knows which wall-clock time was meant. */
  punchTime: string;
  punchType: PunchType;
  /** Required, at most 500 characters. */
  reason: string;
}

export interface CreatedPunchRequest {
  id: string;
  status: PunchRequestStatus;
}

/**
 * One employee's punch request as HR's queue lists it: the same request plus whose it is.
 * GET /api/attendance/punch-requests, the web's own list, so the phone and the web always
 * show the same queue.
 */
export interface TeamPunchRequest extends PunchRequest {
  employeeId: string;
  employeeCode: string | null;
  employeeName: string;
}

const attendanceService = {
  async clock(data: ClockRequest): Promise<ClockResponse> {
    const response = await axiosInstance.post(ENDPOINTS.ATTENDANCE.CLOCK, data);
    return response.data.content;
  },

  async getToday(): Promise<TodayAttendance> {
    const response = await axiosInstance.get(ENDPOINTS.ATTENDANCE.TODAY);
    const content = response.data?.content;
    return {
      date: content?.date ?? '',
      punches: Array.isArray(content?.punches) ? content.punches : [],
      dailyRecord: content?.dailyRecord ?? null,
    };
  },

  /**
   * Everyone in the company and where they stand today.
   *
   * Normalised here like every other read in this file. Today's server sends no
   * 'checked-out' status, no checkedOut count and no last punch; the reworked one does.
   * Missing counts become 0 and a missing name becomes '', so the screen never has to
   * guard a null (a null name used to crash the avatar's initials).
   */
  async getTeamToday(): Promise<TeamTodayResponse> {
    const response = await axiosInstance.get(ENDPOINTS.ATTENDANCE.TEAM_TODAY);
    const content = response.data?.content ?? {};
    const raw: Partial<TeamMemberAttendance>[] = Array.isArray(content.employees) ? content.employees : [];
    const employees: TeamMemberAttendance[] = raw.map((e) => ({
      employeeId: String(e.employeeId ?? ''),
      employeeName: e.employeeName ?? '',
      employeeCode: e.employeeCode ?? null,
      position: e.position ?? null,
      department: e.department ?? null,
      status: teamStatusOf(e.status),
      checkInTime: e.checkInTime ?? null,
      lastPunchType: e.lastPunchType ?? null,
      lastPunchTime: e.lastPunchTime ?? null,
      latitude: typeof e.latitude === 'number' ? e.latitude : null,
      longitude: typeof e.longitude === 'number' ? e.longitude : null,
      onLeave: e.onLeave === true,
    }));
    const count = (s: TeamMemberStatus) => employees.filter((e) => e.status === s).length;
    return {
      date: content.date ?? '',
      totalEmployees: content.totalEmployees ?? employees.length,
      checkedIn: content.checkedIn ?? count('checked-in'),
      checkedOut: content.checkedOut ?? count('checked-out'),
      notCheckedIn: content.notCheckedIn ?? count('not-checked-in'),
      employees,
    };
  },

  /**
   * The caller's own work card for one month.
   *
   * Month is 1-12. Bound server-side to the caller's linked employee, so there
   * is no employee id to pass and none to tamper with.
   */
  async getMyWorkCard(month: number, year: number): Promise<WorkCard> {
    const response = await axiosInstance.get(ENDPOINTS.ATTENDANCE.WORK_CARD, { params: { month, year } });
    const content = response.data?.content;
    return {
      employeeId: content?.employeeId ?? '',
      employeeCode: content?.employeeCode ?? null,
      employeeName: content?.employeeName ?? null,
      from: content?.from ?? '',
      to: content?.to ?? '',
      days: Array.isArray(content?.days) ? content.days : [],
      isFinalized: content?.isFinalized === true,
    };
  },

  /** The zones this employee may punch from, and whether any exist at all. */
  async getPunchLocations(): Promise<PunchLocationsResponse> {
    const response = await axiosInstance.get(ENDPOINTS.ATTENDANCE.LOCATIONS);
    const content = response.data?.content;
    return {
      items: Array.isArray(content?.items) ? content.items : [],
      enforced: content?.enforced === true,
      // Absent means an API older than the punch-source setting. Read as ALLOWED: a build
      // that locked the button whenever the field were missing would strand every employee
      // the moment the app shipped ahead of the server.
      mobileAllowed: content?.mobileAllowed !== false,
      punchSourceMode: (content?.punchSourceMode as PunchSourceMode) ?? 'BOTH',
    };
  },

  /**
   * A punch carrying a selfie. Multipart, so it goes to the verified route
   * rather than the JSON one.
   */
  async clockWithSelfie(data: ClockRequest, selfie: SelfieUpload): Promise<ClockResponse> {
    const form = new FormData();
    form.append('PunchType', data.punchType);
    if (data.latitude != null) form.append('Latitude', String(data.latitude));
    if (data.longitude != null) form.append('Longitude', String(data.longitude));
    if (data.accuracy != null) form.append('Accuracy', String(data.accuracy));
    form.append('BiometricVerified', String(data.biometricVerified));
    form.append('IsMockLocation', String(data.isMockLocation ?? false));

    const name = selfie.mimeType.includes('png') ? 'punch.png' : 'punch.jpg';
    form.append('selfie', { uri: selfie.uri, name, type: selfie.mimeType } as unknown as Blob);

    const response = await axiosInstance.post(ENDPOINTS.ATTENDANCE.CLOCK_VERIFIED, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return response.data.content;
  },

  /** The caller's own punch requests, newest first. Bound to the caller server-side. */
  async getPunchRequests(): Promise<PunchRequest[]> {
    const response = await axiosInstance.get(ENDPOINTS.ATTENDANCE.PUNCH_REQUESTS);
    const content = response.data?.content;
    return Array.isArray(content) ? content : [];
  },

  /**
   * Ask HR to add a punch that never happened on the device.
   *
   * The server refuses (400/409, with a message written for the person) a time in
   * the future, one older than 60 days, one in a finalised month, a duplicate,
   * and a reason that is missing or too long.
   */
  async createPunchRequest(data: CreatePunchRequest): Promise<CreatedPunchRequest> {
    const response = await axiosInstance.post(ENDPOINTS.ATTENDANCE.PUNCH_REQUESTS, data);
    const content = response.data?.content;
    return { id: content?.id ?? '', status: (content?.status as PunchRequestStatus) ?? 'REQUESTED' };
  },

  /** Withdraw a request still waiting for HR. Refused with a 400 once HR has decided it. */
  async cancelPunchRequest(id: string): Promise<void> {
    await axiosInstance.delete(ENDPOINTS.ATTENDANCE.PUNCH_REQUEST(id));
  },

  /**
   * Every employee's punch requests in one state, newest first (the server caps it at 500).
   * Omit the status for the ones still waiting. Needs ATTENDANCE_WORK_CARD.VIEW.
   */
  async getTeamPunchRequests(status?: 'APPROVED' | 'REJECTED'): Promise<TeamPunchRequest[]> {
    const response = await axiosInstance.get(ENDPOINTS.ATTENDANCE.TEAM_PUNCH_REQUESTS, { params: status ? { status } : undefined });
    // A bare array today; read a wrapped one too, should the controller ever gain ResponseDTO.
    const data = response.data;
    const rows: Partial<TeamPunchRequest>[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.content)
        ? data.content
        : [];
    return rows.map((r) => ({
      id: String(r.id ?? ''),
      employeeId: String(r.employeeId ?? ''),
      employeeCode: r.employeeCode ?? null,
      employeeName: r.employeeName ?? '',
      punchType: (String(r.punchType ?? 'IN').toUpperCase() as PunchType),
      punchTime: r.punchTime ?? '',
      reason: r.reason ?? '',
      status: (String(r.status ?? 'REQUESTED').toUpperCase() as PunchRequestStatus),
      approverNotes: r.approverNotes ?? null,
      decidedAt: r.decidedAt ?? null,
      createdAt: r.createdAt ?? '',
    }));
  },

  /** Adds the punch to the employee's work card and reprocesses the day. Needs ATTENDANCE_WORK_CARD.EDIT. */
  async approveTeamPunchRequest(id: string, notes?: string): Promise<void> {
    await axiosInstance.post(ENDPOINTS.ATTENDANCE.PUNCH_ADJUST_APPROVE(id), { notes: notes ?? null });
  },

  /** The reason is shown to the employee on their request. Needs ATTENDANCE_WORK_CARD.EDIT. */
  async rejectTeamPunchRequest(id: string, reason: string): Promise<void> {
    await axiosInstance.post(ENDPOINTS.ATTENDANCE.PUNCH_ADJUST_REJECT(id), { reason });
  },
};

/**
 * Where someone stands today. 'checked-out' (the last IN/OUT was an OUT) only comes from
 * the reworked server; today's server calls everyone who clocked in 'checked-in'.
 */
export type TeamMemberStatus = 'checked-in' | 'checked-out' | 'not-checked-in';

function teamStatusOf(raw: unknown): TeamMemberStatus {
  const s = String(raw ?? '').toLowerCase();
  return s === 'checked-in' || s === 'checked-out' ? s : 'not-checked-in';
}

export interface TeamMemberAttendance {
  employeeId: string;
  employeeName: string;
  /** Not sent by today's server; shown beside the name when it arrives. */
  employeeCode?: string | null;
  position: string | null;
  department: string | null;
  status: TeamMemberStatus;
  checkInTime: string | null;
  /** The latest IN or OUT, so a 'checked-out' row can say when they left. Reworked server only. */
  lastPunchType?: string | null;
  lastPunchTime?: string | null;
  latitude: number | null;
  longitude: number | null;
  /** On approved leave today. No server sends it yet; until one does it is always false. */
  onLeave?: boolean;
}

export interface TeamTodayResponse {
  date: string;
  totalEmployees: number;
  checkedIn: number;
  /** 0 from today's server, which has no such state. */
  checkedOut: number;
  notCheckedIn: number;
  employees: TeamMemberAttendance[];
}

export default attendanceService;
