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

/** One day of history, as GET /mobile/attendance/history returns it. */
export interface AttendanceRecord {
  workDate: string;
  firstPunchIn: string | null;
  lastPunchOut: string | null;
  roundedPunchIn: string | null;
  roundedPunchOut: string | null;
  workedMinutes: number;
  breakMinutes: number;
  otMinutes: number;
  lateMinutes: number;
  earlyOutMinutes: number;
  dayType: string;
  status: string;
  hasException: boolean;
  exceptionNotes: string | null;
}

/** GET /mobile/attendance/summary. Minutes, not hours — the server counts in minutes. */
export interface AttendanceSummary {
  year: number;
  month: number;
  totalDays: number;
  workingDays: number;
  restDays: number;
  holidays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  lateDays: number;
  earlyOutDays: number;
  totalWorkedMinutes: number;
  totalOtMinutes: number;
  totalLateMinutes: number;
  totalEarlyOutMinutes: number;
  exceptionDays: number;
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

  /** Month is 1-12 and year is four digits — the server takes two integers, not "2026-09". */
  async getHistory(params: { month: number; year: number; page?: number; pageSize?: number }): Promise<{ items: AttendanceRecord[]; total: number }> {
    const response = await axiosInstance.get(ENDPOINTS.ATTENDANCE.HISTORY, { params });
    const content = response.data?.content;
    return {
      items: Array.isArray(content?.items) ? content.items : [],
      total: typeof content?.total === 'number' ? content.total : 0,
    };
  },

  async getSummary(month: number, year: number): Promise<AttendanceSummary> {
    const response = await axiosInstance.get(ENDPOINTS.ATTENDANCE.SUMMARY, { params: { month, year } });
    return response.data.content;
  },

  async getTeamToday(): Promise<TeamTodayResponse> {
    const response = await axiosInstance.get(ENDPOINTS.ATTENDANCE.TEAM_TODAY);
    return response.data.content;
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
};

export interface TeamMemberAttendance {
  employeeId: string;
  employeeName: string;
  position: string | null;
  department: string | null;
  status: 'checked-in' | 'not-checked-in';
  checkInTime: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface TeamTodayResponse {
  date: string;
  totalEmployees: number;
  checkedIn: number;
  notCheckedIn: number;
  employees: TeamMemberAttendance[];
}

export default attendanceService;
