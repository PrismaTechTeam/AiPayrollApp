import axiosInstance from '../axiosInstance';
import { ENDPOINTS } from '../endpoints';

export interface ClockRequest {
  punchType: 'IN' | 'OUT' | 'BREAK_OUT' | 'BREAK_IN';
  latitude: number;
  longitude: number;
  accuracy: number;
  biometricVerified: boolean;
  isMockLocation?: boolean;
}

export interface ClockResponse {
  id: string;
  punchTime: string;
  punchType: string;
  status: string;
}

export interface TodayAttendance {
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  breakOut: string | null;
  breakIn: string | null;
  totalWorkHours: number | null;
  status: string;
  punches: Array<{
    id: string;
    punchTime: string;
    punchType: string;
    sourceType: string;
  }>;
}

export interface AttendanceRecord {
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  totalWorkHours: number | null;
  status: string;
  isLate: boolean;
  isEarlyOut: boolean;
}

export interface AttendanceSummary {
  month: string;
  totalWorkDays: number;
  present: number;
  absent: number;
  late: number;
  earlyOut: number;
  onLeave: number;
  totalWorkHours: number;
}

const attendanceService = {
  async clock(data: ClockRequest): Promise<ClockResponse> {
    const response = await axiosInstance.post(ENDPOINTS.ATTENDANCE.CLOCK, data);
    return response.data.content;
  },

  async getToday(): Promise<TodayAttendance> {
    const response = await axiosInstance.get(ENDPOINTS.ATTENDANCE.TODAY);
    return response.data.content;
  },

  async getHistory(params: { month: string; page?: number; pageSize?: number }): Promise<{ items: AttendanceRecord[]; totalCount: number }> {
    const response = await axiosInstance.get(ENDPOINTS.ATTENDANCE.HISTORY, { params });
    return response.data.content;
  },

  async getSummary(month: string): Promise<AttendanceSummary> {
    const response = await axiosInstance.get(ENDPOINTS.ATTENDANCE.SUMMARY, { params: { month } });
    return response.data.content;
  },

  async getTeamToday(): Promise<TeamTodayResponse> {
    const response = await axiosInstance.get(ENDPOINTS.ATTENDANCE.TEAM_TODAY);
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
